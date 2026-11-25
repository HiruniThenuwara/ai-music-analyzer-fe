"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { readDatasetJson } from "@/lib/dataset-api";
import {
  explorerPath, isExplorerCatalog, isExplorerPage, manifestPath, searchPath,
  type ExplorerCatalog, type Filters, type ManifestChoice, type ManifestReport, type Sample,
} from "@/lib/explorer";
import { Alert, Card, DataTable, EmptyState } from "./workstation-ui";
import { SampleAudio } from "./sample-audio";

const initialFilters: Filters = { filename: "", instrument: "", split: "", page: 1 };

function CounterTable({ title, values }: { title: string; values: Record<string, number> }) {
  return <DataTable caption={title} headers={["Category", "Sample rows"]} rows={
    Object.entries(values).map(([key, value]) => ({ key, cells: [key, value.toLocaleString("en-US")] }))
  } />;
}

function Report({ report }: { report: ManifestReport }) {
  return <Card title="Manifest report">
    <p><strong>{report.name}</strong> ({report.release}) | {report.configuration}</p>
    <p>Split status <strong>{report.status === "canonical" ? "Canonical" : "Exploratory"}</strong></p>
    <p>{report.status_reason}</p>
    <p>{report.examples.toLocaleString("en-US")} sample rows in this manifest. Configurations can overlap, so counts are shown per manifest.</p>
    <p>Source folder <code>{report.path}</code></p>
    <details>
      <summary>Manifest index checksum</summary>
      <p><code>{report.index_sha256}</code></p>
    </details>
    <div className="explorer-counts">
      <CounterTable title="Manifest split counts" values={report.split_counts} />
      <CounterTable title="Manifest positive label counts" values={report.label_counts} />
    </div>
  </Card>;
}

function SampleDetails({ manifest, sample, index, seconds }: {
  manifest: ManifestChoice; sample: Sample; index: string; seconds: number;
}) {
  const url = `${manifestPath(manifest)}/${sample.id}/audio?index=${index}`;
  return <Card title={sample.filename}>
    <dl className="sample-meta">
      <dt>Sample ID</dt><dd><code>{sample.id}</code></dd>
      <dt>Audio path</dt><dd><code>{sample.audio_path}</code></dd>
      <dt>MIDI path</dt><dd>{sample.midi_path ? <code>{sample.midi_path}</code> : "None indexed"}</dd>
      <dt>Split</dt><dd>{sample.split}</dd>
      <dt>Group</dt><dd>{sample.group}</dd>
      <dt>Source annotations</dt><dd>{sample.source_labels.join(", ") || "None indexed"}</dd>
      <dt>Positive instrument labels</dt><dd>{sample.instruments.join(", ") || "None indexed"}</dd>
    </dl>
    <SampleAudio key={url} url={url} seconds={seconds} />
  </Card>;
}

function ManifestExplorer({ manifest, catalog }: { manifest: ManifestChoice; catalog: ExplorerCatalog }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selected, setSelected] = useState<string | null>(null);
  const url = searchPath(manifest, filters);
  const query = useQuery({
    queryKey: ["dataset-manifest", url],
    queryFn: ({ signal }) => readDatasetJson(url, isExplorerPage, { signal }),
    retry: false,
  });

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setSelected(null);
    setFilters({
      filename: String(fields.get("filename") ?? "").trim(),
      instrument: String(fields.get("instrument") ?? ""),
      split: String(fields.get("split") ?? ""),
      page: 1,
    });
  }

  function changePage(page: number) {
    setSelected(null);
    setFilters((current) => ({ ...current, page }));
  }

  const data = query.isSuccess ? query.data : undefined;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const sample = data?.samples.find((item) => item.id === selected);

  return <>
    <Card title="Sample filters">
      <form className="explorer-filters" onSubmit={apply} onReset={() => {
        setSelected(null);
        setFilters(initialFilters);
      }}>
        <label className="field">Filename
          <input name="filename" type="search" maxLength={200} />
        </label>
        <label className="field">Instrument
          <select name="instrument"><option value="">All instruments</option>
            {catalog.instruments.map((instrument) => <option key={instrument}>{instrument}</option>)}
          </select>
        </label>
        <label className="field">Split
          <select name="split"><option value="">All splits</option>
            {catalog.splits.map((split) => <option key={split}>{split}</option>)}
          </select>
        </label>
        <div className="explorer-actions">
          <button type="submit">Apply filters</button><button type="reset">Clear filters</button>
        </div>
      </form>
    </Card>
    {query.isPending && <p role="status">Loading manifest samples.</p>}
    {query.isError && <Alert title="Manifest unavailable" error>
      <p>{query.error.message}</p>
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry manifest</button>
    </Alert>}
    {data && <>
      <Report report={data.report} />
      <Card title="Matching samples">
        <p role="status">{data.total.toLocaleString("en-US")} matching sample rows</p>
        <CounterTable title="Positive label counts across matching rows" values={data.label_counts} />
        {!data.samples.length ? <EmptyState title="No samples on this page">
          {data.total ? "Move to an earlier page to view these results." : "Change the filters to find more samples."}
        </EmptyState> : <DataTable caption="Sample metadata" headers={["Filename", "Split", "Positive labels", "Preview"]} rows={
          data.samples.map((row) => ({ key: row.id, cells: [
            row.filename, row.split, row.instruments.join(", ") || "None indexed",
            <button type="button" aria-pressed={selected === row.id} aria-label={`Inspect ${row.filename}`}
              onClick={() => setSelected(selected === row.id ? null : row.id)}>Inspect</button>,
          ] }))
        } />}
        <div className="explorer-actions">
          <button type="button" disabled={data.page <= 1} onClick={() => changePage(Math.min(data.page - 1, lastPage))}>Previous</button>
          <span>Page {data.page} of {lastPage}</span>
          <button type="button" disabled={data.page >= lastPage} onClick={() => changePage(data.page + 1)}>Next</button>
          <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh manifest</button>
        </div>
      </Card>
      {sample && <SampleDetails manifest={manifest} sample={sample} index={data.report.index_sha256} seconds={catalog.preview_seconds} />}
    </>}
  </>;
}

export function ExplorerView() {
  const [selection, setSelection] = useState("");
  const query = useQuery({
    queryKey: ["dataset-explorer"],
    queryFn: ({ signal }) => readDatasetJson(explorerPath, isExplorerCatalog, { signal }),
    retry: false,
  });
  const catalog = query.isSuccess ? query.data : undefined;
  const manifest = catalog?.manifests.find((entry) => manifestPath(entry) === selection) ?? catalog?.manifests[0];

  return <div className="system-stack">
    <Card title="Imported manifest">
      {query.isPending && <p role="status">Loading imported manifests.</p>}
      {query.isError && <Alert title="Explorer unavailable" error><p>{query.error.message}</p></Alert>}
      {catalog && !manifest && <EmptyState title="No imported manifests">
        Import an extracted source with the backend dataset import API, then refresh this list.
      </EmptyState>}
      {catalog && manifest && <label className="field">Manifest
        <select value={manifestPath(manifest)} onChange={(event) => setSelection(event.currentTarget.value)}>
          {catalog.manifests.map((entry) => <option key={manifestPath(entry)} value={manifestPath(entry)}>
            {entry.configuration} / {entry.name} ({entry.release})
          </option>)}
        </select>
      </label>}
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
        {query.isFetching ? "Checking..." : query.isError ? "Retry manifests" : "Refresh manifest list"}
      </button>
    </Card>
    {manifest && catalog && <ManifestExplorer key={manifestPath(manifest)} manifest={manifest} catalog={catalog} />}
  </div>;
}
