// POST /api/jobs  — create a job from an uploaded file or a local file path.
// GET  /api/jobs  — list recent jobs.

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  createJob,
  listJobs,
  uploadDir,
} from '@/lib/jobQueue';
import { getDuration } from '@/lib/ffmpeg';
import { runJob } from '@/lib/processor';

export const runtime = 'nodejs';
// Disable Next's default body size limit for large uploads.
export const maxDuration = 300;

export async function GET() {
  const jobs = listJobs().map((j) => ({
    jobId: j.id,
    status: j.status,
    fileName: j.fileName,
    progress: j.progress,
    createdAt: j.createdAt,
  }));
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let fileName = 'input.mp4';
    let fileSize = 0;
    let inputPath = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const localPath = form.get('filePath');

      if (typeof localPath === 'string' && localPath.trim()) {
        // Use an existing local file in place (no copy).
        inputPath = localPath.trim();
        try {
          const stat = await fs.stat(inputPath);
          fileSize = stat.size;
          fileName = path.basename(inputPath);
        } catch {
          return NextResponse.json(
            { error: `File not found at path: ${inputPath}` },
            { status: 400 }
          );
        }
      } else {
        const file = form.get('file');
        if (!file || typeof file === 'string') {
          return NextResponse.json(
            { error: 'No file provided.' },
            { status: 400 }
          );
        }
        const blob = file as File;
        fileName = blob.name || 'input.mp4';
        fileSize = blob.size;

        // Create the job first so we know where to write.
        const job = createJob({ fileName, fileSize, inputPath: '' });
        const dir = uploadDir(job.id);
        await fs.mkdir(dir, { recursive: true });
        const ext = path.extname(fileName) || '.mp4';
        inputPath = path.join(dir, `input${ext}`);

        await streamToFile(blob, inputPath);

        const duration = await getDuration(inputPath);
        job.inputPath = inputPath;
        job.duration = duration;

        // Kick off processing in the background.
        void runJob(job.id);

        return NextResponse.json({
          jobId: job.id,
          status: job.status,
          duration,
        });
      }
    } else {
      // JSON body with a filePath.
      const body = await req.json().catch(() => ({}));
      if (!body.filePath) {
        return NextResponse.json(
          { error: 'Provide a file upload or a filePath.' },
          { status: 400 }
        );
      }
      inputPath = String(body.filePath).trim();
      try {
        const stat = await fs.stat(inputPath);
        fileSize = stat.size;
        fileName = path.basename(inputPath);
      } catch {
        return NextResponse.json(
          { error: `File not found at path: ${inputPath}` },
          { status: 400 }
        );
      }
    }

    // Path-based job (local file referenced in place).
    const duration = await getDuration(inputPath);
    const job = createJob({ fileName, fileSize, inputPath, duration });
    void runJob(job.id);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      duration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    console.error('POST /api/jobs failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Stream a web File/Blob to disk without buffering the whole thing in memory. */
async function streamToFile(blob: File, outPath: string): Promise<void> {
  const nodeStream = Readable.fromWeb(blob.stream() as any);
  const writeStream = createWriteStream(outPath);
  await new Promise<void>((resolve, reject) => {
    nodeStream.pipe(writeStream);
    nodeStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', () => resolve());
  });
}
