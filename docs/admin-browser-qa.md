# Admin browser verification — 17 September 2026

## Current follow-up verification — 17 September, 05:09 UTC build

The full Angular suite passed **239/239 tests across 39 files in 6.38 seconds**, first attempt (test bundle `2026-09-17T05:09:06.658Z`, 8.363 seconds); backend passed **178/178**. Production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**. Four exact build files are recorded in `artifacts/performance/current-0509-build-identity.json`.

Final cart/media, guest-checkout and extended lost-response checks passed **6/6 in 27.3 seconds** (three per device, one invocation, zero retries) on this build. Broader follow-up coverage is scoped: **11/12 desktop** on 04:49 plus corrected contact **2/2** on 04:57, and **12/12 mobile** on 04:57. The other **23 scenarios retain historical 04:03 coverage**. This is not a new 70-case or complete-device pass. [Public-page QA](public-pages-qa.md#current-follow-up-verification--17-september-0509-utc-build) retains every report, the before-fix tracking failure, corrected application behavior and exact coverage limits.

Shipping was rechecked within the 12-case follow-up scope; other administrator browser scenarios retain their historical 04:03 coverage.

## Historical configuration checkpoint — 17 September, 04:03 UTC

The full Angular suite passed **208/208** and backend passed **169/169**. Production is `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`, built at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. All **35 unique scenarios are verified on both devices through scoped invocations**: desktop **34/35 in 2.5 minutes**, then **34/35 in 2.7 minutes**, followed by shipping **1/1 in 4.7 seconds**; mobile **34/35 in 2.7 minutes**, followed by admin operations **1/1 in 10.1 seconds**. This covers **70 project cases**, without a clean complete-device pass. The three failures were test-fixture issues: a broad receipt list selector, public/private item equality, and delayed CDP response-body access. Their corrections preserve business assertions and introduce no application/backend/build change. [Public-page QA](public-pages-qa.md) retains all five reports, the exact failure/recheck scope and the separate read-only visual probe. Earlier dated results below remain historical.

System Chrome through Playwright verified the admin panel on desktop (1440 × 1000) and mobile (390 × 844, currently DPR 2), against the production SSR/CSR preview on localhost port 4300 and the disposable local API on port 4000. Tests permit only loopback origins, read ignored credentials privately and disable traces and automatic credential screenshots. Product fixtures remain inactive and are verified before soft deletion; operation fixtures have unique markers and are cancelled/marked read after verification. Settings snapshots are restored and checked after each run.

The historical 04:03 mobile order-detail snapshot was visually inspected: stored Arabic specification labels show the unitless value 68 honestly, and the private STL reference wraps without overlap. Public invoice assertions and private manufacturing-snapshot preservation are checked separately. The [public-page QA record](public-pages-qa.md) retains the scoped fixture failures and visual limitations; this is not a whole-admin visual audit.

## Historical checkout results — 17 September, 03:07 UTC

Historical 03:07 UTC verification is **177/177 Angular tests across 30 files** in **5.10 seconds** (test bundle `2026-09-17T02:53:16.414Z`) and **155/155 backend tests**. Final production `main-LACTZSO4.js` / `styles-TFH64YQR.css` completed at **`2026-09-17T03:07:27.817Z` in 9.405 seconds**, initial **481.21 kB raw / 128.78 kB estimated transfer**. Complete desktop passed **35/35 in 3.1 minutes** and mobile **35/35 in 2.6 minutes**, both on the same build with one worker, zero retries, fresh restored disposable APIs and real quota waits. All final cases passed their first attempt, with no application change between devices. Coverage is **70 project cases (35 unique scenarios × two complete invocations)**: 24 admin, 20 SSR and 26 public/checkout cases, including four new checkout-pricing/recovery cases. Reports: `artifacts/playwright-2026-09-17-checkout-{desktop,mobile}-final/report`.

The first desktop run on the 02:58 build passed **31/35 in 2.5 minutes**. Three admin/settings cases targeted stopped port 4200 because their explicit spec override ignored the shared production URL; a checkout recovery case had an Arabic assertion mismatch. The failed report remains at `artifacts/playwright-2026-09-17-checkout-desktop/report`. Admin/settings now honor `ADMIN_QA_BASE_URL`, then `STORE_E2E_BASE_URL`, then the original 4200 default; local guards and business assertions remain unchanged. Final verification followed these fixture corrections and a recovery explanation copy update. [Public-page QA](public-pages-qa.md) retains this earlier failure and the Angular fixture history, and limits visual conclusions to the inspected price-review viewports.

## Historical recovery checkpoint — 17 September, 02:01 UTC

That zoneless production build was **`main-GN52CWI4.js`** / `styles-2XRGXKQX.css`, completed **2026-09-17T02:01:33.744Z** in **10.083 seconds**, initial **479.73 kB raw / 128.00 kB estimated transfer**. All **160/160 Angular tests across 29 files** passed in **5.19 seconds** (test bundle completed `02:00:48.628Z`); backend verification passed **132/132**. Both suites passed on the first run. Shared verification details are maintained in [implementation progress](implementation-progress.md#current-verification-evidence).

All **66 project cases (33 unique scenarios × two devices)** passed across two complete device invocations on that same build: desktop **33/33 in 2.6 minutes** and mobile **33/33 in 2.2 minutes**, each on the first attempt with one worker and zero retries. Each device used a freshly restored disposable API. No functional case failed and no application source changed between runs. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. Screenshot scope is in [payment QA](order-payments-qa.md).

The admin portion contains **twelve scenarios / 24 passing project cases**: product editing/uploads/deletion, ordinary-customer access denial, two operations workflows, settings, three manufacturing workflows, agreed shipping and three manual-payment workflows. The remaining scope is **20 SSR** and **22 public account/contact/storefront** project cases. The **six payment project cases** cover collections/refunds, clerical correction, exact keyed recovery, stale revisions, cancelled settlement, private receipt refresh and terminal-proof recovery after a concurrent collection; see [payment QA](order-payments-qa.md). Shipping covers explicit agreement, fee revisions/conflicts, retained drafts, committed-response recovery, zero fees, terminal rejection and private guest receipt refresh; see [shipping browser QA](order-shipping-qa.md). Gallery DPR 2 selection, Arabic specifications and lost guest-checkout recovery also passed on both devices. Disposable APIs, original catalog preservation and unchanged production quotas remain required. Performance is separate in [performance-audit.md](performance-audit.md).

Manufacturing QA verifies incomplete/null saves, real server validation and arithmetic, low-price approval blocking, explicit chosen-price save and requote, three attestations, persistent approval, and stale-revision 409 recovery. The current third scenario verifies that copying an unenrolled legacy product automatically creates an inactive pending-review draft, with empty measurements and no inherited approval, while preserving saved specifications and price. It requires no explicit review-start request; incomplete saves and reload retain the pending state, quoting fails until evidence is supplied, and the copy remains public 404. New-product CRUD also verifies automatic enrollment and blocked publication. Each case mutates only its disposable QA fixture and verifies identity before cleanup. All four source manufacturing drafts and the ordinary legacy source remain unchanged. See [manufacturing-review-frontend.md](manufacturing-review-frontend.md) for the workflow and evidence.

## Historical payment checkpoint — 01:09 UTC

The `main-O65VYLKE.js` / `styles-DWJFAQFT.css` build completed at `2026-09-17T01:09:53.339Z` in 10.621 seconds, initial 479.71 kB raw / 127.98 kB estimated transfer. It passed **152 Angular tests across 29 files** in 5.09 seconds (test bundle `01:09:13.777Z`), **118 backend tests** and **64 project cases**: desktop **32/32 in 2.6 minutes**, mobile **32/32 in 2.2 minutes**, including four payment project cases. Reports remain at `artifacts/playwright-2026-09-17-payments-{desktop,mobile}/report`.

At that checkpoint, the third manufacturing scenario exercised explicit legacy enrollment: unsaved edits blocked starting review, a competing update returned 409, and explicit reload followed by a fresh request started pending review with empty measurements while preserving saved specifications and price. That browser scenario is historical; the current browser scenario covers automatic copy enrollment. Explicit legacy enrollment remains covered by backend and Angular component tests.

## Historical shipping checkpoint — 00:41 UTC

The shipping checkpoint used `main-CRXD3LD4.js`, with **127 Angular tests across 25 files** and **101/101 backend tests**. Its **60 project cases** were covered through **61 successful executions**: desktop 30/30 in 2.4 minutes on `main-H3VQSUTN.js`, affected desktop shipping 1/1 in 6.2 seconds after clearing stale agreement validation on reload, and mobile 30/30 in 1.8 minutes on `main-CRXD3LD4.js`. These were scoped runs across two builds. Historical reports remain at `artifacts/playwright-2026-09-17-shipping-{desktop,desktop-final,mobile}/report`; the pre-correction screenshot remains in `artifacts/browser/shipping-0036-desktop`.

## Historical zoneless checkpoint

Before shipping, the 00:02 `main-XUOZCJNX.js` checkpoint passed 115 Angular tests in 24 files, 89 backend tests and 58 browser project cases across scoped runs. Earlier, `main-72MNKU5Z.js` passed **56/56 project cases in 2.1 minutes** and **100 Angular tests across 23 files**. `main-ZIXSIPIB.js` passed **52/52 in 2.0 minutes** and **83 Angular tests across 22 files**. These are historical checkpoints, distinct from the 02:01 recovery checkpoint's 66-case coverage and the completed 03:07 scope.

## Historical production-preview checkpoint

Before those historical complete runs, the five original admin scenarios (ten desktop/mobile project cases) were verified across coordinated scoped runs:

- Initial combined run: six passed and four failed in 48.4 seconds. All four operations scenarios and both ordinary-customer admin guard scenarios passed. Three failures were Arabic selector ambiguities (sidebar/page action and topbar/content headings); the fourth was a malformed legacy PNG fixture rejected by the new image decoder.
- Targeted settings/product run: both settings scenarios passed, and product uploads exposed a preview-server CSP issue: absolute local HTTP upload URLs were blocked by the preview's HTTPS-only media/connect policy.
- The preview server now permits only the configured local API port and its loopback host aliases for image/connect/media requests. No Angular app change was needed. The final targeted product-admin run passed both scenarios in 15.3 seconds.
- That checkpoint was aggregate verification of ten project cases, not one clean combined run. Later complete and scoped results are recorded above.
- At that earlier checkpoint, Angular production AOT/SSR build passed and the Angular suite had 20 files / 68 tests. Backend verification then reported 58 tests passed. The separate SSR browser suite passed 16 cases before that admin QA.

Historical scoped commands (both frontend URL variables were set to `http://127.0.0.1:4300`):

```text
npx playwright test e2e/admin.spec.mjs e2e/admin-operations.spec.mjs e2e/admin-settings.spec.mjs --output artifacts/playwright-admin-production --reporter=line
npx playwright test e2e/admin.spec.mjs e2e/admin-settings.spec.mjs --grep "admin signs in|admin settings validate" --output artifacts/playwright-admin-production-final --reporter=line
npx playwright test e2e/admin.spec.mjs --grep "admin signs in" --output artifacts/playwright-admin-upload-final --reporter=line
```

## Verified behavior

- Real admin login, dashboard data, products list, server pagination and Arabic navigation; ordinary customers are denied admin routes and receive HTTP 403 from admin APIs.
- Mobile navigation opens/closes with Escape and restores focus. Products become cards at narrow widths; list, form and settings pages fit the viewport without horizontal overflow.
- Lazy admin initialization applies PrimeNG Aura styling and Arabic labels. New category/material selections are explicit; products remain unpublished in every mutation.
- A valid PNG generated by Chrome canvas uploads through the actual API. The old embedded PNG was confirmed invalid by local Sharp (`vipspng: libpng read error`); it was replaced rather than weakening server validation.
- Real STL upload produces a rendered tetrahedron. Zoom, rotation, X/Y quarter turns and preview-color controls work without page errors.
- Save-and-continue performs one POST followed by PUT to the same ID; name/price survive reload, the slug remains unchanged, and the inactive fixture returns public HTTP 404 before verified cleanup.
- Real settings PUT normalizes Arabic/local Egyptian contact input, persists EGP and zero delivery, preserves dormant settings and maintenance state, and distinguishes null/unconfirmed delivery. Invalid contact input sends no PUT. A blocked settings GET exposes an error and hides saving; retry fetches real data. Original settings are restored after both tests.
- Real order/custom-request/message management covers explicit state changes, history, stale-state HTTP 409 recovery, server pagination, search, empty/error/retry states and customer authorization. See `admin-operations-frontend.md`.

## WebGL evidence

Both final product-admin tests obtained the actual Chrome `WEBGL_lose_context` extension, entered fullscreen, lost the context, verified the Arabic error and usable fullscreen exit, restored the context, and confirmed that the palette worked with its previous color reset. The branch remains conditional for browsers without the extension; in this installed Chrome it ran and passed on both devices.

Plaintext evidence is persisted as `webgl-context-recovery.txt` inside each desktop/mobile test directory under `artifacts/playwright-admin-upload-final`. Those files explicitly record actual context loss/restoration, fullscreen error exit and color reset. The same directories contain numeric-only `auth-quota.json` summaries taken from existing login responses; no extra authentication probes or credential dumps were used.

## Visual evidence

Post-login `admin-dashboard-*`, `admin-products-*`, `admin-product-*`, and `admin-settings-*` screenshots under ignored `artifacts/browser` were reviewed on both devices. They show the Arabic RTL shell, calm surfaces, product cards/table, upload fields and settings forms. Full-page product screenshots are taken after a reload, so an offscreen deferred viewer may show its loading/viewport placeholder; interactive rendering and recovery were verified earlier in the same test.

No production or remote service was mutated. Upload fixtures and operation records exist only in the disposable local environment. Earlier verification grew from eight to ten admin project cases with settings coverage, then to 14 with manufacturing lifecycle/conflict coverage, 16 with enrollment, 18 with agreed shipping and 22 with the initial payment scenarios. Current coverage contains **24 admin project cases**, including **six manual-payment project cases**.

## Historical table contrast check — 17 September

After the final cart/table-style build (`main-S7TR6BTG.js`, artifact timestamp 21:39:14 UTC), one additional admin sign-in was used for a read-only Chrome check. No product, settings or operation mutation was permitted. The same session checked desktop 1440px and mobile 390px layouts: enabled View/Copy text `#24372f` measured **12.631:1** on white, Edit `#355e4b` **7.358:1**, and Delete `#a13732` **6.757:1**. All exceeded 4.5:1 and both viewports fit without horizontal overflow. This is a targeted computed-color/layout check, not another replay of the ten functional scenarios.

Safe updated list screenshots are `artifacts/browser/admin-products-contrast-desktop.png` and `admin-products-contrast-mobile.png`; computed values and numeric-only quota headers are in `admin-product-button-contrast.json`. Exactly one login was recorded and the browser was closed before the performance pass.

## Historical soft-deletion regression — earlier API checkpoint

The updated admin product case now verifies the actual delete confirmation and subsequent list/count/search behavior. On each device it confirms 16 records (12 source products + four manufacturing-review drafts), creates only its own inactive fixture (count 17), finds it by its unique marker (one result), deletes it through the explicit UI confirmation, sees zero search results, reloads the full page and sees count 16 with the four drafts retained. The deleted admin detail returns 404 and a fresh API search returns zero.

The first two-case attempt encountered Playwright response-body lifecycle errors across full-document navigation after earlier assertions had passed; both owned fixtures were cleaned up. Synchronization was changed to verify the rendered paginator and obtain the current count through the real API request context. The affected desktop/mobile cases then passed **2/2 in 21.1 seconds**, also retaining real PNG/STL upload, save-and-continue and WebGL recovery coverage. No other admin suite was repeated for this backend fix.

Evidence is under `artifacts/playwright-admin-deletion-verified/**/product-deletion-regression.json`; safe final screenshots are `artifacts/browser/admin-products-final-desktop.png` and `admin-products-final-mobile.png`. The real API remained at 16 nondeleted records after verification. The final production Angular bundle was unchanged (`main-S7TR6BTG.js`); the backend list/count/search/detail filter was corrected.

Later product-admin runs repeat these deletion assertions, including desktop on `main-527HOIT4.js` and mobile on `main-XUOZCJNX.js`. The old `main-S7TR6BTG.js` timings, artifacts and numeric contrast measurements above are retained as historical evidence and are not presented as new measurements of the current build.
