# Admin operations frontend — 17 September 2026

## Current follow-up verification — 17 September, 05:09 UTC build

The full Angular suite passed **239/239 tests across 39 files in 6.38 seconds**, first attempt (test bundle `2026-09-17T05:09:06.658Z`, 8.363 seconds); backend passed **178/178**. Production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**. Four exact build files are recorded in `artifacts/performance/current-0509-build-identity.json`.

Final cart/media, guest-checkout and extended lost-response checks passed **6/6 in 27.3 seconds** (three per device, one invocation, zero retries) on this build. Broader follow-up coverage is scoped: **11/12 desktop** on 04:49 plus corrected contact **2/2** on 04:57, and **12/12 mobile** on 04:57. The other **23 scenarios retain historical 04:03 coverage**. This is not a new 70-case or complete-device pass. [Public-page QA](public-pages-qa.md#current-follow-up-verification--17-september-0509-utc-build) retains every report, the before-fix tracking failure, corrected application behavior and exact coverage limits.

The shipping scenario was rechecked within the 12-case follow-up scope. Other administrator operations and payment browser scenarios retain historical 04:03 coverage.

## Historical configuration checkpoint — 17 September, 04:03 UTC

The full Angular suite passed **208/208** and backend passed **169/169**. Production is `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`, built at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. All **35 unique scenarios are verified on both devices through scoped invocations**: desktop **34/35 in 2.5 minutes**, then **34/35 in 2.7 minutes**, followed by shipping **1/1 in 4.7 seconds**; mobile **34/35 in 2.7 minutes**, followed by admin operations **1/1 in 10.1 seconds**. This covers **70 project cases**, without a clean complete-device pass. The three failures were test-fixture issues: a broad receipt list selector, public/private item equality, and delayed CDP response-body access. Their corrections preserve business assertions and introduce no application/backend/build change. [Public-page QA](public-pages-qa.md) retains all five reports, the exact failure/recheck scope and the separate read-only visual probe. Earlier dated results below remain historical.

The authenticated admin panel now provides Arabic RTL management screens at `/admin/orders`, `/admin/custom-orders`, and `/admin/contact-messages`. All three use the real `/api/admin` endpoints; there are no success mocks or local-data fallbacks.

## Behavior

- Server pagination (10/20/50), explicit search, status filters and newest/oldest sorting. Requests cancel when replaced. Loading, empty and failed-list states remain distinct.
- Lists display references, names, dates and brief context. Detailed customer data appears only after opening a record and fetching its current version. Tracking tokens, submission keys and authentication details are not displayed.
- Order details include delivery fields, line items, backend totals, shipping confirmation and public status history. Unconfirmed delivery is labelled clearly; a status change does not claim payment was received.
- Order lines now display the public configuration captured with the order. Only the protected order-detail response supplies its manufacturing snapshot: model/source references, review state and recorded sample/measurement evidence. These are bounded escaped text, without fetching linked models or images. Missing or malformed snapshots are labelled unavailable; current product data never substitutes for the order's evidence. The page distinguishes details not yet loaded from a known null legacy snapshot and preserves matching loaded evidence across status/shipping/payment responses that omit it. It does not persist a separate private snapshot cache.
- The separate shipping panel records an agreed fee, including zero, only after explicit review and final confirmation. Revision/status checks and a request key protect the write. Conflicts preserve the fee/note and require reloading; shipping history and its notes are administrator-only. Parent navigation/status changes are blocked during a shipping draft or request, and known-stale status data blocks shipping until reload. See [shipping workflow](order-shipping-frontend.md).
- The manual-payment panel records completed external collections/refunds and separate clerical corrections, with revision/invoice guards and exact keyed recovery after uncertain responses. Private evidence stays in administrator history; customer summaries show recorded totals without claiming provider verification or an automatic cancellation refund. See [payment workflow](order-payments-frontend.md).
- Custom requests show the idea, description, quantity, dimensions, material, color, design permission and customer notes. Machine choices are translated to Arabic. HTTPS references open on explicit user action and are not embedded or fetched automatically.
- Messages open without being marked read. Read/unread changes require an explicit review and save, like other status updates. No email or WhatsApp message is sent automatically.
- The status selector uses `allowedNextStatuses` from the server. A review step precedes every PATCH. Requests include `expectedStatus`; a 409 conflict requires reloading before further edits. An uncertain network failure also requires refreshing details before retrying.
- Optional order notes are clearly labelled as visible to the customer; custom-request notes are labelled internal. Both have a 1,000-character limit. Successful changes show the returned history and refresh the list.
- All pages share the existing admin guard. Backend authorization remains authoritative.

The dashboard now shows actual store order totals, custom-request totals, unread messages and nondeleted product counts. Its API failure state no longer fabricates zeros from a local cache. Navigation and the dashboard use the store's calm ivory, white and moss palette, Arabic labels and mobile RTL navigation.

## Files and standards

`features/admin/pages/operations` contains the shared standalone page and companion controls. Typed operation API/view interfaces live in `models/admin-operation.model.ts`, enums in `enums/admin-operation.enum.ts`, labels/configuration in `data/admin-operations.data.ts`, and HTTP mapping in `services/admin-operations.service.ts`. Existing dashboard, routes and navigation files were updated within the same feature.

Components use `inject`, signals/computed state, typed reactive controls, external HTML/SCSS, modern Angular control flow and `takeUntilDestroyed`. Templates bind precomputed values and delegate events to small methods. HTTP mapping uses the existing `ApiService` and `HttpClient` for the keyed shipping PATCH; normalized errors use `ApiErrorResponse.statusCode`.

Angular `list_projects` confirmed Angular 21. The mandatory best-practices tool was retried and returned `Unexpected response type`; the supplied workspace standards were applied directly.

## Verification

Historical 03:07 UTC verification is **177/177 Angular tests across 30 files** in **5.10 seconds** (test bundle `2026-09-17T02:53:16.414Z`) and **155/155 backend tests**. Final production `main-LACTZSO4.js` / `styles-TFH64YQR.css` completed at **`2026-09-17T03:07:27.817Z` in 9.405 seconds**, initial **481.21 kB raw / 128.78 kB estimated transfer**. Complete desktop passed **35/35 in 3.1 minutes** and mobile **35/35 in 2.6 minutes**: **70 project cases across two invocations**, one worker, zero retries, fresh disposable APIs and no application change between devices. All final cases passed their first attempt, including the operations workflows, agreed shipping and six payment cases. Reports: `artifacts/playwright-2026-09-17-checkout-{desktop,mobile}-final/report`. The earlier 02:58 desktop result was 31/35, with three wrong-origin admin/settings fixtures and one checkout text assertion corrected afterward; its report remains at `artifacts/playwright-2026-09-17-checkout-desktop/report`. See [public-page QA](public-pages-qa.md) for precise history and [checkout pricing](checkout-pricing.md) for the quote requirement used by new order fixtures.

### Historical recovery checkpoint — 17 September, 02:01 UTC

That checkpoint used `main-GN52CWI4.js` / `styles-2XRGXKQX.css`, built at `2026-09-17T02:01:33.744Z` in **10.083 seconds**, initial **479.73 kB raw / 128.00 kB estimated transfer**. All **160/160 Angular tests across 29 files** passed in **5.19 seconds** (test bundle `02:00:48.628Z`), and **132/132 backend tests** passed. Both suites passed on the first run.

Complete desktop and mobile runs passed **33/33 in 2.6 minutes** and **33/33 in 2.2 minutes** on that same build: **66 project cases (33 unique scenarios × two devices)** across two complete invocations. Both passed on the first attempt, with one worker, zero retries, a freshly restored disposable API for each device and no intervening application edit. This includes both existing operations workflows, agreed shipping and **six manual-payment project cases**, including terminal-proof recovery. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. Exact scenario scope is maintained in [implementation progress](implementation-progress.md#current-verification-evidence) and [payment QA](order-payments-qa.md).

The [performance audit](performance-audit.md) identifies the build and limits of each measurement; functional operations results do not update earlier Lighthouse evidence.

### Historical payment checkpoint — 01:09 UTC

The `main-O65VYLKE.js` / `styles-DWJFAQFT.css` build completed at `2026-09-17T01:09:53.339Z`. It passed **152/152 Angular tests across 29 files**, **118/118 backend tests** and **64 browser project cases**: desktop **32/32 in 2.6 minutes** and mobile **32/32 in 2.2 minutes**, including the first four manual-payment project cases. These earlier results are separate from the current recovery checkpoint.

### Historical shipping checkpoint — 00:41 UTC

The `main-CRXD3LD4.js` checkpoint passed **127/127 Angular tests across 25 files**, **101/101 backend tests** and a separate **10/10 shipping frontend suite**. Browser evidence covered 60 project cases through 61 successful executions: desktop 30/30 in 2.4 minutes on `main-H3VQSUTN.js`, affected desktop shipping 1/1 in 6.2 seconds after its validation correction, and mobile 30/30 in 1.8 minutes on `main-CRXD3LD4.js`. These earlier scoped runs are separate from the current complete device runs.

### Historical checkpoint — 00:02 UTC

Historical 00:02 checkpoint: **115/115 Angular tests across 24 files** and **89/89 backend tests** passed. `main-XUOZCJNX.js` / `styles-LJPYLT3M.css` was built at `2026-09-17T00:02:25.124Z`; all 58 then-existing project cases were covered across scoped desktop/mobile runs. The former mobile report is `artifacts/playwright-mobile/report`; desktop evidence included 28 initial passes, one selector-only correction and three later cart checks. These are historical results, distinct from the 02:01 recovery checkpoint and the completed 03:07 scope above.

`e2e/admin-operations.spec.mjs` uses real local HTTP and Chrome on desktop/mobile. It refuses non-loopback origins, reads ignored runtime credentials privately and disables Playwright traces and automatic screenshots. Every fixture has a unique `qa-ops-...` name; cleanup verifies that exact name before cancelling those requests or marking those messages read. It does not delete customer data or write remote services.

The suite covers real order transitions, customer-visible history, stale-session HTTP 409 and reload recovery, custom-request persistence, Arabic choice labels, explicit read/unread changes, 11-record pagination, empty/error/retry behavior and customer HTTP 403/route rejection. The list error test aborts a real request, then retries against the actual backend; it does not supply fabricated API responses.

Historical initial checkpoint: the first combined browser run exposed an authentication throttle applied to normal `/auth/me` checks and logout requests. The backend agent narrowed the attempt limiter to login/register, added a separate refresh limiter and verified that repeated session checks do not block login or logout. The first full desktop operations scenario passed before the original throttle affected later test sessions.

- `node --check e2e/admin-operations.spec.mjs`: passed.
- Coordinated `npm test -- --watch=false`: 17 files / 57 tests passed.
- Backend verification after scoped authentication throttling: 44 tests passed.
- Coordinated production AOT build: passed; 491.83 kB initial bundle at this checkpoint.
- All four operations browser tests passed on desktop/mobile in the coordinated full run. That run passed 26 of 28 overall scenarios; two product-admin tests failed on an ambiguous dashboard-link selector. After targeting the product route explicitly, both affected tests passed in 17 seconds. All eight admin scenarios are verified across these runs; this is not a claim of one clean full-suite run.
- `git diff --check` passed for the admin and QA changes (only the workspace's usual LF/CRLF notices).

Run `npx playwright test e2e/admin-operations.spec.mjs e2e/admin.spec.mjs --output artifacts/playwright-admin --reporter=line` with the local API on 4000, frontend on 4200 and current ignored `.local/runtime.json`. Test fixtures remain in the disposable local database in cancelled/read states because these APIs deliberately expose no hard-delete operation. The product admin suite remains in `e2e/admin.spec.mjs`, with selectors updated for Arabic navigation and viewer controls. An isolated output directory prevents parallel QA tasks from clearing each other's artifacts.

## Historical production-preview verification — 17 September

At that earlier checkpoint, all four operations desktop/mobile scenarios passed against the production SSR/CSR preview on port 4300 and the real local API on 4000. The combined admin run initially passed six of ten scenarios; its failures affected product/settings test selectors and upload preview integration, not operations. After targeted corrections and the loopback-only preview CSP fix, all ten admin scenarios were verified across scoped runs. Then-current checks: production AOT/SSR build passed, 20 Angular files / 68 tests passed, backend 58 tests passed, and separate SSR browser suite 16/16 passed.

The local-only test origin guard now accepts frontend ports 4200 and 4300, while API writes remain restricted to port 4000. The run used `STORE_E2E_BASE_URL=http://127.0.0.1:4300`. See `admin-browser-qa.md` for commands, cleanup guarantees and current artifacts. Earlier checkpoint counts above are retained as history, not the final totals.
