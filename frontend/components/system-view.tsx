"use client";

import { useState } from "react";
import Link from "next/link";
import { SystemQueryError } from "@/lib/api";
import { countKeys, type SystemSnapshot } from "@/lib/contracts";
import { useSystem } from "./health";
import { Alert, Card, DataTable, EmptyState, SearchField } from "./workstation-ui";

const metrics = {
  datasets: { title: "Dataset manifests", href: "/datasets" },
  jobs: { title: "Managed jobs", href: "/training" },
  models: { title: "Registry records", href: "/models" },
  analyses: { title: "Analysis records", href: "/analysis" },
} as const;

function WorkspaceCounts({ counts }: { counts: SystemSnapshot["counts"] }) {
  return <>
    <div className="metrics">
      {countKeys.map((key) => (
        <Card key={key} title={metrics[key].title}>
          <p className="metric">{counts[key].toLocaleString("en-US")}</p>
          <Link href={metrics[key].href}>Open {metrics[key].href.slice(1)}</Link>
        </Card>
      ))}
    </div>
    {countKeys.every((key) => counts[key] === 0) && <EmptyState title="Workspace is empty">
      Create a dataset manifest or run an analysis when those workflows become available.
    </EmptyState>}
  </>;
}

function Runtime({ snapshot }: { snapshot: SystemSnapshot }) {
  const { cpu_available, cuda_available, audio_formats } = snapshot.capabilities;
  const audioAvailable = Object.keys(audio_formats).length > 0;
  return <Card title="Research readiness">
    <Alert title={snapshot.ready ? "Runtime ready" : "Runtime setup required"}>
      <p>Readiness requires accessible, valid metadata stores, a working PyTorch CPU runtime, and at least one SoundFile format. CUDA is optional.</p>
    </Alert>
    <DataTable caption="Runtime capability checks" headers={["Capability", "Status"]} rows={[
      { key: "storage", cells: ["Workspace metadata", "Accessible"] },
      { key: "cpu", cells: ["PyTorch CPU", cpu_available ? "Available" : "Unavailable"] },
      { key: "cuda", cells: ["PyTorch CUDA", cuda_available ? "Available" : "Unavailable (optional)"] },
      { key: "audio", cells: ["SoundFile / libsndfile", audioAvailable ? "Formats available" : "No formats reported"] },
    ]} />
    {(!cpu_available || !audioAvailable) && <p>Sync the backend research dependencies and restart the backend. <Link href="/settings">Open setup guidance</Link>.</p>}
  </Card>;
}

function AudioFormats({ formats }: { formats: SystemSnapshot["capabilities"]["audio_formats"] }) {
  const [filter, setFilter] = useState("");
  const entries = Object.entries(formats).sort(([first], [second]) => first.localeCompare(second));
  const normalized = filter.trim().toLowerCase();
  const matches = entries.filter(([code, name]) => [code, name].some((part) => part.toLowerCase().includes(normalized)));

  return <Card title="Audio formats">
    {entries.length === 0 ? <EmptyState title="No runtime audio formats reported">
      Install the research dependencies and restart the backend to run the SoundFile probe again.
    </EmptyState> : <>
      <p>Reported by libsndfile. Decoding still depends on each file&apos;s encoding.</p>
      <form className="filter-form" role="search" aria-label="Audio formats" onSubmit={(event) => event.preventDefault()}>
        <SearchField label="Filter formats" value={filter} onChange={setFilter} />
      </form>
      {matches.length === 0 ? <EmptyState title="No matching formats">Try another format name or code.</EmptyState>
        : <DataTable caption="Reported decoder formats" headers={["Code", "Format"]} rows={
          matches.map(([code, name]) => ({ key: code, cells: [code, name] }))
        } />}
    </>}
  </Card>;
}

function LocalConfiguration() {
  return <Card title="Local configuration">
    <p>From the backend checkout in PowerShell, sync the locked research dependencies and start the loopback service.</p>
    <pre><code>{"uv sync --locked --group research\n.\\.venv\\Scripts\\python.exe -m backend"}</code></pre>
    <p>Set <code>MUSICAI_STORAGE_ROOT</code> to a dedicated local folder. The default is <code>artifacts</code> under the backend checkout. Relative paths resolve from that checkout.</p>
    <p>Configure the backend through process variables, <code>.env</code>, or <code>config/local.yaml</code>, in that order. Restart the backend after changes.</p>
    <p>For a port other than 8000, set <code>MUSICAI_PORT</code> for the backend and <code>MUSICAI_BACKEND_PORT</code> to the same value for Next.js. Restart both services.</p>
  </Card>;
}

export function SystemView({ settings = false }: { settings?: boolean }) {
  const query = useSystem();
  const error = query.error instanceof SystemQueryError ? query.error : undefined;
  return <div className="system-stack">
    <Card title="System connection">
      {query.isPending && <p role="status">Loading the system snapshot.</p>}
      {query.isError && <Alert title="System data unavailable" error>
        <p>{error?.message ?? "The system request failed."}</p>
        {error?.code === "BACKEND_UNAVAILABLE" && <p>Start the local backend and check that its port matches the frontend proxy.</p>}
        {error?.code === "INVALID_CONFIGURATION" && <p>Correct the frontend port setting and restart Next.js.</p>}
      </Alert>}
      {query.isSuccess && <p>Backend version <strong>{query.data.version}</strong> | API version <strong>{query.data.api_version}</strong></p>}
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
        {query.isFetching ? "Checking..." : query.isError ? "Retry system check" : "Refresh system data"}
      </button>
    </Card>
    {query.isSuccess && <>
      {!settings && <WorkspaceCounts counts={query.data.counts} />}
      <Runtime snapshot={query.data} />
      {settings && <AudioFormats formats={query.data.capabilities.audio_formats} />}
    </>}
    {settings ? <LocalConfiguration /> : <Link href="/settings">System settings and local setup</Link>}
  </div>;
}
