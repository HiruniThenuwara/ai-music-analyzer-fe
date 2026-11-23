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
