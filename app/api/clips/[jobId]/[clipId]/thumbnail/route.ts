import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobQueue'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; clipId: string } }
) {
  const job = getJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clip = job.clips.find(c => c.id === params.clipId)
  if (!clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uploadBase = process.env.UPLOAD_DIR || '/tmp/clipmine'
  const thumbPath = path.join(uploadBase, 'jobs', params.jobId, 'clips', params.clipId, 'thumbnail.jpg')

  if (!fs.existsSync(thumbPath)) {
    return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 })
  }

  const buffer = fs.readFileSync(thumbPath)
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
