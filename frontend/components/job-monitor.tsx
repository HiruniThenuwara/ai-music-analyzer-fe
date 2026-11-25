"use client";

import { useEffect, useState } from "react";
import { elapsedSeconds, formatElapsed, isActiveJob, isCancelling, jobTitle, stateLabel, type Job, type JobDetail } from "@/lib/jobs";
import { Alert, Card, EmptyState } from "./workstation-ui";

export function JobMonitor({ job, detail, stale, cancelling, onCancel }: {
  job: Job;
  detail?: JobDetail;
  stale: boolean;
  cancelling: boolean;
  onCancel: (id: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const active = isActiveJob(job);
  useEffect(() => {
    if (!active || stale) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, [active, stale]);

  const progress = detail?.progress;
  const elapsed = elapsedSeconds(job, now, stale);
  return <Card title={jobTitle(job)}>
    {stale && <p>Showing the last confirmed job status.</p>}
    <dl className="sample-meta">
      <dt>Status</dt><dd role="status"><strong>{isCancelling(job) ? "Cancelling" : stateLabel[job.state]}</strong></dd>
      <dt>Configuration</dt><dd>{job.configuration}</dd>
      <dt>Elapsed</dt><dd>{elapsed === null ? "Unknown" : formatElapsed(elapsed)}</dd>
      <dt>Job ID</dt><dd><code>{job.id}</code></dd>
    </dl>
    {progress && <div className="job-progress">
      <progress aria-label="Reported work completed" max={progress.total} value={progress.completed} />
      <span>{progress.completed} / {progress.total} {progress.unit} ({Math.floor(100 * progress.completed / progress.total)}%)</span>
    </div>}
    {(job.state === "failed" || job.state === "interrupted") ? <Alert title={job.state === "interrupted" ? "Job interrupted" : "Job failed"} error>
      {job.message && <p>{job.message}</p>}
      {job.exit_code !== null && <p>Worker exit code <code>{job.exit_code}</code></p>}
    </Alert> : job.message && <p>{job.message}</p>}
    {active && <button type="button" disabled={stale || cancelling || isCancelling(job)} onClick={() => onCancel(job.id)}>
      {isCancelling(job) ? "Cancellation requested" : cancelling ? "Requesting cancellation..." : "Cancel job"}
    </button>}
    <details open>
      <summary>Job logs</summary>
      {!detail ? <p>Job logs are waiting for a confirmed response.</p>
        : !detail.stdout_tail && !detail.stderr_tail ? <EmptyState title="No log entries yet">New output appears as the backend reports it.</EmptyState>
        : <>
          {detail.stdout_tail && <><h3>Output</h3><pre className="job-logs">{detail.stdout_tail}</pre></>}
          {detail.stderr_tail && <><h3>Errors</h3><pre className="job-logs">{detail.stderr_tail}</pre></>}
        </>}
    </details>
  </Card>;
}
