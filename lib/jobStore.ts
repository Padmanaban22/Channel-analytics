/**
 * Minimal in-memory job store for the asynchronous "export all uploads" flow.
 *
 * ⚠️ Production note: on Vercel, serverless instances do NOT share memory, so
 * this Map only works reliably in local dev or a single long-lived instance.
 * For production, persist job state in a durable store (e.g. Upstash Redis /
 * Vercel KV) and the generated file in Vercel Blob, then return the Blob URL.
 * The route handlers below are structured so that swap is a localized change.
 */

export type JobStatus = "pending" | "running" | "done" | "error";

export interface ExportJob {
  id: string;
  status: JobStatus;
  progress: number; // 0–100
  error?: string;
  url?: string; // set when stored in Blob
  buffer?: Buffer; // set when kept in memory (dev fallback)
  filename: string;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __exportJobs: Map<string, ExportJob> | undefined;
}

const jobs: Map<string, ExportJob> =
  globalThis.__exportJobs ?? (globalThis.__exportJobs = new Map());

export function createJob(filename: string): ExportJob {
  const id = crypto.randomUUID();
  const job: ExportJob = {
    id,
    status: "pending",
    progress: 0,
    filename,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ExportJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<ExportJob>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...patch });
}

// Light cleanup so the dev Map doesn't grow unbounded.
export function sweepJobs(maxAgeMs = 1000 * 60 * 30) {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > maxAgeMs) jobs.delete(id);
  }
}
