import { Job, JobStatus } from './types'

// Persist the job store on globalThis so it survives module re-instantiation
// across separate route bundles and HMR reloads in Next.js dev mode.
// Without this, POST /api/jobs and GET /api/jobs/[id] each get their own
// Map instance and jobs appear to "vanish" right after creation.
const globalForJobs = globalThis as unknown as { __clipmineJobs?: Map<string, Job> }
const jobs: Map<string, Job> = globalForJobs.__clipmineJobs ?? new Map<string, Job>()
if (!globalForJobs.__clipmineJobs) globalForJobs.__clipmineJobs = jobs

export function createJob(partial: Omit<Job, 'status' | 'progress' | 'progressStep' | 'clips' | 'createdAt' | 'updatedAt'>): Job {
  const job: Job = {
    ...partial,
    status: 'queued',
    progress: 0,
    progressStep: 'Queued',
    clips: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  jobs.set(job.id, job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id)
  if (!job) return undefined
  const updated = { ...job, ...updates, updatedAt: Date.now() }
  jobs.set(id, updated)
  return updated
}

export function setJobStatus(id: string, status: JobStatus, progress: number, progressStep: string): void {
  updateJob(id, { status, progress, progressStep })
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt)
}
