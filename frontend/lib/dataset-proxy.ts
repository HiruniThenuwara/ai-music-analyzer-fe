import { readApiError } from "./contracts";
import { isDatasetCatalog, isDatasetSource, isSourceEdit, isSourceId } from "./datasets";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers });
}

function isLocalWrite(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || request.headers.get("sec-fetch-site") === "cross-site") return false;
  return /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host) && origin === `http://${host}`;
}

export async function proxyDatasets(request?: Request, sourceId?: string, upstream: typeof fetch = fetch) {
  const portValue = process.env.MUSICAI_BACKEND_PORT ?? "8000";
  if (!/^\d{1,5}$/.test(portValue) || Number(portValue) < 1 || Number(portValue) > 65535) {
    return error(500, "INVALID_CONFIGURATION", "Set MUSICAI_BACKEND_PORT to a valid TCP port.");
  }
  let body: string | undefined;
  if (request) {
    if (!isLocalWrite(request)) return error(403, "invalid_origin", "Save from the local workstation origin.");
    if (!sourceId || !isSourceId(sourceId)) return error(404, "source_not_found", "Dataset source is not configured.");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return error(415, "invalid_content_type", "Expected a JSON request.");
    }
    // The edit schema has two paths capped at 512 characters each.
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    let size = 0;
    if (!reader) return error(422, "validation_error", "A source edit is required.");
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          return error(413, "request_too_large", "Source edit exceeds the size limit.");
        }
        raw += decoder.decode(value, { stream: true });
      }
      const edit: unknown = JSON.parse(raw + decoder.decode());
      if (!isSourceEdit(edit)) return error(422, "validation_error", "Check the source paths and edit fields.");
      body = JSON.stringify(edit);
    } catch {
      return error(422, "validation_error", "Could not read the source edit.");
    }
  }

  let response: Response;
  let data: unknown;
  try {
    response = await upstream(`http://127.0.0.1:${portValue}/api/datasets/sources${request ? `/${sourceId}` : ""}`, {
      method: request ? "PUT" : "GET",
      body,
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    data = await response.json().catch(() => null);
  } catch {
    return error(503, "BACKEND_UNAVAILABLE", "Could not reach the local MusicAI backend.");
  }
  if (!response.ok) {
    if (!request && response.status === 404) {
      return error(502, "DATASET_API_UNAVAILABLE", "Start a backend version that provides the dataset source API.");
    }
    const detail = readApiError(data);
    return detail ? Response.json(detail, { status: response.status, headers })
      : error(502, "INVALID_BACKEND_RESPONSE", "The dataset source API returned an unexpected error.");
  }
  if (request ? !isDatasetSource(data) || data.id !== sourceId : !isDatasetCatalog(data)) {
    return error(502, "INVALID_BACKEND_RESPONSE", "The dataset source API returned invalid data.");
  }
  return Response.json(data, { headers });
}
