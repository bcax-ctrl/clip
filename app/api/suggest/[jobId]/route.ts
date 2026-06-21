import { NextRequest, NextResponse } from "next/server";
import { readTranscript } from "@/lib/transcribe";
import { suggestClips } from "@/lib/suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const transcript = readTranscript(params.jobId);
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript belum ada. Jalankan transkripsi dulu." },
      { status: 400 }
    );
  }
  const targetSec = Number(req.nextUrl.searchParams.get("target")) || 30;
  const suggestions = suggestClips(transcript, { targetSec });
  return NextResponse.json({ suggestions });
}
