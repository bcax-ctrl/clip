// Simple in-memory job queue with status tracking.
//
// Jobs are kept in a module-level Map that is pinned to `globalThis` so it
// survives Next.js dev hot-reloads and is shared across API route invocations
// within the same Node process. This is an MVP store — restarting the server
// clears all jobs (the generated files on disk remain).

import path from 'path';
import { randomUUID } from 'crypto';
import type { Job, JobStatus, Clip } from './types';

interface QueueState {
  jobs: Map<string, Job>;
}

const globalForQueue = globalThis as unknown as {
  __clipmineQueue?: QueueState;
};

const state: QueueState =
  globalForQueue.__clipmineQueue ?? { jobs: new Map<string, Job>() };

if (!globalForQueue.__clipmineQueue) {
  globalForQueue.__clipmineQueue = state;
}

export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/clipmine';

export function jobDir(jobId: string): string {
  return path.join(UPLOAD_DIR, 'jobs', jobId);
}

export function uploadDir(jobId: string): string {
  return path.join(jobDir(jobId), 'uploads');
}

export function transcriptDir(jobId: string): string {
  return path.join(jobDir(jobId), 'transcript');
}

export function clipsDir(jobId: string): string {
  return path.join(jobDir(jobId), 'clips');
}

export function clipDir(jobId: string, clipId: string): string {
  return path.join(clipsDir(jobId), clipId);
}

export function createJob(params: {
  fileName: string;
  fileSize: number;
  inputPath: string;
  duration?: number;
}): Job {
  const id = randomUUID();
  const now = Date.now();
  const job: Job = {
    id,
    status: 'queued',
    progress: 0,
    message: 'Queued',
    fileName: params.fileName,
    fileSize: params.fileSize,
    duration: params.duration ?? 0,
    inputPath: params.inputPath,
    clips: [],
    createdAt: now,
    updatedAt: now,
  };
  state.jobs.set(id, job);
  return job;
}

export function getJob(jobId: string): Job | undefined {
  return state.jobs.get(jobId);
}

export function listJobs(): Job[] {
  return Array.from(state.jobs.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function updateJob(
  jobId: string,
  patch: Partial<Omit<Job, 'id' | 'createdAt'>>
): Job | undefined {
  const job = state.jobs.get(jobId);
  if (!job) return undefined;
  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}

export function setStatus(
  jobId: string,
  status: JobStatus,
  message?: string,
  progress?: number
): void {
  const patch: Partial<Job> = { status };
  if (message !== undefined) patch.message = message;
  if (progress !== undefined) patch.progress = progress;
  updateJob(jobId, patch);
}

export function setError(jobId: string, error: string): void {
  updateJob(jobId, { status: 'error', error, message: error });
}

export function setClips(jobId: string, clips: Clip[]): void {
  updateJob(jobId, { clips });
}

export function getClip(jobId: string, clipId: string): Clip | undefined {
  const job = state.jobs.get(jobId);
  return job?.clips.find((c) => c.id === clipId);
}

export function updateClip(
  jobId: string,
  clipId: string,
  patch: Partial<Clip>
): void {
  const job = state.jobs.get(jobId);
  if (!job) return;
  const clip = job.clips.find((c) => c.id === clipId);
  if (!clip) return;
  Object.assign(clip, patch);
  job.updatedAt = Date.now();
}
