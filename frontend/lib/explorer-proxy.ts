import { readApiError } from "./contracts";
import { isSourceId } from "./datasets";
import { explorerPath, isExplorerCatalog, isExplorerPage } from "./explorer";

const headers = { "Cache-Control": "no-store" };

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export async function proxyExplorer(request: Request, segments: string[], upstream: typeof fetch = fetch) {
  const host = request.headers.get("host") ?? "";
  if (!/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(host)) {
    return error(400, "invalid_host", "Use a loopback host.");
  }
  const audio = segments.length === 4 && segments[3] === "audio" && /^[a-f0-9]{32}$/.test(segments[2]);
  if (![0, 2].includes(segments.length) && !audio || !segments.slice(0, 2).every(isSourceId)) {
    return error(404, "not_found", "Unknown explorer endpoint.");
  }
  const input = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  const keys = audio ? ["index"] : segments.length ? ["filename", "instrument", "split", "page", "page_size"] : [];
  for (const [key, value] of input) {
    if (!keys.includes(key) || params.has(key) || value.length > 200) {
      return error(422, "validation_error", "Check the explorer filters.");
    }
    params.set(key, value);
  }

  const port = process.env.MUSICAI_BACKEND_PORT ?? "8000";
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    return error(500, "INVALID_CONFIGURATION", "Set MUSICAI_BACKEND_PORT to a valid TCP port.");
  }
  const path = [explorerPath, ...segments].join("/");
  try {
    const response = await upstream(`http://127.0.0.1:${port}${path}?${params}`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      headers: { Accept: audio ? "audio/wav" : "application/json" },
    });
    if (response.ok && audio && response.headers.get("content-type") === "audio/wav" && response.body) {
      return new Response(response.body, { headers: { ...headers, "Content-Type": "audio/wav", "X-Content-Type-Options": "nosniff" } });
    }
    if (response.ok && audio) return error(502, "INVALID_BACKEND_RESPONSE", "The backend returned an invalid audio preview.");
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (!segments.length && response.status === 404) {
        return error(502, "EXPLORER_UNAVAILABLE", "Start a backend version that provides the dataset explorer.");
      }
      const detail = readApiError(body);
      if (detail) return Response.json(detail, { status: response.status, headers });
    } else if (segments.length ? isExplorerPage(body) : isExplorerCatalog(body)) {
      return Response.json(body, { headers });
    }
    return error(502, "INVALID_BACKEND_RESPONSE", "The backend returned an invalid explorer response.");
  } catch {
    return error(503, "BACKEND_UNAVAILABLE", "The local backend did not complete the explorer request.");
  }
}
