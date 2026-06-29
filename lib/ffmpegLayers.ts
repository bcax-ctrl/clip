// Layer-by-layer FFmpeg processing — mirrors an 11-track Premiere timeline.
//
// Each function produces a cumulative output file: V1 is the raw cut, and every
// subsequent layer adds one more filter on top of the previous stack, ending
// with V11 (the final export with burned-in subtitles).

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import type { Clip, ClipLayers } from './types';
import { writeAssSubtitles, SubtitleStyle } from './ffmpeg';

// Scale source into a 9:16 1080x1920 frame with letterbox padding.
const SCALE_PAD =
  'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black';

// Cumulative filter fragments (each builds on those above it).
const VIGNETTE_BOTTOM = 'vignette=PI/6:mode=backward';
const VIGNETTE_FULL = 'vignette=PI/4';
const LIGHT_LEAK = 'colorbalance=rs=0.1:gs=0.05:bs=-0.1:rm=0.05:gm=0:bm=-0.05';
const FILM_DUST = 'noise=alls=4:allf=t+u';
const GRAIN = 'noise=alls=12:allf=t';
const GRADE_1 = 'eq=contrast=1.15:brightness=0.04:saturation=1.4:gamma=0.95';
const GRADE_2 =
  "curves=r='0/0 0.5/0.52 1/1':g='0/0 0.5/0.5 1/1':b='0/0.05 0.5/0.48 1/0.95'";

export interface LayerProgress {
  (layer: string, index: number, total: number): void;
}

/** Run a single FFmpeg pass producing one output file. */
function runPass(
  inputPath: string,
  start: number,
  duration: number,
  vf: string | null,
  outPath: string,
  copy = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .seekInput(Math.max(0, start))
      .duration(duration);

    if (copy) {
      cmd.outputOptions(['-c', 'copy']);
    } else {
      if (vf) cmd.videoFilters(vf);
      cmd.outputOptions([
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
      ]);
    }

    cmd
      .output(outPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/** Escape a filesystem path for use inside an FFmpeg filtergraph value. */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

/**
 * Generate all 11 cumulative layer outputs for a clip.
 *
 * Returns a {@link ClipLayers} map of layer-key → absolute file path. Files are
 * named `clip_v{n}_{label}.mp4` inside `outDir`.
 */
export async function generateLayers(
  inputPath: string,
  clip: Clip,
  outDir: string,
  options: { subtitleStyle?: SubtitleStyle; onProgress?: LayerProgress } = {}
): Promise<ClipLayers> {
  await fs.mkdir(outDir, { recursive: true });
  const { start, duration } = { start: clip.start, duration: clip.duration };
  const layers: ClipLayers = {};

  // Build the cumulative filter chains for each tracked layer output.
  const baseChain = [SCALE_PAD];
  const v4Chain = [...baseChain, VIGNETTE_BOTTOM];
  const v5Chain = [...baseChain, VIGNETTE_FULL];
  const v6Chain = [...v5Chain, LIGHT_LEAK];
  const v7Chain = [...v6Chain, FILM_DUST];
  const v8Chain = [...v6Chain, GRAIN];
  const v9Chain = [...v8Chain, GRADE_1];
  const v10Chain = [...v9Chain, GRADE_2];

  // Subtitle file for the final layer.
  const assPath = path.join(outDir, 'subtitles.ass');
  await writeAssSubtitles(
    clip.segments,
    assPath,
    options.subtitleStyle || 'yellow'
  );
  const v11Chain = [...v10Chain, `subtitles='${escapeFilterPath(assPath)}'`];

  const passes: Array<{
    key: keyof ClipLayers;
    file: string;
    vf: string | null;
    copy?: boolean;
  }> = [
    { key: 'v1_raw', file: 'clip_v1_raw.mp4', vf: null, copy: true },
    { key: 'v2_base', file: 'clip_v2_base.mp4', vf: baseChain.join(',') },
    {
      key: 'v4_bottomvignette',
      file: 'clip_v4_bottomvignette.mp4',
      vf: v4Chain.join(','),
    },
    { key: 'v5_vignette', file: 'clip_v5_vignette.mp4', vf: v5Chain.join(',') },
    { key: 'v6_lightleak', file: 'clip_v6_lightleak.mp4', vf: v6Chain.join(',') },
    { key: 'v7_dust', file: 'clip_v7_dust.mp4', vf: v7Chain.join(',') },
    { key: 'v8_grain', file: 'clip_v8_grain.mp4', vf: v8Chain.join(',') },
    { key: 'v9_grade1', file: 'clip_v9_grade1.mp4', vf: v9Chain.join(',') },
    { key: 'v10_grade2', file: 'clip_v10_grade2.mp4', vf: v10Chain.join(',') },
    { key: 'v11_final', file: 'clip_v11_final.mp4', vf: v11Chain.join(',') },
  ];

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    const outPath = path.join(outDir, pass.file);
    options.onProgress?.(pass.key, i + 1, passes.length);
    try {
      await runPass(inputPath, start, duration, pass.vf, outPath, pass.copy);
      layers[pass.key] = outPath;
    } catch (err) {
      // If the raw stream-copy cut fails (codec quirk), retry with re-encode.
      if (pass.copy) {
        await runPass(inputPath, start, duration, SCALE_PAD, outPath, false);
        layers[pass.key] = outPath;
      } else {
        throw err;
      }
    }
  }

  return layers;
}

/**
 * Generate just the final (V11) clip — the fast path used by the main pipeline
 * when the full layer stack isn't needed up front.
 */
export async function generateFinalClip(
  inputPath: string,
  clip: Clip,
  outDir: string,
  subtitleStyle: SubtitleStyle = 'yellow'
): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const assPath = path.join(outDir, 'subtitles.ass');
  await writeAssSubtitles(clip.segments, assPath, subtitleStyle);

  const vf = [
    SCALE_PAD,
    VIGNETTE_FULL,
    LIGHT_LEAK,
    GRAIN,
    GRADE_1,
    GRADE_2,
    `subtitles='${escapeFilterPath(assPath)}'`,
  ].join(',');

  const outPath = path.join(outDir, 'clip_v11_final.mp4');
  await runPass(inputPath, clip.start, clip.duration, vf, outPath, false);
  return outPath;
}
