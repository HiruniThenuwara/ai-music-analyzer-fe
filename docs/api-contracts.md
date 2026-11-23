# API contracts

Research endpoints use /api. The assistant namespace is /api/v1/assistant. Health is the only endpoint exposed by this frontend. The typed health response and proxy error envelope are defined in frontend/lib/contracts.ts.

## GET /api/health

The browser calls the Next.js server on the same origin. The server issues a GET to http://127.0.0.1:8000/api/health by default, with a three-second timeout and redirect rejection. Set the server-only MUSICAI_BACKEND_PORT to match the backend MUSICAI_PORT when using a custom port. Ports must be decimal integers from 1 through 65535. The proxy supplies its own upstream headers and never forwards browser cookies or authorization. Responses use Cache-Control: no-store.

Request example

```http
GET /api/health HTTP/1.1
Host: 127.0.0.1:3000
Accept: application/json
```

Successful upstream and proxy response body (HTTP 200)

```json
{"status":"ok"}
```

The proxy requires a successful upstream HTTP response with a JSON object whose status is the literal string "ok". It drops additional upstream fields.

Unreachable backend or timed-out request (HTTP 503)

```json
{"error":{"code":"BACKEND_UNAVAILABLE","message":"Could not reach the local MusicAI backend."}}
```

Invalid upstream payload (HTTP 502)

```json
{"error":{"code":"INVALID_BACKEND_RESPONSE","message":"The backend health endpoint returned invalid data."}}
```

A non-successful upstream HTTP status also returns 502 with INVALID_BACKEND_RESPONSE and the message "The backend health endpoint returned an error." Invalid port configuration returns HTTP 500.

```json
{"error":{"code":"INVALID_CONFIGURATION","message":"MUSICAI_BACKEND_PORT must be a valid TCP port."}}
```

Unsupported writes to /api/health receive HTTP 405. Other API paths currently receive the framework's HTTP 404. The client checks health when mounted, polls every ten seconds while the page is active, and supports a manual refresh on Dashboard and Settings.
