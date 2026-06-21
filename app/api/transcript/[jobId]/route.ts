import { NextResponse } from "next/server";
import { readTranscript } from "@/lib/transcribe";

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
