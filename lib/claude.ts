import Anthropic from '@anthropic-ai/sdk'
import { TranscriptSegment, Clip } from './types'
import { v4 as uuidv4 } from 'uuid'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a viral content analyst. Given a video transcript with timestamps, identify 5-8 of the most engaging, surprising, or emotionally resonant moments that would make great short clips (45-90 seconds each).

For each clip, return:
- title: catchy TikTok-style title (max 8 words)
- start: start time in seconds
- end: end time in seconds
- hook: the first sentence that hooks the viewer
- score: viral potential score 1-10
- reason: why this moment is engaging

Return ONLY a valid JSON array, no explanation.`

const DEMO_CLIPS: Array<{ title: string; start: number; end: number; hook: string; score: number; reason: string }> = [
  {
    title: "From Zero to a Million Followers",
    start: 0,
    end: 60,
    hook: "This is where everything changed for me...",
    score: 9,
    reason: "Opens with a powerful transformation hook that creates immediate curiosity and relatability for aspiring creators.",
  },
  {
    title: "The Secret Nobody Tells You",
    start: 30,
    end: 80,
    hook: "The one thing most people get completely wrong about content creation.",
    score: 8,
    reason: "Contrarian framing combined with personal vulnerability ('I almost quit') drives high watch-time and shares.",
  },
  {
    title: "The Framework That Changed Everything",
    start: 60,
    end: 100,
    hook: "The secret is not what you're posting — it's when and why.",
    score: 7,
    reason: "Actionable promise with a counter-intuitive twist — high save rate potential as viewers want to reference it later.",
  },
]

export async function detectViralClips(transcript: TranscriptSegment[]): Promise<Clip[]> {
  if (process.env.DEMO_MODE === 'true') {
    return DEMO_CLIPS.map((c) => ({
      id: uuidv4(),
      title: c.title,
      start: c.start,
      end: c.end,
      hook: c.hook,
      score: c.score,
      reason: c.reason,
      duration: c.end - c.start,
      layers: {},
    }))
  }

  const transcriptText = transcript
    .map(s => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`)
    .join('\n')

  let rawClips: Array<{
    title: string
    start: number
    end: number
    hook: string
    score: number
    reason: string
  }>

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Here is the video transcript:\n\n${transcriptText}` }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array found in response')

    rawClips = JSON.parse(jsonMatch[0])
  } catch (err: unknown) {
    const error = err as Error
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      throw new Error('Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in .env.local')
    }
    // Fallback: split into 60-second chunks
    console.warn('Claude API failed, falling back to equal chunks:', error.message)
    rawClips = generateFallbackClips(transcript)
  }

  return rawClips.map((c, i) => ({
    id: uuidv4(),
    title: c.title || `Clip ${i + 1}`,
    start: Number(c.start) || 0,
    end: Number(c.end) || 60,
    hook: c.hook || '',
    score: Math.min(10, Math.max(1, Number(c.score) || 5)),
    reason: c.reason || '',
    duration: (Number(c.end) || 60) - (Number(c.start) || 0),
    layers: {},
  }))
}

function generateFallbackClips(transcript: TranscriptSegment[]): Array<{
  title: string; start: number; end: number; hook: string; score: number; reason: string
}> {
  if (transcript.length === 0) return []
  const totalDuration = transcript[transcript.length - 1].end
  const clips = []
  for (let i = 0; i < Math.min(5, Math.floor(totalDuration / 60)); i++) {
    const start = i * 60
    const end = Math.min(start + 60, totalDuration)
    const segText = transcript.filter(s => s.start >= start && s.end <= end).map(s => s.text).join(' ')
    clips.push({
      title: `Highlight ${i + 1}`,
      start,
      end,
      hook: segText.slice(0, 100),
      score: 5,
      reason: 'Auto-generated clip (Claude API unavailable)',
    })
  }
  return clips
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
