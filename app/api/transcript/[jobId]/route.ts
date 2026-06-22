import { NextResponse } from "next/server";
import fs from "node:fs";
import { readTranscript } from "@/lib/transcribe";
import { getJob } from "@/lib/jobs";
import { jobFile, FILES } from "@/lib/paths";
import { Transcript, Word } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const transcript = readTranscript(params.jobId);
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript belum tersedia." },
      { status: 404 }
    );
  }
  return NextResponse.json({ transcript });
}

function isWord(w: unknown): w is Word {
  return (
    !!w &&
    typeof w === "object" &&
    typeof (w as Word).text === "string" &&
    typeof (w as Word).start === "number" &&
    typeof (w as Word).end === "number"
  );
}

/** Persist an edited transcript (typo fixes / deletions) back to disk. */
export async function PUT(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);
  if (!job) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }
  let body: { transcript?: Transcript };
  try {
    body = (await req.json()) as { transcript?: Transcript };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const t = body.transcript;
  if (!t || !Array.isArray(t.words) || !t.words.every(isWord)) {
    return NextResponse.json(
      { error: "Transcript tidak valid." },
      { status: 400 }
    );
  }
  // Trim whitespace on word text; drop fully empty words.
  const clean: Transcript = {
    ...t,
    words: t.words
      .map((w) => ({ ...w, text: w.text.trim() }))
      .filter((w) => w.text.length > 0),
    segments: Array.isArray(t.segments) ? t.segments : [],
  };
  fs.writeFileSync(
    jobFile(params.jobId, FILES.transcript),
    JSON.stringify(clean, null, 2),
    "utf8"
  );
  return NextResponse.json({ ok: true, words: clean.words.length });
}
