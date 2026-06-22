import { Transcript, ClipSuggestion } from "./types";

/**
 * Heuristic "viral moment" detector — no ML, purely from the transcript.
 *
 * Idea: slide a target-length window whose start/end snap to natural pauses,
 * then score each window by speech density + emphasis cues (?, !, numbers).
 * Returns the top non-overlapping windows.
 */
export function suggestClips(
  t: Transcript,
  opts: { targetSec?: number; maxClips?: number } = {}
): ClipSuggestion[] {
  const target = opts.targetSec ?? 30;
  const maxClips = opts.maxClips ?? 5;
  const words = t.words;
  if (words.length < 5) return [];

  // Natural start points: first word + words that follow a clear pause.
  const PAUSE = 0.55;
  const startIdxs: number[] = [0];
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].end > PAUSE) startIdxs.push(i);
  }

  // Punctuation/number cues from segment text (whisper puts them on segments).
  const cueRanges = t.segments
    .filter((s) => /[?!]|\d/.test(s.text))
    .map((s) => ({ start: s.start, end: s.end }));
  const hasCue = (start: number, end: number) =>
    cueRanges.some((c) => c.start < end && c.end > start);

  const candidates: ClipSuggestion[] = [];
  for (const si of startIdxs) {
    const start = words[si].start;
    // Find an end word that reaches ~target length, snapping to a pause.
    let ei = si;
    while (ei < words.length - 1 && words[ei].end - start < target) ei++;
    // Nudge end to the nearest following pause for a clean cut.
    while (
      ei < words.length - 1 &&
      words[ei + 1].start - words[ei].end < PAUSE &&
      words[ei].end - start < target * 1.4
    ) {
      ei++;
    }
    const end = words[ei].end;
    const dur = end - start;
    if (dur < Math.min(8, target * 0.4)) continue;

    const count = ei - si + 1;
    const density = count / dur; // words/sec
    // Score: reward density, length close to target, and emphasis cues.
    const lenFit = 1 - Math.min(1, Math.abs(dur - target) / target);
    let score = density * 10 + lenFit * 4;
    if (hasCue(start, end)) score += 3;

    const preview = words
      .slice(si, Math.min(si + 12, ei + 1))
      .map((w) => w.text)
      .join(" ");
    candidates.push({ start, end, score, preview });
  }

  // Greedily pick top-scoring, non-overlapping windows.
  candidates.sort((a, b) => b.score - a.score);
  const chosen: ClipSuggestion[] = [];
  for (const c of candidates) {
    if (chosen.length >= maxClips) break;
    const overlaps = chosen.some((x) => c.start < x.end && c.end > x.start);
    if (!overlaps) chosen.push(c);
  }
  // Present in chronological order.
  return chosen.sort((a, b) => a.start - b.start);
}
