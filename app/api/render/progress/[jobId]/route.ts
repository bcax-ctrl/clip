import { NextRequest } from "next/server";
import { readProgress } from "@/lib/ffmpeg";
import { getJob } from "@/lib/jobs";
import { safeSegment } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of render progress.
 * Falls back to polling-friendly JSON when ?poll=1 is passed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  if (!safeSegment(jobId) || !getJob(jobId)) {
    return new Response("Not found", { status: 404 });
  }

  if (req.nextUrl.searchParams.get("poll") === "1") {
    const job = getJob(jobId);
    const progress = readProgress(jobId);
    return Response.json({ status: job?.status, progress });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = () => {
        if (closed) return;
        const job = getJob(jobId);
        const progress = readProgress(jobId);
        send({ status: job?.status, progress });
        if (
          job?.status === "done" ||
          job?.status === "error" ||
          progress?.done
        ) {
          closed = true;
          clearInterval(timer);
          controller.close();
        }
      };

      const timer = setInterval(tick, 500);
      tick();

      // Stop if the client disconnects.
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
