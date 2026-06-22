// Client-safe caption frames for the LIVE PREVIEW overlay.
// Mirrors the chunking in lib/ass.ts so the preview matches the burned result.

import { Transcript, Word, SubtitleStyleId } from "./types";

export interface CaptionLine {
  start: number;
  end: number;
  /** words for per-word highlight (karaoke); single-element for others. */
  words: Word[];
  /** pre-joined display text (clean/hormozi). */
  text: string;
}

function chunk(words: Word[], maxWords: number, gapBreak: number): Word[][] {
  const lines: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    if (cur.length >= maxWords) {
      lines.push(cur);
      cur = [];
    } else if (cur.length && w.start - cur[cur.length - 1].end > gapBreak) {
      lines.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

export function buildCaptionLines(
  t: Transcript,
  style: SubtitleStyleId
): CaptionLine[] {
  if (style === "none") return [];

  if (style === "clean") {
    const src =
      t.segments.length && t.segments.some((s) => s.text)
        ? t.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
        : chunk(t.words, 7, 0.6).map((l) => ({
            start: l[0].start,
            end: l[l.length - 1].end,
            text: l.map((w) => w.text).join(" "),
          }));
    return src
      .filter((s) => s.text.trim())
      .map((s) => ({
        start: s.start,
        end: Math.max(s.end, s.start + 0.4),
        words: [],
        text: s.text.trim(),
      }));
  }

  const maxWords = style === "hormozi" ? 2 : 4;
  const gap = style === "hormozi" ? 0.45 : 0.6;
  return chunk(t.words, maxWords, gap).map((line) => {
    const text = line.map((w) => w.text).join(" ");
    return {
      start: line[0].start,
      end: line[line.length - 1].end + 0.05,
      words: line,
      text: style === "hormozi" ? text.toUpperCase() : text,
    };
  });
}

/** Find the caption line active at time t (binary-ish linear scan). */
export function activeLine(lines: CaptionLine[], t: number): CaptionLine | null {
  for (const l of lines) {
    if (t >= l.start && t < l.end) return l;
  }
  return null;
}

/** Within a karaoke line, which word index is currently being spoken. */
export function activeWordIndex(line: CaptionLine, t: number): number {
  for (let i = 0; i < line.words.length; i++) {
    const start = line.words[i].start;
    const end = i < line.words.length - 1 ? line.words[i + 1].start : line.end;
    if (t >= start && t < end) return i;
  }
  return -1;
}

/**
 * After editing the flat `words` array (typo fixes / deletions), rebuild each
 * segment's words + text from the (unchanged) segment time boundaries so the
 * "Clean Caption" style and the flat list stay consistent.
 */
export function reconcileTranscript(t: Transcript): Transcript {
  const segments = t.segments
    .map((seg) => {
      const words = t.words.filter(
        (w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05
      );
      return { ...seg, words, text: words.map((w) => w.text).join(" ") };
    })
    .filter((seg) => seg.words.length > 0);
  return { ...t, segments };
}
