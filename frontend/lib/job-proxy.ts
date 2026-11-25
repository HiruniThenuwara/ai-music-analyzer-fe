import { readApiError } from "./contracts";
import { isJob, isJobDetail, isJobId, isJobList, isJobStart } from "./jobs";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers });
}

async function readStart(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let content = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(content + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return null;
      }
      content += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  }
}

export async function proxyJobs(request: Request, segments: string[], upstream: typeof fetch = fetch) {
  const host = request.headers.get("host") ?? "";
  if (!/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(host)) {
    return error(400, "invalid_host", "Use a loopback host.");
  }
  if (segments.length > 2 || (segments.length > 0 && !isJobId(segments[0])) ||
      (segments.length === 2 && segments[1] !== "cancel")) {
    return error(404, "not_found", "Unknown job endpoint.");
  }
  const write = request.method === "POST";
  const start = write && segments.length === 0;
  if ((write && segments.length === 1) || (!write && segments.length === 2)) {
    return error(405, "method_not_allowed", "Unsupported job request method.");
  }
  if (write && (request.headers.get("origin") !== `http://${host}` || request.headers.get("sec-fetch-site") === "cross-site")) {
    return error(403, "invalid_origin", "Submit job actions from the local workstation origin.");
  }

  let path = ["/api/jobs", ...segments].join("/");
  let body: string | undefined;
  if (start) {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return error(415, "invalid_content_type", "Expected a JSON request.");
    }
    const input = await readStart(request);
    if (!isJobStart(input)) return error(422, "validation_error", "Choose a supported dataset action and configuration.");
    const action = input.kind === "validate_dataset" ? "validate" : "prepare";
    path = `/api/datasets/${input.configuration}/${action}`;
    if (action === "prepare") body = "{}";
  }

  const port = process.env.MUSICAI_BACKEND_PORT ?? "8000";
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    return error(500, "INVALID_CONFIGURATION", "Set MUSICAI_BACKEND_PORT to a valid TCP port.");
  }
  try {
    const response = await upstream(`http://127.0.0.1:${port}${path}`, {
      method: request.method, cache: "no-store", redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = readApiError(data);
      if (response.status === 404 && !segments.length) {
        return error(502, "JOB_API_UNAVAILABLE", "Start a backend version that provides managed jobs.");
      }
      if (detail) return Response.json(detail, { status: response.status, headers });
    } else if (write ? isJob(data) : segments.length ? isJobDetail(data) : isJobList(data)) {
      return Response.json(data, { status: response.status, headers });
    }
    return error(502, "INVALID_BACKEND_RESPONSE", "The backend returned an invalid job response.");
  } catch {
    return error(503, "BACKEND_UNAVAILABLE", "The local backend did not confirm the job request. Refresh job history before retrying.");
  }
}
