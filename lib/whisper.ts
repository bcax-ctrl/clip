import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { TranscriptSegment } from './types'

const execAsync = promisify(exec)

export async function transcribeVideo(inputPath: string, outputDir: string): Promise<TranscriptSegment[]> {
  const transcriptDir = path.join(outputDir, 'transcript')
  fs.mkdirSync(transcriptDir, { recursive: true })

  const model = process.env.WHISPER_MODEL || 'base'

  try {
    await execAsync(
      `whisper "${inputPath}" --model ${model} --output_format json --output_dir "${transcriptDir}"`,
      { maxBuffer: 100 * 1024 * 1024, timeout: 30 * 60 * 1000 }
    )
  } catch (err: unknown) {
    const error = err as Error & { stderr?: string }
    if (error.message?.includes('command not found') || error.message?.includes('whisper')) {
      throw new Error('Whisper not installed. Run: pip install openai-whisper')
    }
    throw err
  }

  const baseName = path.basename(inputPath, path.extname(inputPath))
  const jsonPath = path.join(transcriptDir, `${baseName}.json`)

  if (!fs.existsSync(jsonPath)) {
    throw new Error('Whisper did not produce transcript output')
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  const segments: TranscriptSegment[] = (raw.segments || []).map((s: { start: number; end: number; text: string }) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  fs.writeFileSync(path.join(outputDir, 'transcript.json'), JSON.stringify(segments, null, 2))
  return segments
}
