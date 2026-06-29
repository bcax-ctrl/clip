export type JobStatus = 'queued' | 'transcribing' | 'analyzing' | 'clipping' | 'done' | 'error'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface Clip {
  id: string
  title: string
  start: number
  end: number
  hook: string
  score: number
  reason: string
  duration: number
  thumbnailUrl?: string
  layers: LayerFiles
}

export interface LayerFiles {
  v1_raw?: string
  v2_base?: string
  v4_bottomvignette?: string
  v5_vignette?: string
  v6_lightleak?: string
  v7_dust?: string
  v8_grain?: string
  v9_grade1?: string
  v10_grade2?: string
  v11_final?: string
}

export interface Job {
  id: string
  status: JobStatus
  progress: number
  progressStep: string
  inputPath: string
  outputDir: string
  transcript?: TranscriptSegment[]
  clips: Clip[]
  error?: string
  createdAt: number
  updatedAt: number
  fileName: string
  fileSize: number
  duration?: number
}

export type LayerKey = keyof LayerFiles

export const LAYER_LABELS: Record<string, string> = {
  v1_raw: 'V1 Raw',
  v2_base: 'V2 Base Footage',
  v4_bottomvignette: 'V4 + Bottom Vignette',
  v5_vignette: 'V5 + Full Vignette',
  v6_lightleak: 'V6 + Light Leak',
  v7_dust: 'V7 + Film Dust',
  v8_grain: 'V8 + Grain',
  v9_grade1: 'V9 + Color Grade 1',
  v10_grade2: 'V10 + Color Grade 2 (Cinematic)',
  v11_final: 'V11 Final (+ Subtitles)',
}
