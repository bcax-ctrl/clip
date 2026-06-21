import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

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
