import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Job, JobStatus } from "./types";
import { ensureJobDir, jobFile, FILES, JOBS_DIR, safeSegment } from "./paths";

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

export function createJob(input: {
  source: Job["source"];
  sourceName: string;
  sourceUrl?: string;
}): Job {
  const id = randomUUID();
  ensureJobDir(id);
  const now = Date.now();
  const job: Job = {
    id,
    status: "uploaded",
    createdAt: now,
    updatedAt: now,
    sourceName: input.sourceName,
    source: input.source,
    sourceUrl: input.sourceUrl,
    hasSource: false,
    hasTranscript: false,
    hasOutput: false,
  };
  saveJob(job);
  return job;
}

export function getJob(jobId: string): Job | null {
  if (!safeSegment(jobId)) return null;
  return readJson<Job>(jobFile(jobId, FILES.meta));
}

export function saveJob(job: Job): Job {
  job.updatedAt = Date.now();
  ensureJobDir(job.id);
  writeJson(jobFile(job.id, FILES.meta), job);
  return job;
}

export function updateJob(jobId: string, patch: Partial<Job>): Job | null {
  const job = getJob(jobId);
  if (!job) return null;
  const next = { ...job, ...patch };
  return saveJob(next);
}

export function setStatus(jobId: string, status: JobStatus, error?: string): Job | null {
  return updateJob(jobId, { status, error });
}

export function listJobs(): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const ids = fs
    .readdirSync(JOBS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const jobs: Job[] = [];
  for (const id of ids) {
    const j = getJob(id);
    if (j) jobs.push(j);
  }
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}
