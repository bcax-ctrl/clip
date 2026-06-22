import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { createJob, updateJob } from "@/lib/jobs";
import { jobFile, FILES } from "@/lib/paths";
import { probeDuration } from "@/lib/run";

export const runtime = "nodejs";
export const maxDuration = 600;

const ALLOWED = /\.(mp4|mov|m4v|webm|mkv)$/i;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }
    if (!ALLOWED.test(file.name)) {
      return NextResponse.json(
        { error: "Format tidak didukung. Pakai mp4/mov/webm/mkv." },
        { status: 400 }
      );
    }

    const job = createJob({ source: "upload", sourceName: file.name });

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(jobFile(job.id, FILES.source), buf);

    const duration = await probeDuration(jobFile(job.id, FILES.source));
    const updated = updateJob(job.id, {
      hasSource: true,
      durationSec: duration,
      status: "uploaded",
    });

    return NextResponse.json({ job: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
