export const countKeys = ["datasets", "jobs", "models", "analyses"] as const;
export type CountKey = (typeof countKeys)[number];

export type SystemSnapshot = {
  status: "ok";
  version: string;
  api_version: "1";
  ready: boolean;
  capabilities: {
    cpu_available: boolean;
    cuda_available: boolean;
    audio_formats: Record<string, string>;
  };
  counts: Record<CountKey, number>;
};

export type ApiError = { error: { code: string; message: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readSystem(value: unknown): SystemSnapshot | null {
  if (!isRecord(value) || value.status !== "ok" || value.api_version !== "1" ||
      typeof value.version !== "string" || typeof value.ready !== "boolean") return null;

  const { capabilities, counts } = value;
  if (!isRecord(capabilities) || !isRecord(counts)) return null;
  const { cpu_available, cuda_available, audio_formats } = capabilities;
  if (typeof cpu_available !== "boolean" || typeof cuda_available !== "boolean" ||
      !isRecord(audio_formats)) return null;

  const formats: [string, string][] = [];
  for (const [code, name] of Object.entries(audio_formats)) {
    if (typeof name !== "string") return null;
    formats.push([code, name]);
  }

  const records: SystemSnapshot["counts"] = { datasets: 0, jobs: 0, models: 0, analyses: 0 };
  for (const key of countKeys) {
    const count = counts[key];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return null;
    records[key] = count;
  }

  return {
    status: "ok",
    version: value.version,
    api_version: "1",
    ready: value.ready,
    capabilities: { cpu_available, cuda_available, audio_formats: Object.fromEntries(formats) },
    counts: records,
  };
}

export function readApiError(value: unknown): ApiError | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const { code, message } = value.error;
  return typeof code === "string" && typeof message === "string" ? { error: { code, message } } : null;
}
