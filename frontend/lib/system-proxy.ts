import { readApiError, readSystem, type ApiError } from "./contracts";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status, headers });
}

export async function proxySystem(portValue = "8000", request: typeof fetch = fetch, healthOnly = false) {
  const port = Number(portValue);
  if (!/^\d{1,5}$/.test(portValue) || port < 1 || port > 65535) {
    return error(500, "INVALID_CONFIGURATION", "MUSICAI_BACKEND_PORT must be a valid TCP port.");
  }

  let response: Response;
  try {
    response = await request(`http://127.0.0.1:${port}/api/system`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" },
    });
  } catch {
    return error(503, "BACKEND_UNAVAILABLE", "Could not reach the local MusicAI backend.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = readApiError(data);
    if (response.status === 503 && detail &&
        ["corrupt_metadata", "storage_unavailable"].includes(detail.error.code)) {
      return Response.json(detail, { status: 503, headers });
    }
    return error(502, "INVALID_BACKEND_RESPONSE", `The backend system endpoint returned HTTP ${response.status}.`);
  }

  const snapshot = readSystem(data);
  if (!snapshot) {
    return error(502, "INVALID_BACKEND_RESPONSE", "The backend system endpoint returned invalid data.");
  }
  return Response.json(healthOnly ? { status: snapshot.status } : snapshot, { headers });
}
