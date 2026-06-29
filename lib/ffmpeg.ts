// FFmpeg helpers: probing, thumbnails, subtitle file generation, and the
// final subtitle burn-in. Lower-level layer filters live in ffmpegLayers.ts.

import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { TranscriptSegment } from './types';

export class FfmpegNotInstalledError extends Error {
  constructor() {
    super('Install FFmpeg: brew install ffmpeg (Mac) or sudo apt install ffmpeg (Linux)');
    this.name = 'FfmpegNotInstalledError';
  }
}

export async function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd]);
    probe.on('error', () => resolve(false));
    probe.on('close', (code) => resolve(code === 0));
  });
}

export async function ensureFfmpeg(): Promise<void> {
  if (!(await commandExists('ffmpeg'))) {
    throw new FfmpegNotInstalledError();
  }
}

/** Probe media duration in seconds (0 if unknown). */
export function getDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err || !data?.format?.duration) {
        resolve(0);
        return;
      }
      resolve(Number(data.format.duration) || 0);
    });
  });
}

/** Probe display aspect ratio; returns width/height of the first video stream. */
export function getDimensions(
  inputPath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        resolve({ width: 0, height: 0 });
        return;
      }
      const stream = data.streams?.find((s) => s.codec_type === 'video');
      resolve({
        width: Number(stream?.width) || 0,
        height: Number(stream?.height) || 0,
      });
    });
  });
}

/** Generate a JPEG thumbnail at the given timestamp. */
export function generateThumbnail(
  inputPath: string,
  outPath: string,
  atSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(Math.max(0, atSeconds))
      .frames(1)
      .videoFilters('scale=320:-1')
      .output(outPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

// ---------------------------------------------------------------------------
// Subtitle (.ass) generation — TikTok style, used by the burn-in filter.
// ---------------------------------------------------------------------------

function toAssTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${h}:${pad(m)}:${pad(sec)}.${pad(cs)}`;
}

export type SubtitleStyle = 'yellow' | 'redwhite';

/**
 * Build an ASS subtitle file for a 1080x1920 canvas from clip-relative
 * segments. Returns the written file path.
 *
 * Style A (yellow): bold yellow text, heavy black outline.
 * Style B (redwhite): bold white text with a red outline.
 */
export async function writeAssSubtitles(
  segments: TranscriptSegment[],
  outPath: string,
  style: SubtitleStyle = 'yellow'
): Promise<string> {
  // ASS colours are &HBBGGRR (AABBGGRR with alpha).
  const primary = style === 'yellow' ? '&H0000D7FF' : '&H00FFFFFF';
  const outline = style === 'yellow' ? '&H00000000' : '&H002020E0';

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,Arial,72,${primary},&H000000FF,${outline},&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,80,80,360,1

[Events]
Format: Layer, Start, End, Style, MarginL, MarginR, MarginV, Effect, Text
`;

  const escapeText = (t: string) =>
    t
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .replace(/\r?\n/g, '\\N')
      .toUpperCase()
      .trim();

  const events = segments
    .filter((s) => s.text.trim().length > 0 && s.end > s.start)
    .map(
      (s) =>
        `Dialogue: 0,${toAssTime(s.start)},${toAssTime(s.end)},TikTok,,0,0,0,,${escapeText(
          s.text
        )}`
    )
    .join('\n');

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, header + events + '\n', 'utf-8');
  return outPath;
}
