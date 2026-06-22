import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getJob } from "@/lib/jobs";
import { readTranscript } from "@/lib/transcribe";
import { generateAss } from "@/lib/ass";
import { jobFile, FILES } from "@/lib/paths";
import { SubtitleStyleId } from "@/lib/types";

export const runtime = "nodejs";

/** Generate (and persist) the .ass file for a chosen style. */
export async function POST(req: NextRequest) {
  try {
    const { jobId, style } = (await req.json()) as {
      jobId?: string;
      style?: SubtitleStyleId;
    };
    if (!jobId || !style) {
      return NextResponse.json(
        { error: "jobId & style wajib." },
        { status: 400 }
      );
    }
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
    }
    const transcript = readTranscript(jobId);
    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript belum ada. Jalankan transkripsi dulu." },
        { status: 400 }
      );
    }

    const ass = generateAss(transcript, style);
    fs.writeFileSync(jobFile(jobId, FILES.subtitle), ass, "utf8");
    return NextResponse.json({ ok: true, bytes: ass.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal generate subtitle.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
