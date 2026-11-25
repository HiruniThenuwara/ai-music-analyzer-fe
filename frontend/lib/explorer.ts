export const splits = ["train", "validation", "test", "unspecified"] as const;
export type Split = (typeof splits)[number];

export type ManifestChoice = { configuration: string; source: string; name: string; release: string; examples: number };
export type ExplorerCatalog = { manifests: ManifestChoice[]; instruments: string[]; splits: Split[]; preview_seconds: number };
export type ManifestReport = ManifestChoice & {
  path: string;
  index_sha256: string;
  split_counts: Record<Split, number>;
  label_counts: Record<string, number>;
  status: "canonical" | "exploratory";
  status_reason: string;
};
export type Sample = {
  id: string; filename: string; audio_path: string; midi_path: string | null;
  split: Split; group: string; source_labels: string[]; instruments: string[];
};
export type ExplorerPage = {
  report: ManifestReport; page: number; page_size: number; total: number;
  label_counts: Record<string, number>; samples: Sample[];
};
export type Filters = { filename: string; instrument: string; split: string; page: number };

export const explorerPath = "/api/datasets/explorer";

export function manifestPath(manifest: ManifestChoice) {
  return `${explorerPath}/${encodeURIComponent(manifest.configuration)}/${encodeURIComponent(manifest.source)}`;
}

export function searchPath(manifest: ManifestChoice, filters: Filters) {
  const params = new URLSearchParams({ page: String(filters.page), page_size: "25" });
  if (filters.filename) params.set("filename", filters.filename);
  if (filters.instrument) params.set("instrument", filters.instrument);
  if (filters.split) params.set("split", filters.split);
  return `${manifestPath(manifest)}?${params}`;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function counts(value: unknown): value is Record<string, number> {
  return object(value) && Object.values(value).every(count);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function manifest(value: unknown): value is ManifestChoice {
  return object(value) && [value.configuration, value.source, value.name, value.release].every((key) => typeof key === "string")
    && count(value.examples);
}
function isSplit(value: unknown): value is Split {
  return splits.some((split) => split === value);
}

export function isExplorerCatalog(value: unknown): value is ExplorerCatalog {
  return object(value) && Array.isArray(value.manifests) && value.manifests.every(manifest)
    && strings(value.instruments) && Array.isArray(value.splits) && value.splits.every(isSplit)
    && count(value.preview_seconds) && value.preview_seconds > 0;
}

function report(value: unknown): value is ManifestReport {
  if (!object(value)) return false;
  return typeof value.path === "string" && typeof value.index_sha256 === "string"
    && /^[a-f0-9]{64}$/.test(value.index_sha256)
    && counts(value.split_counts) && splits.every((split) => Object.hasOwn(value.split_counts as object, split))
    && counts(value.label_counts) && (value.status === "canonical" || value.status === "exploratory")
    && typeof value.status_reason === "string" && manifest(value);
}

function sample(value: unknown): value is Sample {
  return object(value) && typeof value.id === "string" && /^[a-f0-9]{32}$/.test(value.id)
    && typeof value.filename === "string" && typeof value.audio_path === "string"
    && (value.midi_path === null || typeof value.midi_path === "string")
    && isSplit(value.split) && typeof value.group === "string"
    && strings(value.source_labels) && strings(value.instruments);
}

export function isExplorerPage(value: unknown): value is ExplorerPage {
  return object(value) && report(value.report) && count(value.page) && value.page > 0
    && count(value.page_size) && value.page_size > 0 && count(value.total)
    && counts(value.label_counts) && Array.isArray(value.samples) && value.samples.every(sample);
}
