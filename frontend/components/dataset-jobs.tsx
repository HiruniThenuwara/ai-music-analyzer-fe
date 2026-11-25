"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelJob, listJobs, readJob, startJob } from "@/lib/job-api";
import { isActiveJob, jobTitle, stateLabel, type Job, type JobList, type JobStart } from "@/lib/jobs";
import { JobMonitor } from "./job-monitor";
import { Alert, Card, EmptyState } from "./workstation-ui";

const historyKey = ["managed-jobs"] as const;

export function DatasetJobs() {
  const client = useQueryClient();
  const [selection, setSelection] = useState("");
  const [policy, setPolicy] = useState("");
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => listJobs(signal),
    retry: false,
    refetchInterval: (query) => query.state.data?.jobs.some(isActiveJob) ? 1000 : 5000,
  });
  const jobs = history.data?.jobs ?? [];
  const active = jobs.find(isActiveJob);
  const job = jobs.find((entry) => entry.id === selection) ?? active ?? jobs[0];
  const configuration = history.data?.configurations.find((option) => option.id === policy)
    ?? history.data?.configurations[0];
  const detail = useQuery({
    queryKey: ["managed-job", job?.id, job?.state],
    queryFn: ({ signal }) => readJob(job!.id, signal),
    enabled: !!job,
    retry: false,
    refetchInterval: job && isActiveJob(job) ? 1000 : false,
  });

  async function acceptJob(updated: Job) {
    await client.cancelQueries({ queryKey: historyKey });
    client.setQueryData<JobList>(historyKey, (previous) => {
      if (!previous) return previous;
      const known = previous.jobs.some((entry) => entry.id === updated.id);
      return {
        ...previous,
        jobs: known ? previous.jobs.map((entry) => entry.id === updated.id ? updated : entry) : [updated, ...previous.jobs],
      };
    });
    void client.invalidateQueries({ queryKey: historyKey });
    void client.invalidateQueries({ queryKey: ["managed-job", updated.id] });
  }

  const launch = useMutation({
    mutationFn: startJob,
    onSuccess: async (started) => {
      setSelection(started.id);
      await acceptJob(started);
    },
    onError: () => { void client.invalidateQueries({ queryKey: historyKey }); },
  });
  const cancel = useMutation({
    mutationFn: cancelJob,
    onSuccess: acceptJob,
    onError: (_, id) => {
      void client.invalidateQueries({ queryKey: historyKey });
      void client.invalidateQueries({ queryKey: ["managed-job", id] });
    },
  });
  function start(kind: JobStart["kind"]) {
    if (!configuration) return;
    cancel.reset();
    launch.mutate({ configuration: configuration.id, kind });
  }

  return <div className="system-stack">
    <Card title="Validate and prepare datasets">
      <p>Import a licensed source before starting a job. Validation decodes the indexed audio. Preparation builds a segment manifest with the selected split policy.</p>
      {history.isPending && <p role="status">Loading job history.</p>}
      {history.isError && <Alert title="Job history unavailable" error><p>{history.error.message}</p></Alert>}
      {history.isError && <button type="button" disabled={history.isFetching} onClick={() => void history.refetch()}>Retry job history</button>}
      {configuration && <label className="field">Split configuration
        <select value={configuration.id} onChange={(event) => setPolicy(event.currentTarget.value)}>
          {history.data?.configurations.map((option) => <option key={option.id} value={option.id}>
            {option.id} ({option.exploratory ? "exploratory" : "canonical"})
          </option>)}
        </select>
      </label>}
      {active && <p>One managed job is active. Wait for it to finish or cancel it before starting another.</p>}
      <div className="explorer-actions">
        <button type="button" disabled={!configuration || history.isError || !!active || launch.isPending}
          onClick={() => start("validate_dataset")}>Validate dataset</button>
        <button type="button" disabled={!configuration || history.isError || !!active || launch.isPending}
          onClick={() => start("prepare_dataset")}>Prepare dataset</button>
      </div>
      {launch.isPending && <p role="status">Submitting job.</p>}
      {launch.isError && <Alert title="Job could not be started" error><p>{launch.error.message}</p></Alert>}
      {history.isSuccess && !jobs.length && <EmptyState title="No managed jobs">Submitted jobs appear here and stay available after refresh.</EmptyState>}
      {job && <label className="field job-history-field">Job history
        <select value={job.id} onChange={(event) => { cancel.reset(); setSelection(event.currentTarget.value); }}>
          {jobs.map((entry) => <option key={entry.id} value={entry.id}>
            {jobTitle(entry)} | {stateLabel[entry.state]} | {new Date(entry.created_at).toLocaleString()}
          </option>)}
        </select>
      </label>}
    </Card>
    {job && <JobMonitor key={job.id} job={job} detail={detail.data} stale={history.isError}
      cancelling={cancel.isPending && cancel.variables === job.id} onCancel={(id) => cancel.mutate(id)} />}
    {cancel.isError && <Alert title="Cancellation could not be confirmed" error><p>{cancel.error.message}</p></Alert>}
    {detail.isError && <Alert title="Job logs unavailable" error>
      <p>{detail.error.message}</p>
      <button type="button" disabled={detail.isFetching} onClick={() => void detail.refetch()}>Retry job details</button>
    </Alert>}
  </div>;
}
