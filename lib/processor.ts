// Background job processor — orchestrates the transcribe → analyze → clip
// pipeline. Runs asynchronously (fire-and-forget) and reports progress back
// into the in-memory job queue.

import path from 'path';
import {
  setStatus,
  setError,
  setClips,
  updateClip,
  transcriptDir,
  clipDir,
  getJob,
} from './jobQueue';
import { transcribe, saveTranscript } from './whisper';
import { detectClips } from './claude';
import { ensureFfmpeg, generateThumbnail, getDuration } from './ffmpeg';
import { generateFinalClip } from './ffmpegLayers';

export async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  try {
    await ensureFfmpeg();

    // Probe duration if we don't already have it.
    if (!job.duration) {
      const dur = await getDuration(job.inputPath);
      if (dur) job.duration = dur;
    }

    // --- Step 1: Transcribe ------------------------------------------------
    setStatus(jobId, 'transcribing', 'Transcribing audio with Whisper…', 10);
    const tDir = transcriptDir(jobId);
    const segments = await transcribe(
      job.inputPath,
      tDir,
      process.env.WHISPER_MODEL || 'base',
      () => setStatus(jobId, 'transcribing', 'Transcribing audio with Whisper…')
    );
    await saveTranscript(tDir, segments);
    setStatus(jobId, 'transcribing', `Transcribed ${segments.length} segments`, 35);

    // --- Step 2: AI clip detection ----------------------------------------
    setStatus(jobId, 'analyzing', 'Finding viral moments with Claude…', 45);
    const { clips, usedFallback } = await detectClips(segments);
    setClips(jobId, clips);
    await saveClipsJson(jobId, clips);
    setStatus(
      jobId,
      'analyzing',
      usedFallback
        ? `Detected ${clips.length} clips (fallback chunking)`
        : `Detected ${clips.length} viral clips`,
      55
    );

    // --- Step 3: Generate clips -------------------------------------------
    setStatus(jobId, 'clipping', 'Rendering clips with FFmpeg…', 60);
    const subtitleStyle = 'yellow';
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const outDir = clipDir(jobId, clip.id);

      // Thumbnail from the middle of the clip.
      try {
        await generateThumbnail(
          job.inputPath,
          path.join(outDir, 'thumb.jpg'),
          clip.start + clip.duration / 2
        );
      } catch (err) {
        console.error('Thumbnail generation failed:', err);
      }

      // Final processed clip (V11) for preview/download.
      await generateFinalClip(job.inputPath, clip, outDir, subtitleStyle);
      updateClip(jobId, clip.id, { ready: true });

      const progress = 60 + Math.round(((i + 1) / clips.length) * 38);
      setStatus(
        jobId,
        'clipping',
        `Rendered clip ${i + 1} of ${clips.length}`,
        progress
      );
    }

    setStatus(jobId, 'done', `Done — ${clips.length} clips ready`, 100);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Job ${jobId} failed:`, err);
    setError(jobId, message);
  }
}

async function saveClipsJson(jobId: string, clips: unknown): Promise<void> {
  const fs = await import('fs/promises');
  const { jobDir } = await import('./jobQueue');
  const dir = jobDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'clips.json'),
    JSON.stringify(clips, null, 2),
    'utf-8'
  );
}
