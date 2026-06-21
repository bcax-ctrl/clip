import path from "node:path";
import fs from "node:fs";

/** Root of the repo (cwd when next runs). */
export const ROOT = process.cwd();

export const JOBS_DIR = path.join(ROOT, "jobs");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const MUSIC_DIR = path.join(PUBLIC_DIR, "music");
export const FONTS_DIR = path.join(PUBLIC_DIR, "fonts");

export function jobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

export function jobFile(jobId: string, name: string): string {
  return path.join(jobDir(jobId), name);
}

/** Canonical filenames inside a job folder. */
export const FILES = {
  meta: "job.json",
  source: "source.mp4",
  audio: "audio.wav",
  transcriptRaw: "transcript.raw.json",
  transcript: "transcript.json",
  subtitle: "subtitle.ass",
  output: "output.mp4",
  renderLog: "render.log",
  progress: "progress.json",
} as const;

export function ensureJobDir(jobId: string): string {
  const dir = jobDir(jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Guard against path traversal in jobId / filenames coming from requests. */
export function safeSegment(segment: string): boolean {
  return /^[a-zA-Z0-9_.-]+$/.test(segment) && !segment.includes("..");
}
