const folderStates = ["available", "missing", "unavailable", "not_configured"] as const;
export type FolderState = (typeof folderStates)[number];

export type DatasetSource = {
  id: string;
  name: string;
  source_url: string;
  license_url: string;
  license_name: string;
  license_revision: string;
  extraction_guidance: string;
  supported_annotations: string[];
  audio_path: string | null;
  annotation_path: string | null;
  audio_status: FolderState;
  annotation_status: FolderState;
  enabled: boolean;
  license_accepted: boolean;
  revision: string;
};

export type DatasetCatalog = { extraction_root: string; sources: DatasetSource[] };
export type SourceEdit = Pick<DatasetSource, "audio_path" | "annotation_path" | "enabled" | "revision"> & {
  accept_license: boolean;
};

export function isSourceId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLink(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isDatasetSource(value: unknown): value is DatasetSource {
  return isRecord(value) && typeof value.id === "string" && isSourceId(value.id) &&
    typeof value.name === "string" && isLink(value.source_url) && isLink(value.license_url) &&
    typeof value.license_name === "string" && typeof value.license_revision === "string" &&
    typeof value.extraction_guidance === "string" &&
    Array.isArray(value.supported_annotations) && value.supported_annotations.every((item) => typeof item === "string") &&
    [value.audio_path, value.annotation_path].every((path) => path === null || typeof path === "string") &&
    [value.audio_status, value.annotation_status].every((state) => folderStates.some((expected) => expected === state)) &&
    typeof value.enabled === "boolean" && typeof value.license_accepted === "boolean" &&
    typeof value.revision === "string" && /^[a-f0-9]{64}$/.test(value.revision);
}

export function isDatasetCatalog(value: unknown): value is DatasetCatalog {
  return isRecord(value) && typeof value.extraction_root === "string" &&
    Array.isArray(value.sources) && value.sources.every(isDatasetSource);
}

export function isRelativeFolder(value: string) {
  return value.length <= 512 && value.split(/[\\/]/).every((part) =>
    part.length > 0 && part === part.trim() && !part.endsWith(".") &&
    !/[<>:"|?*\x00-\x1f]/.test(part) &&
    !/^(?:con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3]|conin\$|conout\$)(?:\.|$)/i.test(part));
}

export function isSourceEdit(value: unknown): value is SourceEdit {
  return isRecord(value) && Object.keys(value).length === 5 &&
    [value.audio_path, value.annotation_path].every((path) => path === null || (typeof path === "string" && isRelativeFolder(path))) &&
    typeof value.enabled === "boolean" && typeof value.accept_license === "boolean" &&
    typeof value.revision === "string" && /^[a-f0-9]{64}$/.test(value.revision);
}
