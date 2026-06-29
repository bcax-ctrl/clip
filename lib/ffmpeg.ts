import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { Clip, TranscriptSegment } from './types'

function checkFFmpeg(): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) reject(new Error('FFmpeg not installed. Run: brew install ffmpeg (Mac) or sudo apt install ffmpeg (Linux)'))
      else resolve()
    })
  })
}

function buildSubtitleDrawtext(segments: TranscriptSegment[], clipStart: number, clipEnd: number): string {
  const relevant = segments.filter(s => s.end > clipStart && s.start < clipEnd)
  if (relevant.length === 0) return ''

  const parts = relevant.map(seg => {
    const localStart = Math.max(0, seg.start - clipStart)
    const localEnd = Math.min(clipEnd - clipStart, seg.end - clipStart)
    const text = seg.text.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/,/g, '\\,')
    return `drawtext=text='${text}':fontsize=22:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.78:enable='between(t,${localStart.toFixed(3)},${localEnd.toFixed(3)})'`
  })

  return parts.join(',')
}

export async function generateClip(
  inputPath: string,
  clip: Clip,
  outputDir: string,
  transcript: TranscriptSegment[]
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true })

  if (process.env.DEMO_MODE === 'true') {
    const ext = path.extname(inputPath) || '.mp4'
    const outputPath = path.join(outputDir, `clip_v11_final${ext}`)
    fs.copyFileSync(inputPath, outputPath)
    return outputPath
  }

  await checkFFmpeg()

  const outputPath = path.join(outputDir, 'clip_v11_final.mp4')
  const subtitleFilter = buildSubtitleDrawtext(transcript, clip.start, clip.end)

  const baseFilter = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black@0.0',
    'boxblur=luma_radius=40:luma_power=1[blurred]',
    '[blurred]scale=1080:1920[bg]',
    '[bg][0:v]overlay=(W-w)/2:(H-h)/2',
  ].join(',')

  const filterComplex = subtitleFilter
    ? `${baseFilter},${subtitleFilter}`
    : baseFilter

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(clip.start)
      .setDuration(clip.end - clip.start)
      .videoFilter(filterComplex)
      .audioCodec('aac')
      .videoCodec('libx264')
      .outputOptions(['-crf 23', '-preset fast', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
      .run()
  })
}

export async function generateThumbnail(inputPath: string, timeSeconds: number, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(timeSeconds)
      .frames(1)
      .size('320x568')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', () => resolve(''))
      .run()
  })
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err)
      else resolve(metadata.format.duration || 0)
    })
  })
}
