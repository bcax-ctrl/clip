import { NextRequest } from "next/server";
import fs from "node:fs";
import { jobFile, safeSegment, FILES } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map a request `file` param to an actual filename in the job dir.
// Allows: source, output, and batch clip outputs (output-<id>.mp4).
function resolveName(file: string): string | null {
  if (file === "source") return FILES.source;
  if (file === "output") return FILES.output;
  if (/^output-[A-Za-z0-9_]+\.mp4$/.test(file)) return file;
  return null;
}

const CONTENT_TYPE = "video/mp4";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; file: string } }
) {
  const { jobId, file } = params;
  const name = resolveName(file);
  if (!safeSegment(jobId) || !name) {
    return new Response("Not found", { status: 404 });
  }
  const abs = jobFile(jobId, name);
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
