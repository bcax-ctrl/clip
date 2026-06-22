import { NextRequest, NextResponse } from "next/server";
import { createJob, updateJob, setStatus } from "@/lib/jobs";
import { downloadYoutube, isLikelyVideoUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !isLikelyVideoUrl(url)) {
      return NextResponse.json({ error: "URL tidak valid." }, { status: 400 });
    }

    const job = createJob({
      source: "youtube",
      sourceName: url,
      sourceUrl: url,
    });

    try {
      const duration = await downloadYoutube(job.id, url);
      const updated = updateJob(job.id, {
        hasSource: true,
        durationSec: duration,
        status: "uploaded",
      });
      return NextResponse.json({ job: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download gagal.";
      setStatus(job.id, "error", message);
      return NextResponse.json({ error: message, jobId: job.id }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
