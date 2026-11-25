"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDatasetCatalog, saveDatasetSource } from "@/lib/dataset-api";
import { isRelativeFolder, type DatasetCatalog, type DatasetSource, type FolderState, type SourceEdit } from "@/lib/datasets";
import { Alert, Card, DataTable, EmptyState } from "./workstation-ui";

const catalogKey = ["dataset-sources"] as const;
const folderLabels: Record<FolderState, string> = {
  available: "Directory found",
  missing: "Directory missing",
  unavailable: "Directory unavailable",
  not_configured: "Path not configured",
};

function SourceEditor({ source, saving, save }: {
  source: DatasetSource;
  saving: boolean;
  save: (edit: SourceEdit) => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const audio_path = String(fields.get("audio") ?? "") || null;
    const annotation_path = String(fields.get("annotation") ?? "") || null;
    const enabled = fields.has("enabled");
    const accept_license = fields.has("accept");
    if ([audio_path, annotation_path].some((path) => path !== null && !isRelativeFolder(path))) {
      setError("Enter relative subfolders without parent traversal, drive letters, or reserved names.");
      return;
    }
    if (enabled && (!audio_path || !accept_license)) {
      setError("Set an audio path and accept the license before enabling.");
      return;
    }
    setError("");
    save({ audio_path, annotation_path, enabled, accept_license, revision: source.revision });
  }
  return <form onSubmit={submit}>
    <fieldset disabled={saving} className="source-edit">
      <legend>Edit source settings</legend>
      <label className="field">Audio folder
        <input name="audio" type="text" maxLength={512} defaultValue={source.audio_path ?? ""} />
      </label>
      <label className="field">Annotation folder (optional)
        <input name="annotation" type="text" maxLength={512} defaultValue={source.annotation_path ?? ""} />
      </label>
      <label className="check-field">
        <input name="accept" type="checkbox" defaultChecked={source.license_accepted} />
        I accept the linked license for this source (release {source.license_revision}).
      </label>
      <label className="check-field">
        <input name="enabled" type="checkbox" defaultChecked={source.enabled} />
        Enable this source
      </label>
      {error && <Alert title="Check the source settings" error><p>{error}</p></Alert>}
      <button type="submit">{saving ? "Saving..." : "Save source"}</button>
    </fieldset>
  </form>;
}

function SourceCard({ source }: { source: DatasetSource }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (edit: SourceEdit) => saveDatasetSource(source.id, edit),
    onSuccess: async (saved) => {
      await client.cancelQueries({ queryKey: catalogKey });
      client.setQueryData<DatasetCatalog>(catalogKey, (catalog) => catalog && ({
        ...catalog,
        sources: catalog.sources.map((entry) => entry.id === saved.id ? saved : entry),
      }));
      void client.invalidateQueries({ queryKey: catalogKey });
    },
  });
  return <Card title={source.name}>
    <div className="source-links">
      <a href={source.source_url} target="_blank" rel="noreferrer">{source.source_url === source.license_url ? "Official source and license" : "Official dataset source"}</a>
      {source.source_url !== source.license_url && <a href={source.license_url} target="_blank" rel="noreferrer">Official license</a>}
    </div>
    <p>Saved status <strong>{source.enabled ? "Enabled" : "Disabled"}</strong></p>
    <p>License <strong>{source.license_name}</strong></p>
    <p>{source.extraction_guidance}</p>
    <p>License acceptance <strong>{source.license_accepted ? "Accepted" : "Not accepted"}</strong></p>
    <p>Supported annotations <strong>{source.supported_annotations.join(", ") || "None specified"}</strong></p>
    <DataTable caption="Folders reported by the backend" headers={["Files", "Configured path", "Availability"]} rows={[
      { key: "audio", cells: ["Audio", source.audio_path ? <code>{source.audio_path}</code> : "Not set", folderLabels[source.audio_status]] },
      { key: "annotations", cells: ["Annotations", source.annotation_path ? <code>{source.annotation_path}</code> : "Not set", folderLabels[source.annotation_status]] },
    ]} />
    <SourceEditor key={source.revision} source={source} saving={mutation.isPending} save={(edit) => mutation.mutate(edit)} />
    {mutation.isError && <Alert title="Save could not be confirmed" error><p>{mutation.error.message}</p></Alert>}
    {mutation.isSuccess && <p role="status">Source settings saved.</p>}
  </Card>;
}

export function DatasetView() {
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: ({ signal }) => fetchDatasetCatalog(signal),
    retry: false,
  });
  return <div className="system-stack">
    <Card title="Local dataset files">
      {catalog.isPending && <p role="status">Loading dataset sources.</p>}
      {catalog.isError && <Alert title="Dataset sources unavailable" error><p>{catalog.error.message}</p></Alert>}
      {catalog.isSuccess && <>
        <p>Configured extraction root <code>{catalog.data.extraction_root}</code></p>
        <p>Review the official license and obtain the files from the official source. Create the extraction root if needed, then extract audio and annotations into the relative folders configured for the source. Refresh after extracting to check folder availability.</p>
        <p>Directory availability indicates that the backend found a folder. Saving source settings leaves indexing and file validation to the dataset import workflow.</p>
      </>}
      <button type="button" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>
        {catalog.isFetching ? "Checking..." : catalog.isError ? "Retry dataset sources" : "Refresh dataset sources"}
      </button>
    </Card>
    {catalog.isSuccess && (catalog.data.sources.length === 0
      ? <EmptyState title="No dataset sources configured">
        Define sources in the backend dataset catalog, then refresh.
      </EmptyState>
      : catalog.data.sources.map((source) => <SourceCard key={source.id} source={source} />))}
  </div>;
}
