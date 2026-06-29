// GET /api/jobs/[jobId] — poll job status, progress, and clips.

import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobQueue';
import type { JobStatusResponse } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  const body: JobStatusResponse = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    fileName: job.fileName,
    duration: job.duration,
    clips: job.clips,
    error: job.error,
  };
  return NextResponse.json(body);
}
