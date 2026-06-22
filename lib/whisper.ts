import fs from "node:fs";
import { Transcript, Segment, Word } from "./types";

/**
 * Raw shape produced by `whisper ... --word_timestamps True --output_format json`.
 * Word objects use the key "word" (with a leading space) in most builds.
 */
interface RawWord {
  word?: string;
  text?: string;
  start: number;
  end: number;
  probability?: number;
}
interface RawSegment {
  start: number;
  end: number;
  text: string;
  words?: RawWord[];
}
interface RawWhisper {
  text?: string;
  language?: string;
  segments?: RawSegment[];
}

function cleanWord(raw: RawWord): string {
  return (raw.word ?? raw.text ?? "").trim();
}

/** Parse whisper JSON into a normalized Transcript with flattened words. */
export function parseWhisperJson(raw: RawWhisper): Transcript {
  const segments: Segment[] = [];
  const flat: Word[] = [];

  for (const seg of raw.segments ?? []) {
    const words: Word[] = [];
    for (const w of seg.words ?? []) {
      const text = cleanWord(w);
      if (!text) continue;
      const word: Word = {
        text,
        start: Number(w.start),
        end: Number(w.end),
      };
      // Guard against degenerate timestamps from the model.
      if (!Number.isFinite(word.start) || !Number.isFinite(word.end)) continue;
      if (word.end < word.start) word.end = word.start + 0.2;
      words.push(word);
      flat.push(word);
    }
    segments.push({
      start: Number(seg.start),
      end: Number(seg.end),
      text: (seg.text ?? "").trim(),
      words,
    });
  }

  const duration = segments.length ? segments[segments.length - 1].end : 0;

  return {
    language: raw.language,
    duration,
    segments,
    words: flat,
  };
}

export function parseWhisperFile(file: string): Transcript {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawWhisper;
  return parseWhisperJson(raw);
}
