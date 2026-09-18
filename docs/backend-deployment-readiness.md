# Backend media paths and deployment readiness

Source contract, 2026-09-17. This change does not rewrite catalog records, media URLs, MongoDB data or signing secrets. Activation and execution evidence are recorded below separately.

The subsequent [proxy-trust change](backend-proxy-trust.md) passed the full **217-test** backend suite and was activated locally at **15:52:56.928 UTC**, preserving this media/readiness contract and all captured data. The 208-test run and earlier activation below remain historical evidence for the original deployment change.

## Persistent uploads

`UPLOADS_ROOT` selects one absolute filesystem directory for Express `/uploads` delivery, administrator image/model writes, image variant generation/manifest reads, local snapshot caching and the existing media seed scripts. If unset or empty, it resolves relative to the backend module as `outako/backend-api/src/uploads`, independently of the process working directory. Relative paths are rejected at startup; Windows paths must include a drive or UNC share. An explicit mounted directory such as `/data/uploads` is supported on Linux. The application process needs read/write permission there.

`UPLOAD_BASE_URL` continues to control the public origin only. Existing `/uploads/...` paths and original media bytes remain unchanged. A deployment that selects a different root must preserve the whole existing uploads tree there, including originals, WebP variants and sidecar manifests. The setting neither moves existing files nor rebuilds catalog metadata. Content-addressed variant responses retain their immutable cache headers; originals retain the existing policy. Local backfill still requires an explicitly allowed local/development/test database and retains its path/symlink safeguards.

The local snapshot helper loads configuration when invoked, after the development runner has established its environment. Importing that helper must not prematurely freeze development ports, CORS origins or signing configuration.

Swagger JSON is resolved relative to `src/app.js` as `backend-api/swagger.json`. `/api/docs` and `/api/docs/swagger.json` therefore work from another process working directory. The existing configured API prefix is respected.

## Dependency probe

`GET /api/ready` is public and returns `Cache-Control: no-store`. With a custom `API_PREFIX`, the same suffix is mounted under that prefix. It is registered before the shopper API quota and request body parsers; probes neither consume nor inherit that quota. CORS preflight retains `no-store`.

| HTTP | Exact JSON body                                                                   |
| ---- | --------------------------------------------------------------------------------- |
| 200  | `{"success":true,"message":"API is ready.","data":{"status":"ready"}}`            |
| 503  | `{"success":false,"message":"API is not ready.","data":{"status":"unavailable"}}` |

Each request checks the current Mongoose connection and executes an actual primary MongoDB `ping` with the installed MongoDB driver's `timeoutMS: 1000`. This client deadline covers server selection and command/network waiting. A disconnected connection fails immediately. No cached success is reused; a later successful probe recovers naturally. Failure responses and logs do not expose the URI, hosts, server errors, credentials or database contents. Normal event-loop scheduling and HTTP transport can add small overhead to the one-second database deadline.

`GET /api/health` remains the existing process-liveness response and still uses the global 300/minute API quota. A running HTTP process with unavailable MongoDB can return health 200 and readiness 503. Readiness establishes MongoDB connectivity to a primary, not payment-provider configuration, manufacturing approval, filesystem capacity or a guarantee that a future write will succeed. Normal server startup still finishes its existing database/bootstrap work before listening.

## Verification

The full backend suite passed **208/208** on its first invocation on **2026-09-17**, including all seven new deployment regressions. Syntax checks passed first in **6.597 seconds**, from **08:15:10.678 to 08:15:17.281 UTC**. The full suite ran from **08:15:24.527 to 08:15:39.815 UTC**, **14822.0639 ms** runner time / **15.284 seconds** wall time, with no failures, skips or reruns. The actual blocked-command timeout/recovery case completed in **1083.2937 ms**. Preserved outputs are `outako/backend-api/.local/deployment-readiness-check-2026-09-17.log` and `.local/deployment-readiness-full-test-2026-09-17.log`.

- Separate child processes launched from a different working directory prove default and explicit mounted roots share original/model uploads, real decoded WebP HTTP delivery, variant-manifest readers, cached snapshot reads and Swagger delivery. No remote media requests are permitted by these fixtures.
- Relative/drive-relative root configuration fails at import rather than choosing an unintended working-directory path.
- Actual Mongo command monitoring verifies each probe pings. A server-side command failure returns only the exact generic response; subsequent requests recover.
- Disconnect/reconnect and an actual five-second Mongo failpoint verify unavailable/recovered responses and a client timeout before the blocked server resumes.
- Exhausting the existing liveness quota does not block readiness, while the liveness quota and tracking middleware remain unchanged.

Commands executed from `outako/backend-api`:

```text
npm run check
npm test
```

If diagnosis requires only the new cases: `node --test test/deployment-media.test.js test/deployment-readiness.test.js`. All test database operations use disposable MongoDB instances; no shared catalog or business records are touched. The fixture removes only its recorded owned files and its guarded temporary directory.

## Preserving activation

After the unchanged 07:31 frontend/API201 completed all **76 distinct browser cases** through five reports on 2026-09-17, a fresh complete post-QA snapshot was captured at **08:30:08.323 UTC**. Every pre-full-QA product/order/checkout-decision record remained exact. All business settings values were preserved; the approved settings tests changed only `updatedAt`, from **06:43:16.473 to 08:26:07.495 UTC**. That new timestamp, the settings identity and revision were preserved exactly during activation.

The previous access capability was near/past expiry, so one ordinary authorized administrator login on the old API supplied a current capability; its new refresh record was included in the fresh snapshot. Signing secrets, existing guest capability and receipt were preserved. No business POST probes, catalog imports, seeding, data cleanup or QA-data reset occurred.

A staged API208 restored all nine collections, raw BSON types/IDs/revisions, collection options and indexes on a separate disposable MongoDB instance. Stage verification passed at **08:30:23.236 UTC**. The still-running old database was compared again at **08:31:18.181 UTC** and remained identical to the fresh snapshot before its verified process was stopped. Final activation passed at **08:31:28.318 UTC**; process/listener identity was checked at **08:31:46.065 UTC**. The owned process is PID **6452**, execution session **5226**, on `127.0.0.1:4000`.

Preserved totals: **37 products** (16 originals and 21 soft-deleted QA records), **35 orders**, **39 checkout decisions**, **14 contact messages**, **4 custom requests**, **13 users**, **44 refresh records** and **1 settings record**. The 16 original products retain 12 public products, four inactive pending drafts, seven categories and all **44 source / 70 variant** metadata and file hashes. Readiness returned no-store 200, liveness 200, Swagger/original/variant delivery 200, all four draft lookups 404 and anonymous administrator access 401. Current authentication and the original guest receipt were verified through GET requests; all raw restored collections and indexes remained exact afterward.

Private, ignored evidence under `outako/backend-api/.local/`:

- `deployment-208-post-qa-snapshot-1789633808323.json`
- `deployment-208-preactivation-report.json`
- `deployment-208-staged-restore-report.json`
- `deployment-208-pre-stop-report.json`
- `deployment-208-activation-report.json`

The 76-case browser run preceded this deployment-only activation on API201. On API208, the real browser upload/editor smoke then passed **2/2 desktop/mobile cases** on its first invocation in **31.0 seconds** (desktop **12.2 seconds**, mobile **16.9 seconds**): `artifacts/playwright-2026-09-17-api208-upload-smoke/results.json`. This is scoped post-activation coverage, not a separate full browser rerun.

Final read-only preservation passed at **08:36:57.535 UTC** against the activation snapshot. Every activation raw document, collection option/index, full settings document (including `updatedAt: 08:26:07.495 UTC`) and original media hash remained exact. The smoke added precisely two owned soft-deleted QA products and two refresh records. Final totals are **39 products** (16 originals and 23 soft-deleted QA records), **35 orders**, **39 decisions**, **14 contacts**, **4 custom requests**, **13 users**, **46 refresh records** and **1 settings record**, with no active QA leftovers. Existing authentication, the original guest receipt, readiness/liveness, category counts and private draft/admin gates remained valid. No login, POST, restart, cleanup or database writes were made during this final check.

The new complete final snapshot is `.local/deployment-208-final-snapshot-1789634217536.json`; its verified report is `.local/deployment-208-final-preservation-1789634217536.json`. **Future restoration must start from `.local/deployment-208-latest-preservation-pointer.json`**, which includes the smoke-test records. The private `restore-api-208.mjs` helper now rejects its older activation pointer when this newer preservation pointer exists, before starting a replacement database. Historical activation snapshots remain evidence and must not be replayed to reset current data. PID **6452** / session **5226** remains running.
