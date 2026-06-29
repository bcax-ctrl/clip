import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { createJob, updateJob, setJobStatus } from '@/lib/jobQueue'
import { transcribeVideo } from '@/lib/whisper'
import { detectViralClips } from '@/lib/claude'
import { generateAllLayers } from '@/lib/ffmpegLayers'
import { generateThumbnail, getVideoDuration } from '@/lib/ffmpeg'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 })
  }

  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/
  if (!ytRegex.test(url)) {
    return NextResponse.json({ error: 'Bukan link YouTube yang valid' }, { status: 400 })
  }

  // Check yt-dlp installed
  try {
    await execAsync('yt-dlp --version')
  } catch {
    return NextResponse.json({
      error: 'yt-dlp tidak terinstall. Jalankan: pip install yt-dlp'
    }, { status: 500 })
  }

  const uploadBase = process.env.UPLOAD_DIR || '/tmp/clipmine'
  const jobId = uuidv4()
  const jobDir = path.join(uploadBase, 'jobs', jobId)
  const uploadDir = path.join(jobDir, 'input')
  fs.mkdirSync(uploadDir, { recursive: true })

  const inputPath = path.join(uploadDir, 'input.mp4')

  const job = createJob({
    id: jobId,
    inputPath,
    outputDir: jobDir,
    fileName: url,
    fileSize: 0,
  })

  // Run async
  runYoutubePipeline(jobId, url, inputPath, jobDir).catch(err => {
    updateJob(jobId, { status: 'error', error: err.message })
  })

  return NextResponse.json({ jobId, status: job.status })
}

async function runYoutubePipeline(jobId: string, url: string, inputPath: string, jobDir: string) {
  setJobStatus(jobId, 'transcribing', 5, 'Downloading from YouTube...')

  try {
    await execAsync(
      `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${inputPath}" "${url}"`,
      { maxBuffer: 100 * 1024 * 1024, timeout: 30 * 60 * 1000 }
    )
  } catch (err: unknown) {
    throw new Error(`Gagal download video: ${(err as Error).message}`)
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error('File video tidak ditemukan setelah download')
  }

  const stat = fs.statSync(inputPath)
  updateJob(jobId, { fileSize: stat.size, fileName: url })

  setJobStatus(jobId, 'transcribing', 15, 'Transcribing audio...')
  const transcript = await transcribeVideo(inputPath, jobDir, (pct) => {
    const mapped = 15 + Math.round((pct / 100) * 20)
    setJobStatus(jobId, 'transcribing', mapped, `Transcribing audio... ${pct}%`)
  })
  updateJob(jobId, { transcript })

  setJobStatus(jobId, 'analyzing', 40, 'Detecting viral moments...')
  const clips = await detectViralClips(transcript)
  fs.writeFileSync(path.join(jobDir, 'clips.json'), JSON.stringify(clips, null, 2))
  updateJob(jobId, { clips })

  setJobStatus(jobId, 'clipping', 55, 'Generating clips...')
  const duration = await getVideoDuration(inputPath).catch(() => 0)
  updateJob(jobId, { duration })

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const clipDir = path.join(jobDir, 'clips', clip.id)
    fs.mkdirSync(clipDir, { recursive: true })

    const progress = 55 + Math.round(((i + 1) / clips.length) * 40)
    setJobStatus(jobId, 'clipping', progress, `Generating clip ${i + 1} of ${clips.length}...`)

    try {
      const layers = await generateAllLayers(inputPath, clip.start, clip.end, clipDir, transcript)
      clip.layers = layers

      const thumbPath = path.join(clipDir, 'thumbnail.jpg')
      await generateThumbnail(inputPath, clip.start + 2, thumbPath)
      if (fs.existsSync(thumbPath)) {
        clip.thumbnailUrl = `/api/clips/${jobId}/${clip.id}/thumbnail`
      }
    } catch (err) {
      console.error(`Failed clip ${clip.id}:`, err)
    }

    updateJob(jobId, { clips })
  }

  setJobStatus(jobId, 'done', 100, 'Done!')
}
