import { isHealth, type Health } from "./contracts";

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch("/api/health", { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Backend health check failed (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!isHealth(data)) {
    throw new Error("Backend health response is invalid.");
  }
  return { status: data.status };
}
