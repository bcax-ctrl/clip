import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getJob, updateJob, saveJob } from "@/lib/jobs";
import { readTranscript } from "@/lib/transcribe";
import { generateAss, clipTranscript } from "@/lib/ass";
import { renderJob } from "@/lib/ffmpeg";
import { jobFile } from "@/lib/paths";
import { ClipSpec, ClipResult, RenderOptions, Job } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 3600;

/** Patch a single clip entry in the job and persist. */
function patchClip(jobId: string, clipId: string, patch: Partial<ClipResult>) {
  const job = getJob(jobId);
  if (!job || !job.clips) return;
  job.clips = job.clips.map((c) =>
    c.id === clipId ? { ...c, ...patch } : c
  );
  saveJob(job);
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, clips, options } = (await req.json()) as {
      jobId?: string;
      clips?: ClipSpec[];
      options?: RenderOptions;
    };
    if (!jobId || !options || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json(
        { error: "jobId, clips, dan options wajib." },
        { status: 400 }
      );
    }
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
    }
    if (!job.hasSource) {
      return NextResponse.json({ error: "Source belum siap." }, { status: 400 });
    }

    // Server-assigned, filesystem-safe ids.
    const results: ClipResult[] = clips.map((c, i) => ({
      id: String(i + 1),
      start: c.start,
      end: c.end,
      label: c.label,
      status: "pending",
      percent: 0,
    }));

    updateJob(jobId, {
      status: "rendering",
      clips: results,
      hasOutput: false,
    });

    // Render clips sequentially in the background.
    void renderBatch(jobId, results, options);

    return NextResponse.json({ ok: true, clips: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function renderBatch(
  jobId: string,
  clips: ClipResult[],
  options: RenderOptions
) {
  let anyDone = false;
  for (const clip of clips) {
    patchClip(jobId, clip.id, { status: "rendering", percent: 0 });

    const opts: RenderOptions = {
      ...options,
      trim: { start: clip.start, end: clip.end },
    };

    try {
      if (opts.subtitleStyle && opts.subtitleStyle !== "none") {
        let transcript = readTranscript(jobId);
        if (transcript) {
          transcript = clipTranscript(transcript, clip.start, clip.end);
          const ass = generateAss(transcript, opts.subtitleStyle);
          fs.writeFileSync(
            jobFile(jobId, `subtitle-${clip.id}.ass`),
            ass,
            "utf8"
          );
        }
      }

      await renderJob(
        jobId,
        opts,
        (p) => patchClip(jobId, clip.id, { percent: p.percent }),
        {
          outName: `output-${clip.id}.mp4`,
          subtitleName: `subtitle-${clip.id}.ass`,
          hookName: `hook-${clip.id}.txt`,
        },
        `progress-${clip.id}.json`
      );

      anyDone = true;
      patchClip(jobId, clip.id, {
        status: "done",
        percent: 100,
        outputFile: `output-${clip.id}.mp4`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render gagal.";
      patchClip(jobId, clip.id, { status: "error", error: message });
    }
  }

  const final: Partial<Job> = {
    status: anyDone ? "done" : "error",
    hasOutput: anyDone,
  };
  updateJob(jobId, final);
}
