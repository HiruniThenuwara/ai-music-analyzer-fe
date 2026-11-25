# Rebuild progress

## Frontend foundation (2026-11-23)

REBUILD_ROOT was unset. Work used the supplied frontend checkout. The initial checkout contained only README.md and .gitignore, with no applicable AGENTS.md or prior rebuild notes found. The sibling backend has settings and locked Python dependencies, but no FastAPI application or health route was found.

### Changed files

- frontend/package.json, package-lock.json, tsconfig.json, and .gitignore establish the locked Next.js TypeScript application and local scripts.
- frontend/app/layout.tsx, page.tsx, [section]/page.tsx, and globals.css define the shared dark shell and ten routes. Dashboard is at /. The research and assistant screens report unavailable API data.
- frontend/components/navigation.tsx, providers.tsx, and health.tsx provide grouped navigation, the query provider, and loading, offline, and connected states.
- frontend/app/api/health/route.ts and frontend/lib/api.ts, contracts.ts, health-proxy.ts, and sections.ts define the read-only loopback proxy, typed health client, and route metadata.
- frontend/tests/health.test.ts covers proxy routing and response filtering, invalid port configuration, upstream failure handling, and browser client validation.
- docs/api-contracts.md records the health contract and HTTP error examples.

### Commands and outcomes

- node --version and npm.cmd --version reported Node 24.19.0 and npm 11.17.0.
- npm.cmd view next version engines peerDependencies --json --fetch-retries=0 confirmed Next 16.4.6 and React 19 support under normal Windows permissions. The restricted registry call returned EACCES.
- npm.cmd install --prefix frontend --save-exact next@16.4.6 react@19 react-dom@19 '@tanstack/react-query' recharts wavesurfer.js lucide-react and npm.cmd install --prefix frontend --save-dev --save-exact typescript@5 '@types/node@24' '@types/react@19' '@types/react-dom@19' tsx succeeded with zero vulnerabilities reported at install time.
- npm.cmd --prefix frontend test passed all four tests under normal Windows permissions. Sandboxed tsx failed at uv_os_get_passwd. An attempted sandboxed switch to Node-native tests hit write permissions, so the working tsx setup was retained.
- npm.cmd --prefix frontend run typecheck passed route type generation and tsc --noEmit.
- npm.cmd --prefix frontend run build passed with Turbopack and prerendered the ten screens.
- A Node HTTP smoke script launched the production Next server and a temporary health fixture on loopback. All ten screen URLs returned HTTP 200. An unknown screen and API path returned 404, a health POST returned 405, and the proxy changed from 200 to 503 when the fixture stopped.
- Live FastAPI and browser visual verification remain outstanding. The health fixture was used only for the HTTP smoke test.

### Local setup

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:3000. For a production run, use npm.cmd run build followed by npm.cmd start.

### Next day prerequisites

Add the real FastAPI GET /api/health route in the backend and launch Uvicorn on 127.0.0.1 with one worker. Confirm the browser reports connected against FastAPI and offline when it stops. Define the next research endpoint contracts before wiring the corresponding unavailable screens to backend data.

## Dashboard and system settings (2026-11-23)

The sibling FastAPI checkout now serves /api/system. Its documented contract and typed backend models were used directly. Frontend dependency versions and the lockfile are unchanged.

### Changed files

- frontend/app/api/system/route.ts, frontend/app/api/health/route.ts, and frontend/lib/system-proxy.ts replace the old health-only proxy with system data and a compatibility health route.
- frontend/lib/contracts.ts and api.ts validate system snapshots, expose typed failures, and retain intended backend storage errors.
- frontend/components/health.tsx, system-view.tsx, and workstation-ui.tsx add the shared query, live dashboard metrics, runtime checks, filterable format table, setup guidance, and reusable cards, alerts, empty states, and form fields.
- frontend/app/page.tsx, frontend/app/[section]/page.tsx, frontend/app/globals.css, and frontend/lib/sections.ts wire the screens and feature-specific prerequisites.
- frontend/tests/system.test.ts replaces the earlier health-only coverage. docs/api-contracts.md records the system request, response, and error examples.

### Commands and outcomes

- npm.cmd --prefix frontend test passed all four targeted system tests.
- npm.cmd --prefix frontend run typecheck passed route type generation and tsc --noEmit.
- npm.cmd --prefix frontend run build passed and included the dynamic system and legacy health endpoints.
- A Node smoke script launched the real sibling backend with .venv's Python and -m backend, a fresh temporary MUSICAI_STORAGE_ROOT, and a production Next.js server on loopback. The backend reported all four counts at zero, readiness true, CPU available, CUDA unavailable, and 26 audio formats. The legacy health route returned 200 and POST /api/system returned 405.
- Headless Chrome verified zero counts and the empty-workspace message, settings guidance and audio-format filtering, and a feature prerequisite. After stopping the backend, both pages reported offline, the dashboard hid the count cards, and settings guidance stayed visible. Restarting the backend and clicking Retry restored the connected state.
- git diff --check passed. The real hardware probe covered the installed CPU runtime. CUDA availability and missing-runtime rendering were not exercised on different installations.

### Next day prerequisites

Define typed dataset listing and ingestion contracts against the managed manifests store. Before connecting ingestion controls, validate configured paths and exercise decoding with representative input files on the installed runtime.

## Dataset source editor (2026-11-25)

### Changed files

- frontend/app/datasets/page.tsx, components/dataset-view.tsx, app/globals.css, app/[section]/page.tsx, and lib/sections.ts replace the placeholder with a validated editor, availability table, official links, and extraction instructions.
- frontend/app/api/datasets/sources routes and frontend/lib/dataset-api.ts, dataset-proxy.ts, and datasets.ts provide the typed client and same-origin loopback proxy.
- frontend/tests/datasets.test.ts covers unsafe paths, malformed responses, cross-origin writes, conflicts, and a missing backend endpoint.
- The sibling backend's backend/routes/dataset_preferences.py, backend/main.py, and tests/test_dataset_preferences.py provide catalog-backed folder checks and atomic preference writes. The dataset import work appeared in the sibling checkout during implementation. The editor uses its official catalog and configured dataset root. It stores preferences separately from indexed manifests.
- docs/api-contracts.md records the source preference contracts and examples. Dependency lockfiles are unchanged.

### Commands and outcomes

- npm.cmd --prefix frontend test passed all seven tests.
- npm.cmd --prefix frontend run typecheck and npm.cmd --prefix frontend run build passed.
- .venv\Scripts\python.exe -m pytest -p no:cacheprovider -q in the sibling checkout passed all 39 tests, including source availability, explicit acceptance, changed terms, stale writes, and import API coexistence.
- The first browser smoke attempt received 404 while the sibling dataset routes were changing. After integration, a fresh production Next.js and real FastAPI loopback run passed in headless Chrome. It checked an official link, initial unconfigured and unaccepted states, validation before enabling, confirmation after a save, one actual directory found and one missing, and the backend-offline state.
- git diff --check passed. This verification used a temporary workspace. It exercised folder checks and preference saves. It did not import or decode licensed audio.

### Next day prerequisites

Use an authorized local extraction to exercise the separate dataset import flow. Check required annotations and decode representative audio before using imported examples for training.

## Dataset explorer (2026-11-25)

### Changed files

- frontend/app/datasets/explorer/page.tsx, app/datasets/page.tsx, components/explorer-view.tsx, components/sample-audio.tsx, and app/globals.css add manifest selection, server-backed filters and pagination, scoped counts, sample metadata, and WaveSurfer playback.
- frontend/app/api/datasets/explorer, lib/explorer-proxy.ts, lib/explorer.ts, and lib/dataset-api.ts implement the read-only loopback proxy and typed response validation. frontend/tests/explorer.test.ts covers filter forwarding, path and host rejection, and audio error passthrough.
- The sibling backend's backend/routes/dataset_explorer.py, backend/services/dataset_explorer.py, backend/main.py, and tests/test_dataset_explorer.py add manifest reports, scoped search, and bounded WAV previews from indexed files. Canonical status describes coverage of expected release split categories. Reports stay scoped to a configuration and source when manifests overlap.
- docs/api-contracts.md records the new request, response, and error examples. Dependency lockfiles are unchanged.

### Commands and outcomes

- npm.cmd --prefix frontend test passed all 10 tests.
- npm.cmd --prefix frontend run typecheck and npm.cmd --prefix frontend run build passed.
- .venv\Scripts\python.exe -m pytest -p no:cacheprovider -q in the sibling checkout passed all 45 tests. The explorer regression verified case-insensitive filenames, positive-instrument matching, exact splits, pagination, scope with overlapping configurations, canonical and exploratory reports, and audio errors.
- A Node smoke script launched real FastAPI and production Next.js on loopback and drove headless Chrome against a temporary MAESTRO-layout import with generated WAV audio. The explorer showed the fresh empty state. For 28 indexed rows, the combined filters returned 26 matches and the filenames on both browser pages matched direct backend results. Chrome rendered a waveform and advanced the audio playback timeline. A removed file showed the missing-audio error and an invalid file showed the decoder error.
- git diff --check passed in both checkouts. The smoke test used generated WAV audio. Full-release corpus performance and representative licensed encodings remain unmeasured.

### Next day prerequisites

Use an authorized extraction to verify representative encodings and manifest sizes. Define the next feature's API contract before wiring controls that consume these manifests.

## Managed dataset jobs (2026-11-25)

### Changed files

- frontend/app/datasets/page.tsx, components/dataset-jobs.tsx, components/job-monitor.tsx, and app/globals.css add validation and preparation controls, recoverable history, a reusable job monitor, elapsed time, logs, poll and retry behavior, and cancellation.
- frontend/app/api/jobs, lib/job-proxy.ts, lib/job-api.ts, lib/jobs.ts, and tests/jobs.test.ts implement and verify the typed loopback contract, action allowlist, busy errors, terminal states, and real-progress validation.
- The sibling backend's jobs and datasets routes, jobs service, musicai/preparation_job.py, and musicai/segments.py integrate both actions with its persisted subprocess manager. Validation decodes indexed files. Preparation stages and publishes its result through the manager. Worker progress comes from actual indexed file totals.
- The sibling backend's tests/test_dataset_validation_jobs.py exercises real validation success and decode failure alongside the shared manager's controlled lifecycle tests. docs/api-contracts.md documents the frontend request, status, progress, and error contracts. Dependency lockfiles are unchanged.

### Commands and outcomes

- npm.cmd --prefix frontend test passed all 13 tests.
- npm.cmd --prefix frontend run typecheck and npm.cmd --prefix frontend run build passed. An initial type check found an overly narrow detail type guard; the rerun passed after correction.
- .venv\Scripts\python.exe -m pytest -p no:cacheprovider -q in the sibling checkout passed all 53 tests, including frozen-input preparation, validation success/failure, queued and running cancellation, busy rejection, and restart recovery.
- A Node smoke script launched production Next.js and real FastAPI on loopback with generated valid and invalid audio and a controlled slow test worker. Headless Chrome verified successful validation and preparation, stderr and exit details on failure, HTTP 409 on a competing start, restoration of active monitoring after refresh, cancellation, and interrupted status after backend restart. It displayed 100% for one verified completed file and no percentage for the slow worker with no reported total.
- git diff --check passed. Tests used a temporary workspace and generated audio. Full-corpus runtime was not measured.

### Next day prerequisites

Prepare an authorized local dataset and verify the resulting segment manifest before wiring any training controls. Reuse the managed job status and polling contract for the next allowlisted compute operation.
