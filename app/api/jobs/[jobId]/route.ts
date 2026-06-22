import { NextResponse } from "next/server";
import fs from "node:fs";
import { getJob } from "@/lib/jobs";
import { jobDir, safeSegment } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);
  if (!job) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ job });
}

/** Delete a job and all its files (source, renders, transcript, etc.). */
export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  if (!safeSegment(params.jobId)) {
    return NextResponse.json({ error: "jobId tidak valid." }, { status: 400 });
  }
  const dir = jobDir(params.jobId);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
