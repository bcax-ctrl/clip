import { NextRequest } from "next/server";
import fs from "node:fs";
import { jobFile, safeSegment, FILES } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only these job files may be served to the browser.
const ALLOWED: Record<string, string> = {
  source: FILES.source,
  output: FILES.output,
};

const CONTENT_TYPE = "video/mp4";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; file: string } }
) {
  const { jobId, file } = params;
  if (!safeSegment(jobId) || !ALLOWED[file]) {
    return new Response("Not found", { status: 404 });
  }
  const abs = jobFile(jobId, ALLOWED[file]);
  if (!fs.existsSync(abs)) {
    return new Response("Not found", { status: 404 });
  }

  const stat = fs.statSync(abs);
  const total = stat.size;
  const range = req.headers.get("range");

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= total) end = total - 1;
    if (start > end) start = 0;

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(abs, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": CONTENT_TYPE,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  const stream = fs.createReadStream(abs);
  return new Response(stream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
