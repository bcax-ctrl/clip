// Claude API wrapper for viral-moment detection.
//
// Sends the full timestamped transcript to Claude and parses the returned JSON
// array of clip candidates. If the API key is missing or the call fails, falls
// back to splitting the video into equal ~60-second chunks so the pipeline can
// still produce usable clips.

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type { Clip, TranscriptSegment } from './types';

const SYSTEM_PROMPT = `You are a viral content analyst. Given a video transcript with timestamps, identify 5-8 of the most engaging, surprising, or emotionally resonant moments that would make great short clips (45-90 seconds each).

For each clip, return:
- title: catchy TikTok-style title (max 8 words)
- start: start time in seconds
- end: end time in seconds
- hook: the first sentence that hooks the viewer
- score: viral potential score 1-10
- reason: why this moment is engaging

Return ONLY a valid JSON array, no explanation.`;

interface RawClip {
  title: string;
  start: number;
  end: number;
  hook: string;
  score: number;
  reason: string;
}

/** Build the transcript text block sent to Claude. */
function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${s.start.toFixed(1)} - ${s.end.toFixed(1)}] ${s.text}`)
    .join('\n');
}

/** Extract a JSON array from a model response that may include stray prose. */
function extractJsonArray(text: string): RawClip[] {
  const trimmed = text.trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in Claude response.');
  }
  const slice = trimmed.slice(start, end + 1);
  return JSON.parse(slice) as RawClip[];
}

/** Collect transcript segments that overlap a clip's [start, end] range. */
function segmentsForRange(
  segments: TranscriptSegment[],
  start: number,
  end: number
): TranscriptSegment[] {
  return segments
    .filter((s) => s.end > start && s.start < end)
    .map((s) => ({
      start: Math.max(0, s.start - start),
      end: Math.max(0, Math.min(s.end, end) - start),
      text: s.text,
    }));
}

function normalizeClips(
  raw: RawClip[],
  segments: TranscriptSegment[]
): Clip[] {
  return raw
    .map((c) => {
      const start = Math.max(0, Number(c.start) || 0);
      const end = Math.max(start + 1, Number(c.end) || start + 60);
      return {
        id: randomUUID(),
        title: (c.title || 'Untitled Clip').slice(0, 80),
        start,
        end,
        hook: c.hook || '',
        score: Math.min(10, Math.max(1, Math.round(Number(c.score) || 5))),
        reason: c.reason || '',
        duration: Math.round(end - start),
        segments: segmentsForRange(segments, start, end),
        ready: false,
      } as Clip;
    })
    .filter((c) => c.duration > 1);
}

/**
 * Fallback: split the transcript into roughly equal chunks of `chunkSeconds`.
 */
export function fallbackChunks(
  segments: TranscriptSegment[],
  chunkSeconds = 60
): Clip[] {
  if (segments.length === 0) return [];
  const total = segments[segments.length - 1].end;
  const clips: Clip[] = [];
  let n = 1;
  for (let start = 0; start < total; start += chunkSeconds) {
    const end = Math.min(start + chunkSeconds, total);
    if (end - start < 5) break;
    clips.push({
      id: randomUUID(),
      title: `Clip ${n}`,
      start,
      end,
      hook: segments.find((s) => s.start >= start)?.text || '',
      score: 5,
      reason: 'Auto-generated equal-length segment (AI detection unavailable).',
      duration: Math.round(end - start),
      segments: segmentsForRange(segments, start, end),
      ready: false,
    });
    n++;
  }
  return clips;
}

/**
 * Detect viral clips from a transcript using Claude, with a chunking fallback.
 */
export async function detectClips(
  segments: TranscriptSegment[]
): Promise<{ clips: Clip[]; usedFallback: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { clips: fallbackChunks(segments), usedFallback: true };
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the transcript with timestamps (in seconds):\n\n${formatTranscript(
            segments
          )}`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );
    if (!textBlock) throw new Error('Empty response from Claude.');

    const raw = extractJsonArray(textBlock.text);
    const clips = normalizeClips(raw, segments);
    if (clips.length === 0) {
      return { clips: fallbackChunks(segments), usedFallback: true };
    }
    return { clips, usedFallback: false };
  } catch (err) {
    console.error('Claude clip detection failed, using fallback:', err);
    return { clips: fallbackChunks(segments), usedFallback: true };
  }
}
