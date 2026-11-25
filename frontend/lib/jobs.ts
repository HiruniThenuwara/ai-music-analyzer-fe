export const kinds = ["validate_dataset", "prepare_dataset"] as const;
export type JobKind = (typeof kinds)[number];
export const stateLabel = {
  queued: "Queued", running: "Running", succeeded: "Succeeded",
  failed: "Failed", cancelled: "Cancelled", interrupted: "Interrupted",
} as const;

export type Job = {
  id: string;
  kind: JobKind;
  configuration: string;
  state: keyof typeof stateLabel;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  cancel_requested_at: string | null;
  exit_code: number | null;
  message: string | null;
};
export type JobDetail = Job & {
  progress?: { completed: number; total: number; unit: string } | null;
  stdout_tail: string;
  stderr_tail: string;
};
export type DatasetJobConfiguration = { id: string; exploratory: boolean };
export type JobList = { jobs: Job[]; configurations: DatasetJobConfiguration[] };
export type JobStart = Pick<Job, "kind" | "configuration">;

export function isActiveJob(job: Job) {
  return job.state === "queued" || job.state === "running";
}

export function isCancelling(job: Job) {
  return isActiveJob(job) && job.cancel_requested_at !== null;
}

export function jobTitle(job: Pick<Job, "kind">) {
  return job.kind === "validate_dataset" ? "Dataset validation" : "Dataset preparation";
}

export function elapsedSeconds(job: Job, now: number, stale = false): number | null {
  if (job.state === "interrupted" || (stale && isActiveJob(job))) return null;
  if (!job.started_at) return 0;
  const end = job.finished_at ? Date.parse(job.finished_at) : now;
  return Math.max(0, Math.floor((end - Date.parse(job.started_at)) / 1000));
}

export function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return `${hours ? `${hours}h ` : ""}${minutes}m ${seconds % 60}s`;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function timestamp(value: unknown) {
  return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)));
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function isJobId(value: string) {
  return /^job-[a-f0-9]{32}$/.test(value);
}
export function isJobConfigurationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,62}$/.test(value);
}

export function isJob(value: unknown): value is Job {
  return object(value) && typeof value.id === "string" && isJobId(value.id)
    && isJobConfigurationId(value.configuration) && kinds.some((kind) => kind === value.kind)
    && typeof value.state === "string" && Object.hasOwn(stateLabel, value.state)
    && typeof value.created_at === "string" && timestamp(value.created_at)
    && timestamp(value.started_at) && timestamp(value.finished_at) && timestamp(value.cancel_requested_at)
    && (value.exit_code === null || (typeof value.exit_code === "number" && Number.isSafeInteger(value.exit_code)))
    && (value.message === null || typeof value.message === "string");
}
export function isJobDetail(value: unknown): value is JobDetail {
  if (!object(value)) return false;
  const { progress, stdout_tail, stderr_tail } = value;
  return isJob(value) && typeof stdout_tail === "string" && typeof stderr_tail === "string"
    && (progress == null || (object(progress) && count(progress.completed) && count(progress.total)
        && progress.total > 0 && progress.completed <= progress.total && typeof progress.unit === "string"));
}
export function isJobStart(value: unknown): value is JobStart {
  return object(value) && Object.keys(value).length === 2 && isJobConfigurationId(value.configuration)
    && kinds.some((kind) => kind === value.kind);
}

export function isJobList(value: unknown): value is JobList {
  return object(value) && Array.isArray(value.jobs) && value.jobs.every(isJob)
    && isDatasetJobConfigurations(value.configurations);
}
export function isDatasetJobConfigurations(value: unknown): value is DatasetJobConfiguration[] {
  return Array.isArray(value) && value.every((entry) =>
    object(entry) && isJobConfigurationId(entry.id) && typeof entry.exploratory === "boolean");
}
