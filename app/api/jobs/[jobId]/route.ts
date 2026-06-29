import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobQueue'

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const job = getJob(params.jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    progressStep: job.progressStep,
    clips: job.clips,
    error: job.error,
    fileName: job.fileName,
    duration: job.duration,
  })
}
