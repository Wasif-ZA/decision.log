export type SyncJobStatus = 'syncing' | 'complete' | 'error'

export interface SyncJob {
  status: SyncJobStatus
  progress: number
  startedAt: string
  completedAt?: string
}

const JOB_TTL_MS = 60 * 60 * 1000
const syncJobs = new Map<string, SyncJob>()

export function setSyncJob(jobId: string, job: SyncJob) {
  syncJobs.set(jobId, job)
}

export function getSyncJob(jobId: string): SyncJob | undefined {
  return syncJobs.get(jobId)
}

export function findRunningJobForRepo(repoId: string): string | null {
  for (const [jobId, job] of syncJobs.entries()) {
    if (job.status === 'syncing' && jobId.startsWith(`sync-${repoId}-`)) {
      return jobId
    }
  }

  return null
}

export function pruneOldSyncJobs(now = Date.now()) {
  for (const [jobId, job] of syncJobs.entries()) {
    const completedAt = job.completedAt ? Date.parse(job.completedAt) : null
    if (completedAt !== null && now - completedAt > JOB_TTL_MS) {
      syncJobs.delete(jobId)
    }
  }
}
