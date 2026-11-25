import { readApiError } from "./contracts";
import { isDatasetCatalog, isDatasetSource, type DatasetCatalog, type DatasetSource, type SourceEdit } from "./datasets";

export async function readDatasetJson<T>(url: string, validate: (data: unknown) => data is T, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiError(data)?.error.message ?? `Request failed (HTTP ${response.status}).`);
  }
  if (!validate(data)) throw new Error("The backend did not confirm the dataset data.");
  return data;
}

export function fetchDatasetCatalog(signal?: AbortSignal): Promise<DatasetCatalog> {
  return readDatasetJson("/api/datasets/sources", isDatasetCatalog, { signal });
}

export function saveDatasetSource(id: string, edit: SourceEdit): Promise<DatasetSource> {
  return readDatasetJson(`/api/datasets/sources/${encodeURIComponent(id)}`, isDatasetSource, {
    method: "PUT",
    body: JSON.stringify(edit),
    headers: { "Content-Type": "application/json" },
  });
}
