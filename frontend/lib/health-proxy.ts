import { isHealth, type ApiError, type Health } from "./contracts";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: ApiError["error"]["code"], message: string) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status, headers });
}

export async function proxyHealth(portValue = "8000", request: typeof fetch = fetch) {
  const port = Number(portValue);
  if (!/^\d{1,5}$/.test(portValue) || port < 1 || port > 65535) {
    return error(500, "INVALID_CONFIGURATION", "MUSICAI_BACKEND_PORT must be a valid TCP port.");
  }

  let response: Response;
  try {
    response = await request(`http://127.0.0.1:${port}/api/health`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" },
    });
  } catch {
    return error(503, "BACKEND_UNAVAILABLE", "Could not reach the local MusicAI backend.");
  }

  if (!response.ok) {
    return error(502, "INVALID_BACKEND_RESPONSE", "The backend health endpoint returned an error.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!isHealth(data)) {
    return error(502, "INVALID_BACKEND_RESPONSE", "The backend health endpoint returned invalid data.");
  }
  return Response.json({ status: data.status } satisfies Health, { headers });
}
