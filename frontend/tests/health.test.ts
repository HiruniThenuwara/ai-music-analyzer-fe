import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchHealth } from "../lib/api";
import { proxyHealth } from "../lib/health-proxy";

test("health proxy uses the configured loopback port and returns only public health data", async () => {
  const response = await proxyHealth("8765", async (url, options) => {
    assert.equal(url, "http://127.0.0.1:8765/api/health");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json({ status: "ok", extra: "internal" });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("health proxy rejects invalid configuration without contacting an upstream", async () => {
  const response = await proxyHealth("8000@localhost", async () => {
    assert.fail("Unexpected upstream call");
  });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, "INVALID_CONFIGURATION");
});

test("health proxy distinguishes an unreachable backend from unusable upstream responses", async () => {
  const offline = await proxyHealth(undefined, async () => { throw new TypeError("connection refused"); });
  assert.equal(offline.status, 503);
  assert.equal((await offline.json()).error.code, "BACKEND_UNAVAILABLE");

  for (const upstream of [
    new Response("not JSON"),
    Response.json({ status: "starting" }),
    Response.json({ status: "ok" }, { status: 500 }),
  ]) {
    const invalid = await proxyHealth(undefined, async () => upstream);
    assert.equal(invalid.status, 502);
    assert.equal((await invalid.json()).error.code, "INVALID_BACKEND_RESPONSE");
  }
});

test("the browser client validates same-origin health responses", async (t) => {
  const responses = [
    Response.json({ status: "ok" }),
    Response.json({ status: "unknown" }),
    Response.json({}, { status: 503 }),
  ];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(url, "/api/health");
    return responses.shift();
  });
  assert.deepEqual(await fetchHealth(), { status: "ok" });
  await assert.rejects(fetchHealth(), /invalid/);
  await assert.rejects(fetchHealth(), /503/);
});
