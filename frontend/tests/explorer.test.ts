import assert from "node:assert/strict";
import { test } from "node:test";
import { isExplorerPage, searchPath, splits } from "../lib/explorer";
import { proxyExplorer } from "../lib/explorer-proxy";

const choice = { configuration: "instrument-v1", source: "maestro", name: "MAESTRO", release: "3", examples: 2 };
const report = {
  ...choice, path: "maestro", index_sha256: "a".repeat(64), status: "canonical",
  status_reason: "Release splits present", split_counts: { train: 1, validation: 0, test: 1, unspecified: 0 },
  label_counts: { piano: 2 },
};
const page = { report, label_counts: { piano: 1 }, page: 2, page_size: 25, total: 1, samples: [] };

function request(path: string, host = "127.0.0.1:3000") {
  return new Request(`http://127.0.0.1:3000${path}`, { headers: { host } });
}

test("filename, instrument, split and pagination are forwarded together to loopback", async () => {
  const path = searchPath(choice, { filename: "A & B", instrument: "piano", split: "test", page: 2 });
  const response = await proxyExplorer(request(path), [choice.configuration, choice.source], async (url, options) => {
    const target = new URL(String(url));
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/api/datasets/explorer/instrument-v1/maestro");
    assert.deepEqual(Object.fromEntries(target.searchParams), {
      filename: "A & B", instrument: "piano", split: "test", page: "2", page_size: "25",
    });
    assert.equal(options?.redirect, "error");
    return Response.json(page);
  });
  assert.deepEqual(await response.json(), page);
  assert.equal(isExplorerPage({ ...page, report: { ...report, split_counts: {} } }), false);
});

test("explorer proxy rejects nonlocal hosts, invalid segments and duplicate filters", async () => {
  const fail: typeof fetch = async () => assert.fail("Unexpected upstream call");
  assert.equal((await proxyExplorer(request("/api/datasets/explorer", "example.org"), [], fail)).status, 400);
  assert.equal((await proxyExplorer(request("/api/datasets/explorer"), ["../escape", "maestro"], fail)).status, 404);
  assert.equal((await proxyExplorer(request("/api/datasets/explorer?split=train&split=test"),
    [choice.configuration, choice.source], fail)).status, 422);
});

test("audio MIME and decoder errors are preserved and manifest catalog stays scoped", async () => {
  const requestAudio = request("/api/datasets/explorer?index=" + report.index_sha256);
  const segments = [choice.configuration, choice.source, "0".repeat(32), "audio"];
  const detail = { error: { code: "decode_unsupported", message: "Cannot decode this file." } };
  const bad = await proxyExplorer(requestAudio, segments, async () => Response.json(detail, { status: 415 }));
  assert.equal(bad.status, 415);
  assert.deepEqual(await bad.json(), detail);
  const wav = await proxyExplorer(requestAudio, segments, async () =>
    new Response("RIFF", { headers: { "Content-Type": "audio/wav" } }));
  assert.equal(wav.headers.get("content-type"), "audio/wav");
  assert.equal(await wav.text(), "RIFF");
  const catalog = { manifests: [choice], instruments: ["piano"], splits, preview_seconds: 30 };
  const result = await proxyExplorer(request("/api/datasets/explorer"), [], async () => Response.json(catalog));
  assert.deepEqual(await result.json(), catalog);
});
