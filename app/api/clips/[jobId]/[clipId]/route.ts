import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobQueue'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; clipId: string } }
) {
  const job = getJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const clip = job.clips.find(c => c.id === params.clipId)
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const layer = searchParams.get('layer') || 'v11_final'

  const layerKey = layer as keyof typeof clip.layers
  const filePath = clip.layers[layerKey]

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Layer file not found' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const range = req.headers.get('range')

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunkSize = end - start + 1
    const stream = fs.createReadStream(filePath, { start, end })
    const { Readable } = await import('stream')
    const webStream = Readable.toWeb(stream) as ReadableStream
    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
      },
    })
  }

  const stream = fs.createReadStream(filePath)
  const { Readable } = await import('stream')
  const webStream = Readable.toWeb(stream) as ReadableStream
  return new NextResponse(webStream, {
    headers: {
      'Content-Length': stat.size.toString(),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    },
  })
}
