import { Job, JobStatus } from './types'

const jobs = new Map<string, Job>()

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
