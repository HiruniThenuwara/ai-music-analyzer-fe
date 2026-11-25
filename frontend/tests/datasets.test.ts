import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyDatasets } from "../lib/dataset-proxy";
import { isDatasetSource, isRelativeFolder, isSourceEdit } from "../lib/datasets";

const edit = { audio_path: "example/audio", annotation_path: null, enabled: true, accept_license: true, revision: "b".repeat(64) };
const saved = {
  id: "example", name: "Example fixture", source_url: "https://example.org/data",
  license_url: "https://example.org/license", license_name: "Example terms", license_revision: "v1", extraction_guidance: "Keep the extracted tree.", supported_annotations: ["beats"],
  audio_path: edit.audio_path, annotation_path: null, enabled: true, license_accepted: true,
  audio_status: "missing", annotation_status: "not_configured", revision: "a".repeat(64),
};

test("dataset paths and response schemas reject unsafe or unconfirmed data", () => {
  assert.ok(isRelativeFolder("dataset/audio tracks"));
  for (const path of ["../escape", "C:\\audio", "\\audio", "audio/../data", "audio/NUL.wav", "audio."]) {
    assert.ok(!isRelativeFolder(path), path);
  }
  assert.ok(isSourceEdit(edit));
  assert.ok(!isSourceEdit({ ...edit, accept_license: undefined }));
  assert.ok(isDatasetSource(saved));
  assert.ok(!isDatasetSource({ ...saved, license_url: "javascript:alert(1)" }));
  assert.ok(!isDatasetSource({ ...saved, license_accepted: undefined }));
  assert.ok(!isDatasetSource({ ...saved, audio_status: true }));
});

function localEdit(origin: string, body: unknown) {
  return new Request("http://127.0.0.1:3000/api/datasets/sources/example", {
    method: "PUT",
    headers: { Host: "127.0.0.1:3000", Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("dataset proxy validates origin and path before forwarding an edit", async () => {
  const unexpected: typeof fetch = async () => assert.fail("Unexpected upstream call");
  assert.equal((await proxyDatasets(localEdit("https://example.org", edit), "example", unexpected)).status, 403);
  assert.equal((await proxyDatasets(localEdit("http://127.0.0.1:3000", edit), "../example", unexpected)).status, 404);
  assert.equal((await proxyDatasets(localEdit("http://127.0.0.1:3000", { ...edit, audio_path: "../bad" }), "example", unexpected)).status, 422);

  const response = await proxyDatasets(localEdit("http://127.0.0.1:3000", edit), "example", async (url, options) => {
    assert.match(String(url), /^http:\/\/127\.0\.0\.1:\d+\/api\/datasets\/sources\/example$/);
    assert.equal(options?.method, "PUT");
    assert.deepEqual(JSON.parse(String(options?.body)), edit);
    return Response.json(saved);
  });
  assert.deepEqual(await response.json(), saved);
});

test("dataset proxy preserves backend validation and explains a missing API", async () => {
  const detail = { error: { code: "source_changed", message: "Refresh before saving." } };
  const conflict = await proxyDatasets(localEdit("http://127.0.0.1:3000", edit), "example",
    async () => Response.json(detail, { status: 409 }));
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), detail);
  const missing = await proxyDatasets(undefined, undefined, async () => new Response(null, { status: 404 }));
  assert.equal((await missing.json()).error.code, "DATASET_API_UNAVAILABLE");
});
