import { readApiError } from "./contracts";
import { isJob, isJobDetail, isJobList, type Job, type JobDetail, type JobList, type JobStart } from "./jobs";

export class JobRequestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

async function read<T>(path: string, validate: (value: unknown) => value is T, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = readApiError(data)?.error;
    throw new JobRequestError(detail?.code ?? "request_failed", detail?.message ?? `Job request failed (HTTP ${response.status}).`);
  }
  if (!validate(data)) throw new JobRequestError("invalid_job_response", "The backend did not confirm the job response.");
  return data;
}

export function listJobs(signal?: AbortSignal): Promise<JobList> {
  return read("/api/jobs", isJobList, { signal });
}

export function readJob(id: string, signal?: AbortSignal): Promise<JobDetail> {
  return read(`/api/jobs/${encodeURIComponent(id)}`, isJobDetail, { signal });
}

export function startJob(spec: JobStart): Promise<Job> {
  return read("/api/jobs", isJob, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spec),
  });
}

export function cancelJob(id: string): Promise<Job> {
  return read(`/api/jobs/${encodeURIComponent(id)}/cancel`, isJob, { method: "POST" });
}
