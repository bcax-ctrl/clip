import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobQueue'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; clipId: string } }
) {
  const job = getJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const clip = job.clips.find(c => c.id === params.clipId)
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const available: Record<string, string> = {}
  for (const [key, filePath] of Object.entries(clip.layers)) {
    if (filePath && fs.existsSync(filePath)) {
      available[key] = `/api/clips/${params.jobId}/${params.clipId}?layer=${key}`
    }
  }

  return NextResponse.json(available)
}
