// Shared types for ClipForge job pipeline.

export type JobStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "rendering"
  | "done"
  | "error";

export type SubtitleStyleId = "karaoke" | "clean" | "hormozi" | "none";

export type MusicCategory = "energetic" | "chill" | "dramatic" | "funny";

/** A single word with its start/end timestamp (seconds). */
export interface Word {
  text: string;
  start: number;
  end: number;
}

/** A whisper segment (sentence-ish) holding words. */
export interface Segment {
  start: number;
  end: number;
  text: string;
  words: Word[];
}

export interface Transcript {
  language?: string;
  duration?: number;
  segments: Segment[];
  /** Flattened words for convenience. */
  words: Word[];
}

export interface MusicSelection {
  category: MusicCategory;
  /** filename inside /public/music/<category>/ */
  file: string;
  /** 0..1 manual music volume (applied before ducking). */
  volume: number;
  /** whether to duck music under speech. */
  duck: boolean;
}

export interface CropSettings {
  /** target aspect: only 9:16 supported for now. */
  aspect: "9:16";
  /**
   * Horizontal focus offset, -1..1.
   * -1 = crop window flush left, 0 = center, 1 = flush right.
   */
  offsetX: number;
}

export interface HookSettings {
  text: string;
  /** seconds the hook stays on screen from the start. */
  durationSec: number;
}

export interface RenderOptions {
  subtitleStyle: SubtitleStyleId;
  crop: CropSettings;
  hook: HookSettings;
  music?: MusicSelection;
  /** optional trim of the source before everything else. */
  trim?: { start: number; end: number };
}

export interface RenderProgress {
  percent: number;
  /** seconds of output produced so far. */
  outTimeSec: number;
  /** ffmpeg speed string, e.g. "1.8x". */
  speed?: string;
  done: boolean;
  error?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  /** original filename or YouTube URL. */
  sourceName: string;
  source: "upload" | "youtube";
  sourceUrl?: string;
  /** seconds; filled after probe/transcription. */
  durationSec?: number;
  hasSource: boolean;
  hasTranscript: boolean;
  hasOutput: boolean;
  renderOptions?: RenderOptions;
  progress?: RenderProgress;
  error?: string;
}
