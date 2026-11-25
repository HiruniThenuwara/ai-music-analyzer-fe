import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyJobs } from "../lib/job-proxy";
import { elapsedSeconds, isActiveJob, isCancelling, isJobDetail, type Job } from "../lib/jobs";

const id = "job-" + "a".repeat(32);
const queued: Job = {
  id, kind: "validate_dataset", configuration: "instrument-v1", state: "queued",
  created_at: "2026-11-25T06:00:00Z", started_at: null, finished_at: null,
  cancel_requested_at: null, exit_code: null, message: null,
};

function post(body?: unknown, origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/jobs", {
    method: "POST",
    headers: { Host: "127.0.0.1:3000", Origin: origin, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("job action proxy uses fixed backend endpoints and rejects arbitrary input", async () => {
  const start = { kind: "validate_dataset", configuration: "instrument-v1" };
  const backend: typeof fetch = async (url, options) => {
    assert.match(String(url), /^http:\/\/127\.0\.0\.1:\d+\/api\/datasets\/instrument-v1\/validate$/);
    assert.equal(options?.method, "POST");
    assert.equal(options?.body, undefined);
    return Response.json(queued, { status: 202 });
  };
  assert.equal((await proxyJobs(post(start), [], backend)).status, 202);
  const unexpected: typeof fetch = async () => assert.fail("Unexpected upstream call");
  assert.equal((await proxyJobs(post({ ...start, command: "not-allowed" }), [], unexpected)).status, 422);
  assert.equal((await proxyJobs(post(start, "http://example.org"), [], unexpected)).status, 403);
  assert.equal((await proxyJobs(post(), ["../escape", "cancel"], unexpected)).status, 404);
});

test("busy and cancelled outcomes survive the proxy without optimistic changes", async () => {
  const detail = { error: { code: "compute_busy", message: "A compute job is already active." } };
  const busy = await proxyJobs(post({ configuration: "instrument-v1", kind: "prepare_dataset" }), [], async (url, options) => {
    assert.match(String(url), /\/api\/datasets\/instrument-v1\/prepare$/);
    assert.equal(options?.body, "{}");
    return Response.json(detail, { status: 409 });
  });
  assert.equal(busy.status, 409);
  assert.deepEqual(await busy.json(), detail);

  const cancelled = { ...queued, state: "cancelled" };
  const response = await proxyJobs(post(), [id, "cancel"], async (url) => {
    assert.match(String(url), new RegExp("/api/jobs/" + id + "/cancel$"));
    return Response.json(cancelled);
  });
  assert.deepEqual(await response.json(), cancelled);
});

test("historical states remain terminal and only actual totals form valid progress", () => {
  const detail = { ...queued, stdout_tail: "", stderr_tail: "", progress: null };
  assert.ok(isJobDetail(detail));
  assert.ok(isJobDetail({ ...detail, progress: { completed: 1, total: 2, unit: "files" } }));
  assert.equal(isJobDetail({ ...detail, progress: { completed: 1, total: 0, unit: "files" } }), false);
  const running: Job = { ...queued, state: "running", started_at: queued.created_at };
  const now = Date.parse(queued.created_at) + 3000;
  assert.equal(elapsedSeconds(running, now), 3);
  assert.equal(elapsedSeconds(running, now, true), null);
  assert.ok(isCancelling({ ...running, cancel_requested_at: queued.created_at }));
  for (const state of ["succeeded", "failed", "cancelled", "interrupted"] as const) {
    assert.equal(isActiveJob({ ...running, state }), false);
  }
  assert.equal(elapsedSeconds({ ...running, state: "interrupted" }, now), null);
});
