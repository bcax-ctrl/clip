import { Transcript, Word, SubtitleStyleId } from "./types";

// Output canvas (matches final 1080x1920 render).
export const PLAY_W = 1080;
export const PLAY_H = 1920;

/** Convert seconds -> ASS timestamp H:MM:SS.cc (centiseconds). */
export function assTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const cs = Math.round(sec * 100);
  const centi = cs % 100;
  const totalSec = Math.floor(cs / 100);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${h}:${pad(m)}:${pad(s)}.${pad(centi)}`;
}

/**
 * Convert #RRGGBB (+ optional 0..1 alpha) to ASS &HAABBGGRR.
 * ASS alpha is inverted: 00 = opaque, FF = transparent.
 */
export function assColor(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const r = h.slice(0, 2);
  const g = h.slice(2, 4);
  const b = h.slice(4, 6);
  const a = Math.round((1 - Math.min(Math.max(alpha, 0), 1)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

/** Escape user text so it can't break ASS override syntax. */
function escapeText(t: string): string {
  return t
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r?\n/g, " \\N ")
    .trim();
}

export interface StylePreset {
  id: SubtitleStyleId;
  label: string;
  description: string;
  /** Font family that must be available to libass (system or /public/fonts). */
  font: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "karaoke",
    label: "Karaoke Bold",
    description:
      "Kata aktif di-highlight kuning + membesar. Font tebal, posisi tengah-bawah.",
    font: "Montserrat",
  },
  {
    id: "clean",
    label: "Clean Caption",
    description:
      "Subtitle per kalimat pendek dengan background semi-transparan di bawah.",
    font: "Poppins",
  },
  {
    id: "hormozi",
    label: "Hormozi Style",
    description:
      "HURUF KAPITAL, 1-2 kata per frame, kontras tinggi, outline tebal, animasi pop.",
    font: "Montserrat",
  },
];

function header(font: string, styles: string[]): string {
  return [
    "[Script Info]",
    "Title: ClipForge",
    "ScriptType: v4.00+",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${PLAY_W}`,
    `PlayResY: ${PLAY_H}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ...styles,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");
}

function dialogue(start: number, end: number, text: string, style = "Default"): string {
  return `Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${text}`;
}

/** Break words into lines: max `maxWords`, never crossing big time gaps. */
function chunkWords(words: Word[], maxWords: number, gapBreak = 0.6): Word[][] {
  const lines: Word[][] = [];
  let cur: Word[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
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

// ---------------------------------------------------------------------------
// Preset generators
// ---------------------------------------------------------------------------

function genKaraoke(t: Transcript): string {
  const styleLine =
    "Style: Default,Montserrat,96,&H00FFFFFF,&H000000FF,&H00101010,&H64000000,1,0,0,0,100,100,2,0,1,5,3,2,80,80,360,1";
  const events: string[] = [];
  const lines = chunkWords(t.words, 4);

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const w = line[i];
      // Keep the line continuously on screen: end at next word's start.
      const start = w.start;
      const end = i < line.length - 1 ? line[i + 1].start : w.end + 0.05;
      // Build the line text with the active word highlighted + popped.
      const parts = line.map((lw, j) => {
        const word = escapeText(lw.text);
        if (j === i) {
          return `{\\c&H00F0FF&\\fscx118\\fscy118\\b1\\t(0,90,\\fscx112\\fscy112)}${word}{\\r}`;
        }
        return word;
      });
      events.push(dialogue(start, end, parts.join(" ")));
    }
  }
  return `${header("Montserrat", [styleLine])}\n${events.join("\n")}\n`;
}

function genHormozi(t: Transcript): string {
  const styleLine =
    "Style: Default,Montserrat,140,&H0000F0FF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,9,0,5,60,60,0,1";
  const events: string[] = [];
  const lines = chunkWords(t.words, 2, 0.45);

  for (const line of lines) {
    const start = line[0].start;
    const end = line[line.length - 1].end + 0.05;
    const text = escapeText(line.map((w) => w.text).join(" ")).toUpperCase();
    // Pop-in: start a bit small + slightly low, settle to full size/center.
    const body = `{\\fscx62\\fscy62\\t(0,120,\\fscx100\\fscy100)}${text}`;
    events.push(dialogue(start, end, body));
  }
  return `${header("Montserrat", [styleLine])}\n${events.join("\n")}\n`;
}

function genClean(t: Transcript): string {
  // BorderStyle=3 => opaque box drawn in OutlineColour (we make it ~70% black).
  const styleLine =
    "Style: Default,Poppins,72,&H00FFFFFF,&H000000FF,&H4D000000,&H00000000,0,0,0,0,100,100,0,0,3,18,0,2,90,90,150,1";
  const events: string[] = [];

  // Prefer real sentence segments; fall back to word chunks if no segments.
  const source =
    t.segments.length && t.segments.some((s) => s.text)
      ? t.segments.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        }))
      : chunkWords(t.words, 7).map((line) => ({
          start: line[0].start,
          end: line[line.length - 1].end,
          text: line.map((w) => w.text).join(" "),
        }));

  for (const s of source) {
    const text = escapeText(s.text);
    if (!text) continue;
    events.push(dialogue(s.start, Math.max(s.end, s.start + 0.4), text));
  }
  return `${header("Poppins", [styleLine])}\n${events.join("\n")}\n`;
}

/** Generate a full .ass document for the given transcript + style. */
export function generateAss(t: Transcript, style: SubtitleStyleId): string {
  switch (style) {
    case "karaoke":
      return genKaraoke(t);
    case "hormozi":
      return genHormozi(t);
    case "clean":
      return genClean(t);
    case "none":
    default:
      return `${header("Poppins", [
        "Style: Default,Poppins,72,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,3,0,2,90,90,150,1",
      ])}\n`;
  }
}
