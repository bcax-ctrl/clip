import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { TranscriptSegment, LayerFiles } from './types'

const execAsync = promisify(exec)

function buildScaleFilter(): string {
  return 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black'
}

function buildSubtitleFilter(segments: TranscriptSegment[], clipStart: number, clipEnd: number): string {
  const relevant = segments.filter(s => s.end > clipStart && s.start < clipEnd)
  if (relevant.length === 0) return ''

  return relevant.map(seg => {
    const localStart = Math.max(0, seg.start - clipStart).toFixed(3)
    const localEnd = Math.min(clipEnd - clipStart, seg.end - clipStart).toFixed(3)
    const text = seg.text.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/,/g, '\\,')
    return `drawtext=text='${text}':fontsize=22:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.78:enable='between(t,${localStart},${localEnd})'`
  }).join(',')
}

async function runFFmpeg(cmd: string): Promise<void> {
  await execAsync(cmd, { maxBuffer: 500 * 1024 * 1024, timeout: 10 * 60 * 1000 })
}

export async function generateAllLayers(
  inputPath: string,
  clipStart: number,
  clipEnd: number,
  outputDir: string,
  transcript: TranscriptSegment[]
): Promise<LayerFiles> {
  fs.mkdirSync(outputDir, { recursive: true })

  if (process.env.DEMO_MODE === 'true') {
    const layerNames = ['v1_raw', 'v2_base', 'v4_bottomvignette', 'v5_vignette', 'v6_lightleak', 'v7_dust', 'v8_grain', 'v9_grade1', 'v10_grade2', 'v11_final']
    const layers: LayerFiles = {}
    for (const name of layerNames) {
      const ext = path.extname(inputPath) || '.mp4'
      const outPath = path.join(outputDir, `clip_${name}${ext}`)
      fs.copyFileSync(inputPath, outPath)
      layers[name as keyof LayerFiles] = outPath
    }
    return layers
  }

  const ss = clipStart.toFixed(3)
  const to = clipEnd.toFixed(3)
  const scale = buildScaleFilter()
  const subFilter = buildSubtitleFilter(transcript, clipStart, clipEnd)

  // Encoding preset: faster preset = quicker render, slightly bigger file.
  // ultrafast | superfast | veryfast | faster | fast | medium ...
  const preset = process.env.FFMPEG_PRESET || 'veryfast'
  // Common encode args; -threads 0 lets x264 use every available core.
  const enc = `-c:a aac -c:v libx264 -crf 23 -preset ${preset} -threads 0`

  // By default only render the layers the UI actually needs (raw + final),
  // which cuts ~9 full encodes per clip down to 1. Set FULL_LAYERS=true to
  // generate every intermediate grading stage for the Before/After explorer.
  const fullLayers = process.env.FULL_LAYERS === 'true'

  const layers: LayerFiles = {}

  // v1_raw: stream copy, no re-encode — instant. Used as "Before".
  const v1 = path.join(outputDir, 'clip_v1_raw.mp4')
  await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -c copy "${v1}"`)
  layers.v1_raw = v1

  const gradeFilters = `${scale},vignette=PI/4,colorbalance=rs=0.1:gs=0.05:bs=-0.1:hs=-0.05:hm=0:hl=0.08,noise=alls=12:allf=t,eq=contrast=1.15:brightness=0.04:saturation=1.4:gamma=0.95,curves=r='0/0 0.5/0.52 1/1':g='0/0 0.5/0.5 1/1':b='0/0.05 0.5/0.48 1/0.95'`

  if (fullLayers) {
    const v2 = path.join(outputDir, 'clip_v2_base.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale}" ${enc} "${v2}"`)
    layers.v2_base = v2

    const v4 = path.join(outputDir, 'clip_v4_bottomvignette.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/6:mode=backward" ${enc} "${v4}"`)
    layers.v4_bottomvignette = v4

    const v5 = path.join(outputDir, 'clip_v5_vignette.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/4" ${enc} "${v5}"`)
    layers.v5_vignette = v5

    const v6 = path.join(outputDir, 'clip_v6_lightleak.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/4,colorbalance=rs=0.1:gs=0.05:bs=-0.1:rm=0.05:gm=0:bm=-0.05" ${enc} "${v6}"`)
    layers.v6_lightleak = v6

    const v7 = path.join(outputDir, 'clip_v7_dust.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/4,colorbalance=rs=0.1:gs=0.05:bs=-0.1,noise=alls=4:allf=t+u" ${enc} "${v7}"`)
    layers.v7_dust = v7

    const v8 = path.join(outputDir, 'clip_v8_grain.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/4,colorbalance=rs=0.1:gs=0.05:bs=-0.1,noise=alls=12:allf=t" ${enc} "${v8}"`)
    layers.v8_grain = v8

    const v9 = path.join(outputDir, 'clip_v9_grade1.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${scale},vignette=PI/4,colorbalance=rs=0.1:gs=0.05:bs=-0.1,noise=alls=12:allf=t,eq=contrast=1.15:brightness=0.04:saturation=1.4:gamma=0.95" ${enc} "${v9}"`)
    layers.v9_grade1 = v9

    const v10 = path.join(outputDir, 'clip_v10_grade2.mp4')
    await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${gradeFilters}" ${enc} "${v10}"`)
    layers.v10_grade2 = v10
  }

  const v11 = path.join(outputDir, 'clip_v11_final.mp4')
  const v11Filter = subFilter ? `${gradeFilters},${subFilter}` : gradeFilters
  await runFFmpeg(`ffmpeg -y -ss ${ss} -to ${to} -i "${inputPath}" -vf "${v11Filter}" ${enc} "${v11}"`)
  layers.v11_final = v11

  return layers
}
