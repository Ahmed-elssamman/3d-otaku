# Administrator product writes

Source contract, 2026-09-17. Product mutation requests now bind to the version the administrator actually reviewed. An old editor cannot undo a newer unpublication, overwrite newer copy, or delete a changed product merely because its request reaches the server later.

## Revision contract

Every full administrator product response contains private top-level `revision: number | null`, including list, detail, create, duplicate and manufacturing-review responses. This is separate from `manufacturingReview.revision`. It is derived from the stored MongoDB `__v` only when that value is a nonnegative safe integer that can be incremented safely. Missing, null, incorrectly typed, negative, fractional or exhausted revisions return null; reads never initialize or repair them. Public product responses expose neither revision nor `__v`.

| Endpoint under `/api/admin/products/:id` | Required request body |
| --- | --- |
| `PUT /` | `{ expectedRevision: number, ...editedProductFields }` |
| `PATCH /status` | `{ expectedRevision: number, isActive: boolean }` |
| `PATCH /featured` | `{ expectedRevision: number, isFeatured: boolean }` |
| `DELETE /` | `{ expectedRevision: number }` |

Capture the revision with the loaded record. Do not substitute a current timestamp or fetch a new revision and automatically retry a stale draft. The ordinary field allowlist excludes both `expectedRevision` and client-supplied `revision`/`__v`. Status switches require actual booleans, not strings or truthy values.

Authorization runs first: anonymous 401, customer 403. A missing/deleted product returns 404 before revision/body validation. Missing or malformed `expectedRevision` returns 422 with `errors.expectedRevision: string[]`; stale or unusable saved revisions return 409 with the same field. A stale request is rejected before assigning fields, invalidating approval or processing media metadata. A competing write after the initial read is rejected by the atomic `__v` and `deletedAt: null` save conditions. If deletion won, the loser receives 404. No rejected mutation changes the document, review history or referenced media.

Success returns the new full product and its incremented revision; soft deletion retains its existing `{ data: null }` response. A lost response requires explicit reload and review because repeating the old revision is not an idempotent success acknowledgment. The UI must preserve unsaved input until the administrator chooses what to discard. An unusable legacy revision needs an explicit administrative data repair outside this API, never an invented zero.

Duplication does not mutate its source, so it needs no source-write precondition. It creates a separate inactive, review-required product with its own revision. Manufacturing save/quote/approval still use their dedicated review revision; enrollment still uses its existing `expectedUpdatedAt`. Their full product responses supply the current top-level revision for subsequent product mutations.

## Configuration bounds

Raw administrator create/update validation and Product model validation reuse the existing checkout configuration limits. There is no new pricing, material, measurement or lead-time policy:

| Fields | Accepted values |
| --- | --- |
| `name` | Nonempty text, at most 500 characters; normal stored-name trimming remains |
| `material`, `finish`, `color`, `size`, `weight`, `printTime`, `layerHeight`, `infill` | Text up to 500 characters, or null for an absent specification |
| `safetyNote` | Text up to 5,000 characters, including empty text |
| `image` | Text up to 2,000 characters, including empty text |
| `modelUrl`, `posterImage`, `socialImage` | Text up to 2,000 characters, or null |
| `gallery` | At most 30 strings, each up to 2,000 characters, or null for no gallery |
| `productionTimeMin`, `productionTimeMax` | Null or a finite numeric value from 1 through `Number.MAX_SAFE_INTEGER`; existing made-to-order range/unit requirements remain |
| `modelType`, `productionTimeUnit` | Existing supported enum values or null |
| `isActive`, `isFeatured`, `isMadeToOrder` | Actual booleans |

Omitted optional fields retain existing values on update and existing defaults on creation. Null specification strings retain their stored null representation; checkout continues its established null-to-empty canonicalization. Oversized or wrongly typed supplied values return field-specific 422 without truncation, coercion or partial updates. Model saves independently reject out-of-bounds stored values. These checks prevent, for example, a successful safety-note edit that leaves an approved public product impossible to quote.

Existing approval invalidation, new-product draft requirements, inactive/deleted visibility and media-file retention remain intact. Legacy malformed raw data is still rejected by quotation, and committed orders/approved checkout decisions retain their existing replay and snapshot semantics. This change does not rewrite catalog facts or old decisions.

## Verification status

Nine new HTTP/model cases in `outako/backend-api/test/admin-product-writes.test.js` cover all four mutation preconditions, authorization, stale editor republication, each mutation losing a paused write race, deletion winning a paused save, raw unusable revision types, boolean strictness, approved-product quote preservation, exact bounds/null drafts and independent model validation. Existing product fixtures capture actual revisions before their intended requests, without automatic retries.

On 2026-09-17 the final `npm run check` plus administrator OpenAPI revision-contract assertions passed in **6.913 seconds**. The full `npm test` run then passed **201/201**, zero failures/skips/cancellations, **13913.6851 ms** runner time (**14.395 seconds** wall), starting **07:17:15.147 UTC**. Final logs are `.local/admin-product-writes-check-final-2026-09-17.log` and `.local/admin-product-writes-full-test-final-2026-09-17.log` under the backend directory.

The first full run is retained honestly: **195/201**, with six failures. An existing preservation test exposed the newly introduced lean-hydration default overwriting an excluded private provenance field; hydration now retains the original exclusion projection. One category fixture omitted its DELETE body and four new quote fixtures lacked required store settings; those fixtures were corrected without production behavior changes. The affected three test files then passed **33/33** in **5537.8576 ms** before the final checks. Original logs remain `.local/admin-product-writes-check-2026-09-17.log`, `.local/admin-product-writes-full-test-2026-09-17.log` and `.local/admin-product-writes-focused-fix-2026-09-17.log`.

The automated tests used disposable databases. Coordinated browser verification on the final **07:31 build/API201** passed **10/10 scoped desktop/mobile administrator and manufacturing cases in 1.4 minutes**, including a natural 13-second quota wait. The scope verifies the editor lock during an actual PUT, stale revision conflict/explicit review, configuration-bound feedback and existing manufacturing actions. The earlier invocation failed collecting a Chrome response body after deletion had already succeeded and the list showed zero matches; that fixture timing issue was corrected before the final pass. These results are a scoped run, not a new full storefront-suite result.

## Guarded local activation

Source201 became live on **2026-09-17 at 07:27:58.279 UTC**; health and owned process/listener checks passed at **07:28:35.782 UTC**. The owned replacement is PID **9764**, session **15274**, `node .local/restore-api-201.mjs`, listening only on `127.0.0.1:4000`.

Before stopping the previous runner, a narrowly authorized loopback inspector capture preserved its in-memory signing secrets privately. Process identity and port ownership were checked before inspecting environment values; no secret values were printed, and the inspector was closed immediately. A complete EJSON snapshot at **07:25:21.235 UTC** preserved all nine collections, their indexes/options, runtime administrator credentials and signing configuration. An isolated replacement first restored and verified that snapshot while the original API remained alive. A final unchanged-source comparison passed at **07:27:46.669 UTC**, before stopping only the verified old PID.

The live replacement restores raw data before listening, with no seeds, imports, catalog rewriting or business resets. All nine collections/documents/indexes matched the snapshot: **13 orders, 15 checkout decisions, 3 users, 4 refresh-token records, 16 products, 1 settings record**, and empty category/custom-request/contact collections. The original **12 public products and 4 pending inactive drafts**, full settings, **44 image sources/70 variants**, and all **114 file hashes and sizes** are unchanged. Four public draft reads returned 404; anonymous administrator categories returned 401; authorized category counts remained seven categories/16 products. Administrator product revisions match raw stored versions and remain excluded from public responses.

The same authentication token and guest tracking capability verified against the old process succeeded against the replacement, with the same receipt and `Cache-Control: no-store`. No login, checkout or other business POST was used. Private evidence is under backend `.local/`: `admin-product-writes-activation-snapshot-1789629921236.json`, `admin-product-writes-activation-pointer.json`, `admin-product-writes-staged-restore-report.json` and `admin-product-writes-activation-report.json`. Credentials, secrets and capability tokens remain only in ignored private artifacts. A future restart must capture a fresh snapshot so later QA or business records are never discarded by replaying this older baseline.

## Post-QA preservation

The read-only comparison passed at **2026-09-17T07:39:58.237Z**, with API PID9764/session15274 healthy. Every original product matched the complete activation record, including `_id`, `__v` and timestamps. Full raw settings, all **13 orders and 15 checkout decisions**, original media metadata and **114 file hashes/sizes** were unchanged. The original 12 public products/four pending private drafts, seven categories/16 nondeleted products, four draft404 responses and anonymous administrator401 were verified again. The same pre-activation authentication and tracking capabilities still worked, with the identical receipt and no-store header.

Exactly **11 additional owned QA products** remain soft-deleted and inactive; there are **zero active QA leftovers**. Current totals are **27 products, 13 orders, 15 decisions, 3 users, 15 refresh-token records, 1 settings record**, and no custom/contact requests. Refresh-token growth came from authorized browser sign-ins. This check performed no login, POST, database mutation, cleanup or restart.

A fresh complete private snapshot preserves the resulting state for a future coordinated restart: `.local/admin-product-writes-post-qa-snapshot-1789630798238.json`, with pointer `.local/admin-product-writes-post-qa-pointer.json`. The safe comparison report is `.local/admin-product-writes-post-qa-preservation-1789630798238.json`. All paths are relative to the backend directory; no private contents are published.
