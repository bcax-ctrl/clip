// Shared TypeScript types for ClipMine.

export type JobStatus =
  | 'queued'
  | 'transcribing'
  | 'analyzing'
  | 'clipping'
  | 'done'
  | 'error';

/** A single timestamped transcript segment from Whisper. */
export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/** A viral clip candidate detected by Claude (or the fallback chunker). */
export interface Clip {
  id: string;
  title: string;
  start: number; // seconds
  end: number; // seconds
  hook: string;
  score: number; // 1-10 viral potential
  reason: string;
  duration: number; // seconds, derived
  /** Subtitle segments that fall within this clip's time range. */
  segments: TranscriptSegment[];
  /** Whether the final (V11) processed file has been generated. */
  ready: boolean;
}

/** The 11-track layer outputs available for a clip. */
export interface ClipLayers {
  v1_raw?: string;
  v2_base?: string;
  v4_bottomvignette?: string;
  v5_vignette?: string;
  v6_lightleak?: string;
  v7_dust?: string;
  v8_grain?: string;
  v9_grade1?: string;
  v10_grade2?: string;
  v11_final?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  /** Human-readable detail about the current step. */
  message: string;
  fileName: string;
  fileSize: number; // bytes
  duration: number; // seconds (0 if unknown)
  inputPath: string;
  clips: Clip[];
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/** Shape returned by GET /api/jobs/[jobId]. */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  message: string;
  fileName: string;
  duration: number;
  clips: Clip[];
  error?: string;
}

export type LayerKey = keyof ClipLayers;
