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

## Dataset source preferences

GET /api/datasets/sources takes no body. The proxy calls the same path on the loopback backend. A fresh configured source starts disabled with no saved paths and no accepted license. The backend supplies links and release metadata from its official source catalog. When a release publishes its terms on the download page, both URL fields can be the same.

Example HTTP 200 response with a single source shown

```json
{
  "extraction_root": "D:/MusicAI/data",
  "sources": [{
    "id": "instrument-v1-irmas",
    "name": "IRMAS",
    "source_url": "https://www.upf.edu/web/mtg/irmas",
    "license_url": "https://www.upf.edu/web/mtg/irmas",
    "license_name": "CC BY-NC-SA 3.0 and UPF conditions",
    "license_revision": "1.0",
    "supported_annotations": ["Instrument and drum tags", "instrument text labels"],
    "extraction_guidance": "Keep WAV files and their matching testing .txt files together in the original training/testing folders.",
    "audio_path": null,
    "annotation_path": null,
    "audio_status": "not_configured",
    "annotation_status": "not_configured",
    "enabled": false,
    "license_accepted": false,
    "revision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }]
}
```

Paths are relative to the backend's dataset root, configured by MUSICAI_DATASET_ROOT. Folder states are available (directory found), missing (configured path absent), unavailable (unsafe, inaccessible, or not a directory), and not_configured. Reads and saves do not create the extraction directory. Saving preferences does not index files or change manifest counts.

PUT /api/datasets/sources/{source_id} requires a same-origin loopback request with application/json. Use the current source revision as supplied by GET.

```json
{
  "audio_path": "irmas",
  "annotation_path": "irmas",
  "enabled": true,
  "accept_license": true,
  "revision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

A successful save returns the updated source object with its new revision, backend-confirmed acceptance, and fresh folder checks. Set accept_license to false and enabled to false to withdraw acceptance. Enabling requires an audio path and acceptance. A subsequent release or terms change invalidates prior acceptance and disables the source until confirmed again.

HTTP 409 example

```json
{"error":{"code":"source_changed","message":"Source settings or license changed. Refresh before saving."}}
```

Invalid paths or missing enable prerequisites return 422. Unknown sources return 404. Origin rejection returns 403. An unreachable backend returns 503 with BACKEND_UNAVAILABLE. Responses use Cache-Control: no-store.

## Dataset explorer

GET /api/datasets/explorer lists only imported manifests. Counts are scoped to a configuration/source pair. The catalog supplies the allowed instrument and split filters and the audio preview duration limit.

```json
{
  "manifests": [{"configuration":"instrument-v1","source":"irmas","name":"IRMAS","release":"1.0","examples":2}],
  "instruments": ["piano","guitar","bass","strings","woodwind","brass","organ","synth","percussion","voice"],
  "splits": ["train","validation","test","unspecified"],
  "preview_seconds": 30
}
```

GET /api/datasets/explorer/{configuration}/{source}?filename=alpha&instrument=piano&split=train&page=1&page_size=25 applies all supplied filters on the server. Filename is a case-insensitive substring of the basename. Instrument matches positive labels. Split is exact. Page numbers start at 1 and page_size is 1 through 100. Index order determines pagination. The report covers the whole selected manifest. The top-level total and label_counts cover all matching rows before pagination. Multiple positive labels can apply to a sample.

```json
{
  "report": {
    "configuration":"instrument-v1","source":"irmas","name":"IRMAS","release":"1.0",
    "examples":2,"path":"irmas",
    "index_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "split_counts":{"train":2,"validation":0,"test":0,"unspecified":0},
    "label_counts":{"piano":1,"guitar":1,"bass":0,"strings":0,"woodwind":0,"brass":0,"organ":0,"synth":0,"percussion":0,"voice":0},
    "status":"exploratory",
    "status_reason":"The local import lacks complete release split coverage or uses unspecified splits."
  },
  "page":1,"page_size":25,"total":1,
  "label_counts":{"piano":1,"guitar":0,"bass":0,"strings":0,"woodwind":0,"brass":0,"organ":0,"synth":0,"percussion":0,"voice":0},
  "samples":[{
    "id":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","filename":"alpha[pia].wav","audio_path":"pia/alpha[pia].wav",
    "midi_path":null,"split":"train","group":"pia/alpha[pia].wav","source_labels":["pia"],"instruments":["piano"]
  }]
}
```

Canonical describes the presence of all expected release split categories without unspecified rows. It indicates train and test for IRMAS and train, validation, and test for Slakh2100, NSynth, and MAESTRO. It makes no release completeness or benchmark claim. MedleyDB and partial or unspecified split coverage are exploratory. Overlapping configurations are reported separately.

GET /api/datasets/explorer/{configuration}/{source}/{sample_id}/audio?index={index_sha256} returns HTTP 200 audio/wav with a decoded PCM preview of up to 30 seconds. The runtime source-read budget can shorten previews for high-rate or multichannel input. The first two channels are used for multichannel files. The backend verifies the current manifest revision and resolves the indexed path within the configured dataset root. Browser playback and the waveform use the same returned WAV.

A missing indexed file returns HTTP 404.

```json
{"error":{"code":"audio_missing","message":"The indexed audio file is missing. Check the source extraction."}}
```

Unsupported decoding returns 415 with decode_unsupported. An unavailable runtime decoder returns 503 with decoder_unavailable. A changed manifest revision returns 409 with manifest_changed. Invalid filters return 422. The proxy uses no-store for all explorer responses.

## Managed dataset jobs

The browser submits POST /api/jobs from the same loopback origin with application/json.

```json
{"kind":"validate_dataset","configuration":"instrument-v1"}
```

Allowed kinds are validate_dataset and prepare_dataset. The proxy maps them to fixed backend routes POST /api/datasets/{configuration}/validate (no body) and POST /api/datasets/{configuration}/prepare (empty JSON object for backend defaults). The backend freezes the imported indexes before starting the worker. Validation decodes indexed audio and preparation writes a prepared segment manifest. The frontend uses the backend's allowed configurations and preparation defaults. No executable arguments are accepted by this proxy.

An accepted request returns HTTP 202 and a job summary.

```json
{
  "id":"job-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "kind":"validate_dataset",
  "configuration":"instrument-v1",
  "state":"queued",
  "created_at":"2026-11-25T08:00:00Z",
  "started_at":null,
  "finished_at":null,
  "cancel_requested_at":null,
  "exit_code":null,
  "message":null,
  "result":null
}
```

GET /api/jobs returns an object with jobs (persisted summaries, newest first) and configurations (objects with id and exploratory). GET /api/jobs/{job_id} returns the summary plus stdout_tail, stderr_tail, and progress. Example detail fields from a running job

```json
{
  "stdout_tail":"Validating audio for instrument-v1.",
  "stderr_tail":"",
  "progress":{"completed":2,"total":8,"unit":"files"}
}
```

Progress is null until the backend has a known count for that work phase. Terminal states are succeeded, failed, cancelled, and interrupted. On restart the backend marks unfinished records interrupted. The UI shows unknown elapsed time for interruptions when the true end time cannot be established. Status and log requests use Cache-Control: no-store.

POST /api/jobs/{job_id}/cancel requires the same local origin and returns the backend's job summary. A running job can remain running with cancel_requested_at set until the worker has stopped. A cancellation after the worker exits can return 409.

A start while the compute slot is occupied returns HTTP 409.

```json
{"error":{"code":"compute_busy","message":"A compute job is already active."}}
```

Starting without imported sources returns HTTP 422 with no_imported_sources. A worker failure after acceptance is a failed job with the exit code and stderr tail visible through the detail endpoint. Proxy errors use the standard error envelope.
