import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchSystem, SystemQueryError } from "../lib/api";
import { readSystem } from "../lib/contracts";
import { proxySystem } from "../lib/system-proxy";

const fresh = {
  status: "ok", version: "0.1.0", api_version: "1", ready: false,
  capabilities: { cpu_available: false, cuda_available: false, audio_formats: {} },
  counts: { datasets: 0, jobs: 0, models: 0, analyses: 0 },
};

test("system validation preserves empty and populated counts and rejects malformed data", () => {
  assert.deepEqual(readSystem(fresh), fresh);
  const populated = { ...fresh, counts: { ...fresh.counts, datasets: 4 } };
  assert.deepEqual(readSystem(populated), populated);
  assert.equal(readSystem({ ...fresh, counts: { ...fresh.counts, jobs: -1 } }), null);
  assert.equal(readSystem({ ...fresh, counts: { ...fresh.counts, jobs: 0.5 } }), null);
  assert.equal(readSystem({ ...fresh, capabilities: { ...fresh.capabilities, audio_formats: [] } }), null);
  assert.equal(readSystem({ ...fresh, api_version: "2" }), null);
});

test("proxy only calls the configured loopback system endpoint and limits the response", async () => {
  const request = async (url: unknown, options?: RequestInit) => {
    assert.equal(url, "http://127.0.0.1:8765/api/system");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json({ ...fresh, extra: "internal" });
  };
  const response = await proxySystem("8765", request);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), fresh);
  assert.deepEqual(await (await proxySystem("8765", request, true)).json(), { status: "ok" });
  const invalid = await proxySystem("8000@localhost", async () => assert.fail("Unexpected upstream call"));
  assert.equal(invalid.status, 500);
});

test("proxy distinguishes offline, invalid data, and backend storage errors", async () => {
  const offline = await proxySystem(undefined, async () => { throw new TypeError("connection refused"); });
  assert.equal(offline.status, 503);
  assert.equal((await offline.json()).error.code, "BACKEND_UNAVAILABLE");
  const invalid = await proxySystem(undefined, async () => Response.json({ status: "ok" }));
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error.code, "INVALID_BACKEND_RESPONSE");
  const detail = { error: { code: "corrupt_metadata", message: "Invalid jobs record." } };
  const storage = await proxySystem(undefined, async () => Response.json(detail, { status: 503 }));
  assert.equal(storage.status, 503);
  assert.deepEqual(await storage.json(), detail);
});

test("the browser client validates responses and recovers on a subsequent request", async (t) => {
  const responses = [
    Response.json({ error: { code: "BACKEND_UNAVAILABLE", message: "Backend offline." } }, { status: 503 }),
    Response.json({ status: "ok" }),
    Response.json(fresh),
  ];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "/api/system");
    return responses.shift();
  });
  await assert.rejects(fetchSystem(), (error) => error instanceof SystemQueryError && error.code === "BACKEND_UNAVAILABLE");
  await assert.rejects(fetchSystem(), /invalid/);
  assert.deepEqual(await fetchSystem(), fresh);
});
