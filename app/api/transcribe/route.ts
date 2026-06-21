import { NextRequest, NextResponse } from "next/server";
import { getJob, setStatus, updateJob } from "@/lib/jobs";
import { transcribeJob, WhisperModel } from "@/lib/transcribe";

export const runtime = "nodejs";
export const maxDuration = 1800;

export async function POST(req: NextRequest) {
  try {
    const { jobId, model, language } = (await req.json()) as {
      jobId?: string;
      model?: WhisperModel;
      language?: string;
    };
    if (!jobId) {
      return NextResponse.json({ error: "jobId wajib." }, { status: 400 });
    }
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
    }
    if (!job.hasSource) {
      return NextResponse.json(
        { error: "Source video belum siap." },
        { status: 400 }
      );
    }

    setStatus(jobId, "transcribing");
    try {
      const transcript = await transcribeJob(jobId, model ?? "base", language);
      const updated = updateJob(jobId, {
        status: "transcribed",
        hasTranscript: true,
        durationSec: transcript.duration || job.durationSec,
      });
      return NextResponse.json({ job: updated, transcript });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transkripsi gagal.";
      setStatus(jobId, "error", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
