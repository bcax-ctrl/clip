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

/** Color-grade "look" presets to make clips pop. */
export type FilterLook = "none" | "vivid" | "warm" | "cool" | "mono";

/** Extra viral-oriented effects baked at render time. */
export interface ViralEffects {
  /** color grade preset. */
  look: FilterLook;
  /** animated retention progress bar at the bottom. */
  progressBar: boolean;
  /** call-to-action shown in the last few seconds. */
  endCta?: { text: string; durationSec: number };
}

export interface RenderOptions {
  subtitleStyle: SubtitleStyleId;
  crop: CropSettings;
  hook: HookSettings;
  music?: MusicSelection;
  /** optional trim of the source before everything else. */
  trim?: { start: number; end: number };
  /** optional viral effects (color grade, progress bar, end CTA). */
  effects?: ViralEffects;
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
  /** results of a multi-clip batch render (Phase 6). */
  clips?: ClipResult[];
  error?: string;
}

/** A requested clip segment (source seconds) for batch rendering. */
export interface ClipSpec {
  id: string;
  start: number;
  end: number;
  label?: string;
}

export type ClipStatus = "pending" | "rendering" | "done" | "error";

/** Render result for one clip in a batch. */
export interface ClipResult {
  id: string;
  start: number;
  end: number;
  label?: string;
  status: ClipStatus;
  /** output filename inside the job dir, e.g. output-<id>.mp4 */
  outputFile?: string;
  percent?: number;
  error?: string;
}

/** A suggested viral moment derived from the transcript. */
export interface ClipSuggestion {
  start: number;
  end: number;
  /** heuristic score (higher = more promising). */
  score: number;
  /** short text preview of what's said. */
  preview: string;
}
