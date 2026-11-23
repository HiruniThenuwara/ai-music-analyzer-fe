# API contracts

Research endpoints use /api. The assistant namespace is reserved at /api/v1/assistant. The frontend system snapshot and error envelope are defined in frontend/lib/contracts.ts.

## GET /api/system

The request takes no parameters or body. The browser calls the same-origin Next.js server. The server requests http://127.0.0.1:8000/api/system with a three-second timeout and rejects redirects. Set the server-only MUSICAI_BACKEND_PORT to match the backend MUSICAI_PORT when using a custom port. Valid ports are decimal integers from 1 through 65535. The proxy sets its own upstream headers. Responses use Cache-Control: no-store.

```http
GET /api/system HTTP/1.1
Host: 127.0.0.1:3000
Accept: application/json
```

HTTP 200 example for a fresh workspace with the base backend dependency install

```json
{
  "status": "ok",
  "version": "0.1.0",
  "api_version": "1",
  "ready": false,
  "capabilities": {
    "cpu_available": false,
    "cuda_available": false,
    "audio_formats": {}
  },
  "counts": {"datasets": 0, "jobs": 0, "models": 0, "analyses": 0}
}
```

The four counts are nonnegative integers for valid records in the manifests, jobs, registry, and analyses stores. Runtime probes report PyTorch CPU and CUDA availability and a map of libsndfile format codes to display names. Readiness requires accessible and valid metadata stores, CPU support, and at least one audio format. CUDA is optional. The proxy validates contract version 1 and returns the documented fields.

### Error responses

An unreachable backend returns HTTP 503.

```json
{"error":{"code":"BACKEND_UNAVAILABLE","message":"Could not reach the local MusicAI backend."}}
```

The proxy passes through a valid HTTP 503 error payload with code corrupt_metadata or storage_unavailable. For example

```json
{"error":{"code":"corrupt_metadata","message":"The jobs record 'job-2' has invalid metadata. Inspect its JSON and schema."}}
```

A malformed upstream success payload returns HTTP 502. Unexpected upstream HTTP failures also return 502 with the upstream status in the message.

```json
{"error":{"code":"INVALID_BACKEND_RESPONSE","message":"The backend system endpoint returned invalid data."}}
```

Invalid frontend port configuration returns HTTP 500.

```json
{"error":{"code":"INVALID_CONFIGURATION","message":"MUSICAI_BACKEND_PORT must be a valid TCP port."}}
```

Unsupported writes receive HTTP 405. Dashboard, Settings, and the header share the system query. The query polls every ten seconds while active and supports manual refresh or retry. Failed queries hide counts and capability data until a successful response.

## GET /api/health

The legacy frontend endpoint checks the same upstream /api/system URL and returns HTTP 200 with only the health status. Its errors follow the system proxy contract.

```json
{"status":"ok"}
```
