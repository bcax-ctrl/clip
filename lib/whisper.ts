import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { TranscriptSegment } from './types'

const execAsync = promisify(exec)

const DEMO_SEGMENTS: TranscriptSegment[] = [
  { start: 0, end: 9.5, text: "This is where everything changed for me..." },
  { start: 10, end: 19.5, text: "I went from zero to a million followers in just six months." },
  { start: 20, end: 29.5, text: "Nobody believed it was possible, but here's exactly how I did it." },
  { start: 30, end: 39.5, text: "The one thing most people get completely wrong about content creation." },
  { start: 40, end: 49.5, text: "I almost quit three times before I discovered this strategy." },
  { start: 50, end: 59.5, text: "What happened next absolutely shocked even the people closest to me." },
  { start: 60, end: 69.5, text: "The secret is not what you're posting — it's when and why." },
  { start: 70, end: 79.5, text: "I'm going to show you the exact framework I use every single day." },
  { start: 80, end: 89.5, text: "This moment right here is what every creator needs to understand." },
  { start: 90, end: 99.5, text: "If you take nothing else from this video, remember this one thing." },
]

export async function transcribeVideo(inputPath: string, outputDir: string): Promise<TranscriptSegment[]> {
  if (process.env.DEMO_MODE === 'true') {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'transcript.json'), JSON.stringify(DEMO_SEGMENTS, null, 2))
    return DEMO_SEGMENTS
  }

  const transcriptDir = path.join(outputDir, 'transcript')
  fs.mkdirSync(transcriptDir, { recursive: true })

  // Default to the smallest model for speed. Override with WHISPER_MODEL
  // (tiny | base | small | medium | large) if accuracy matters more.
  const model = process.env.WHISPER_MODEL || 'tiny'
  const language = process.env.WHISPER_LANGUAGE // e.g. "en", "id"

  // faster-whisper engine (CTranslate2) — ~4x faster on CPU.
  // Enable with WHISPER_ENGINE=faster (requires: pip install faster-whisper).
  if (process.env.WHISPER_ENGINE === 'faster') {
    return transcribeWithFasterWhisper(inputPath, outputDir, model, language)
  }
  const threads = process.env.WHISPER_THREADS || '0' // 0 = use all cores
  // Setting a language skips Whisper's auto-detection pass (a few seconds).
  const langFlag = language ? ` --language ${language}` : ''

  try {
    await execAsync(
      `whisper "${inputPath}" --model ${model} --threads ${threads} --fp16 False${langFlag} --output_format json --output_dir "${transcriptDir}"`,
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

// Run transcription via the faster-whisper Python helper, which prints the
// segments as JSON to stdout in our format.
async function transcribeWithFasterWhisper(
  inputPath: string,
  outputDir: string,
  model: string,
  language?: string
): Promise<TranscriptSegment[]> {
  const script = path.join(process.cwd(), 'scripts', 'faster_whisper_transcribe.py')
  const py = process.env.PYTHON_BIN || 'python'
  const cmd = `${py} "${script}" "${inputPath}" "${model}" "${language || ''}"`

  let stdout: string
  try {
    const res = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024, timeout: 30 * 60 * 1000 })
    stdout = res.stdout
  } catch (err: unknown) {
    const error = err as Error & { stderr?: string }
    const detail = error.stderr || error.message
    if (detail?.includes('faster-whisper not installed')) {
      throw new Error('faster-whisper not installed. Run: pip install faster-whisper')
    }
    throw new Error(`faster-whisper failed: ${detail}`)
  }

  let parsed: { start: number; end: number; text: string }[]
  try {
    parsed = JSON.parse(stdout.trim())
  } catch {
    throw new Error('faster-whisper produced invalid output')
  }

  const segments: TranscriptSegment[] = parsed.map(s => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  fs.writeFileSync(path.join(outputDir, 'transcript.json'), JSON.stringify(segments, null, 2))
  return segments
}
