import { NextRequest, NextResponse } from 'next/server'
import formidable from 'formidable'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { createJob, updateJob, setJobStatus } from '@/lib/jobQueue'
import { transcribeVideo } from '@/lib/whisper'
import { detectViralClips } from '@/lib/claude'
import { generateAllLayers } from '@/lib/ffmpegLayers'
import { generateThumbnail, getVideoDuration } from '@/lib/ffmpeg'

export async function POST(req: NextRequest) {
  const uploadBase = process.env.UPLOAD_DIR || '/tmp/clipmine'
  const jobId = uuidv4()
  const jobDir = path.join(uploadBase, 'jobs', jobId)
  const uploadDir = path.join(jobDir, 'input')
  fs.mkdirSync(uploadDir, { recursive: true })

  const formData = await req.formData()
  const file = formData.get('video') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
  }

  const maxMB = parseInt(process.env.MAX_FILE_SIZE_MB || '2000')
  if (file.size > maxMB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large. Max ${maxMB}MB.` }, { status: 400 })
  }

  const ext = path.extname(file.name) || '.mp4'
  const inputPath = path.join(uploadDir, `input${ext}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(inputPath, buffer)

  const job = createJob({
    id: jobId,
    inputPath,
    outputDir: jobDir,
    fileName: file.name,
    fileSize: file.size,
  })

  // Run pipeline async
  runPipeline(jobId, inputPath, jobDir).catch(err => {
    updateJob(jobId, { status: 'error', error: err.message })
  })

  return NextResponse.json({ jobId, status: job.status })
}

async function runPipeline(jobId: string, inputPath: string, jobDir: string) {
  setJobStatus(jobId, 'transcribing', 10, 'Transcribing audio...')

  let transcript
  try {
    // Map transcription 0-100% into the 10-35% slice of the overall job bar.
    transcript = await transcribeVideo(inputPath, jobDir, (pct) => {
      const mapped = 10 + Math.round((pct / 100) * 25)
      setJobStatus(jobId, 'transcribing', mapped, `Transcribing audio... ${pct}%`)
    })
  } catch (err: unknown) {
    const error = err as Error
    throw new Error(error.message)
  }
  updateJob(jobId, { transcript })

  setJobStatus(jobId, 'analyzing', 35, 'Detecting viral moments...')

  let clips
  try {
    clips = await detectViralClips(transcript)
  } catch (err: unknown) {
    const error = err as Error
    throw new Error(error.message)
  }

  fs.writeFileSync(path.join(jobDir, 'clips.json'), JSON.stringify(clips, null, 2))
  updateJob(jobId, { clips })

  setJobStatus(jobId, 'clipping', 50, 'Generating clips...')

  const duration = await getVideoDuration(inputPath).catch(() => 0)
  updateJob(jobId, { duration })

  const totalClips = clips.length
  for (let i = 0; i < totalClips; i++) {
    const clip = clips[i]
    const clipDir = path.join(jobDir, 'clips', clip.id)
    fs.mkdirSync(clipDir, { recursive: true })

    const progress = 50 + Math.round(((i + 1) / totalClips) * 45)
    setJobStatus(jobId, 'clipping', progress, `Generating clip ${i + 1} of ${totalClips}...`)

    try {
      const layers = await generateAllLayers(inputPath, clip.start, clip.end, clipDir, transcript)
      clip.layers = layers

      const thumbPath = path.join(clipDir, 'thumbnail.jpg')
      await generateThumbnail(inputPath, clip.start + 2, thumbPath)
      if (fs.existsSync(thumbPath)) {
        clip.thumbnailUrl = `/api/clips/${jobId}/${clip.id}/thumbnail`
      }
    } catch (err) {
      console.error(`Failed to generate clip ${clip.id}:`, err)
    }

    updateJob(jobId, { clips })
  }

  setJobStatus(jobId, 'done', 100, 'Done!')
}
