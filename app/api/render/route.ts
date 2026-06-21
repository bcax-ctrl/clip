import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getJob, updateJob, setStatus } from "@/lib/jobs";
import { readTranscript } from "@/lib/transcribe";
import { generateAss } from "@/lib/ass";
import { renderJob } from "@/lib/ffmpeg";
import { jobFile, FILES } from "@/lib/paths";
import { RenderOptions } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 1800;

export async function POST(req: NextRequest) {
  try {
    const { jobId, options } = (await req.json()) as {
      jobId?: string;
      options?: RenderOptions;
    };
    if (!jobId || !options) {
      return NextResponse.json(
        { error: "jobId & options wajib." },
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

    // Regenerate the .ass to match the chosen style (if subtitles requested).
    if (options.subtitleStyle && options.subtitleStyle !== "none") {
      const transcript = readTranscript(jobId);
      if (!transcript) {
        return NextResponse.json(
          { error: "Transcript belum ada untuk subtitle." },
          { status: 400 }
        );
      }
      const ass = generateAss(transcript, options.subtitleStyle);
      fs.writeFileSync(jobFile(jobId, FILES.subtitle), ass, "utf8");
    }

    updateJob(jobId, {
      status: "rendering",
      renderOptions: options,
      hasOutput: false,
      progress: { percent: 0, outTimeSec: 0, done: false },
    });

    // Fire-and-forget: the long-running server keeps this alive.
    // Progress is persisted to progress.json and relayed via SSE.
    renderJob(jobId, options)
      .then(() => {
        updateJob(jobId, { status: "done", hasOutput: true });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Render gagal.";
        setStatus(jobId, "error", message);
      });

    return NextResponse.json({ ok: true, status: "rendering" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
