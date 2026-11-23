import { readApiError, readSystem, type SystemSnapshot } from "./contracts";

export class SystemQueryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export async function fetchSystem(signal?: AbortSignal): Promise<SystemSnapshot> {
  let response: Response;
  try {
    response = await fetch("/api/system", { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new SystemQueryError("FRONTEND_UNREACHABLE", "Could not reach the workstation API.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = readApiError(data)?.error;
    throw new SystemQueryError(detail?.code ?? "REQUEST_FAILED",
      detail?.message ?? `System request failed (HTTP ${response.status}).`);
  }

  const snapshot = readSystem(data);
  if (!snapshot) throw new SystemQueryError("INVALID_BACKEND_RESPONSE", "The system response is invalid.");
  return snapshot;
}
