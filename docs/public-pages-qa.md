# Public pages and account QA

The historical verification below began locally on 16 September 2026 against port 4200 and the isolated API on port 4000. No production data was changed. The latest checkpoint uses production preview port 4300; its device results are distinguished below. Performance measurements are separate evidence in the [performance audit](performance-audit.md).

## Current scoped product-editor verification — 17 September, 07:31 UTC build

Final production **`main-BOWHSGTL.js` / `styles-LJHQOUSH.css`** completed at **`2026-09-17T07:31:16.112Z` in 10.070 seconds**, initial **488.14 kB raw / 131.20 kB estimated transfer**; identity: `artifacts/performance/current-0731-build-identity.json`. The full Angular suite passed **291/291 across 44 files in 6.21 seconds** (`artifacts/admin-product-bounds-angular-tests.log`); backend passed **201 tests**.

The affected administrator scope passed **10/10 distinct device cases in one corrected invocation, 1.4 minutes**: five scenarios on desktop and mobile covering delayed save locking, 31-image gallery rejection, stale deletion confirmation/review, manufacturing approval, stale manufacturing review, explicit stale-form merge and legacy-copy review requirements. These scenarios use real local API responses and disposable inactive products. The health fixture waited **13 seconds** after observing **129 requests remaining**, respecting the actual quota. Report: `artifacts/playwright-2026-09-17-product-edit-corrected/report`; log: `artifacts/admin-product-edit-corrected-browser.log`.

The retained first invocation has **one failed desktop case at 12.6 seconds and nine unrun cases**. It reached DELETE 200 and the visible empty list, then failed because CDP no longer retained the subsequent list response body for `response.json()`. The fixture correction checks browser GET 200, the empty UI and a fresh read-only filtered API response with zero records. Application source/build remained unchanged; the successful invocation was not a timing retake. Original evidence: `artifacts/playwright-2026-09-17-product-edit-safety/report` and `artifacts/admin-product-edit-browser.log`.

This is a ten-case administrator verification, not a new full public-page or complete-project pass. [Product edit safety](admin-product-edit-safety.md) records contracts, field bounds, retained unit/compiler history and screenshots. Desktop save-lock/comparison and mobile comparison captures were inspected; the mobile capture contains a transient toast over the heading, while the lower comparison and actions remain responsive. Earlier public/storage/tracking coverage stays scoped to its dated builds below. Performance remains separate evidence in [performance-audit.md](performance-audit.md).

<a id="current-storage-and-skip-link-verification--17-september-0641-utc-build"></a>

## Historical storage and skip-link verification — 17 September, 06:41 UTC build

Final production **`main-XQERADW5.js` / `styles-LJHQOUSH.css`** completed at **`2026-09-17T06:41:26.504Z` in 9.331 seconds**, initial **488.13 kB raw / 131.14 kB estimated transfer**. Identity: `artifacts/performance/current-0641-build-identity.json`. The full Angular suite passed **278/278 across 43 files in 5.70 seconds**, with test bundle completion at **`2026-09-17T06:40:52.069Z` in 6.010 seconds**; backend passed **192 tests**. The successful unit log is `artifacts/skip-link-corrected-angular-tests.log`. Its preceding **277-pass / 1-failure** run exposed a `SpyLocation` fixture mismatch (duplicated base path and omitted query), corrected using real `Location`, `MockPlatformLocation` and `APP_BASE_HREF`; the failed log remains `artifacts/skip-link-final-angular-tests.log`.

| Invocation | Actual result and build | Retained report / log |
| --- | --- | --- |
| Initial desktop scope | **9 passed, 1 failed, 10 not run; 32.6 seconds**, on 06:34 `main-A4UN3ZC3.js`. The guest skip link caused a real navigation defect. | `artifacts/playwright-2026-09-17-storage-money-final/report`; `artifacts/storage-money-browser-final.log` |
| Corrected desktop scope | **3/3 passed in 8.7 seconds**, on final 06:41. Covers SSR/no-JavaScript HTML across three public routes, search-query navigation, and guest tracking. | `artifacts/playwright-2026-09-17-skip-link-desktop/report`; `artifacts/skip-link-desktop-browser.log` |
| Final mobile scope | **12/12 passed in 39.5 seconds**, on final 06:41. Covers all ten original scenarios plus the SSR and search-query cases. | `artifacts/playwright-2026-09-17-storage-skip-mobile/report`; `artifacts/storage-skip-mobile-browser.log` |

This is **24 distinct device cases across scoped runs: 15 on final 06:41 and 9 on preceding 06:34**. It is not 24 cases on the final build, one uninterrupted run, or a complete 37-scenario suite. The twelve-scenario scope includes settings precision, two checkout-pricing cases, lost guest-response recovery, SSR document content, cart hydration, delayed account prefill, two storage cases, catalog search/history, product/cart media and guest tracking.

The initial browser failure was an application bug: native `href="#main-content"` resolved against `<base href="/">`, taking the customer from `/track` to `/#main-content`. The shared layout now derives a native href from the current path/query and deployment base; fragment credentials are excluded. The final guest scenario verifies keyboard focus reaches `#main-content`, the URL remains `/track#main-content`, the receipt stays visible, and tracking is not repeated. The SSR case checks the generated link without JavaScript; search checks query preservation. This application correction is separate from the failed `SpyLocation` unit fixture.

The two new storage scenarios passed on both devices (**4 cases**), on unchanged storage source across those builds. Blocked writes send no order POST; the explicit storage check sends no request; the later explicit submit creates exactly one real order and failed local cleanup completes without another POST. Reloaded read-denied and corrupt seeded pending records remain locked and preserve the cart/draft. These are narrow storage hooks and real backend responses, with no fabricated network success or production-limit bypass. The storage cases assert no horizontal overflow or page/console errors and save four viewport screenshots per device. [Checkout storage safety](checkout-storage-safety.md) records the 14 initial storage unit cases plus two refreshed-receipt regressions and their earlier 274/276 checkpoints.

Performance and final catalog-preservation evidence are maintained separately in the [performance audit](performance-audit.md) and [implementation progress](implementation-progress.md#current-verification-evidence); these functional passes do not establish a new performance measurement.

<a id="current-private-tracking-verification--17-september-0544-utc-build"></a>

## Historical private-tracking verification — 17 September, 05:44 UTC build

The new `/track` page opens a copied private guest-receipt link without signing in. It removes credentials from the URL fragment before its GET, provides explicit saved-receipt resume after reload, and preserves the cart and pending checkout. The full Angular suite passed **256/256 across 42 files in 5.83 seconds** after one corrected amount-format assertion; backend passed **183/183**. Production `main-NOO3XGHS.js` / `styles-LJHQOUSH.css` completed at **`2026-09-17T05:44:24.928Z` in 9.035 seconds**, initial **484.86 kB raw / 130.03 kB estimated transfer**; identity: `artifacts/performance/current-0544-build-identity.json`.

Scoped checks passed **10/10 in 24.4 seconds** for related authentication, lost-response recovery and product/cart behavior on both devices (`artifacts/playwright-2026-09-17-private-tracking-regressions/report`), then the strengthened copied-link/fresh-context scenario passed **2/2 in 13.9 seconds** (`artifacts/playwright-2026-09-17-private-tracking-final/report`; desktop 4.6 seconds, mobile 6.2 seconds). These are **12 distinct device cases**, not a new complete 35-scenario/70-case run. The initial desktop guest pass, **1/1 in 6.4 seconds** before strengthening header inspection to `allHeaders()`, remains at `artifacts/playwright-2026-09-17-private-tracking-desktop/report` and is not another distinct case.

The final browser helper verifies real Clipboard copying, three read-only tracking requests, absent authorization/cookie headers, fragment removal, invalid-link isolation, private wrong-token 404, saved resume, no tracking-context POST, and unchanged cart/pending state. Expired access is seeded at startup; the stronger guarantee with credentials still present is unit-tested because normal startup can clear the expired value. [Guest-tracking frontend](guest-tracking-frontend.md) records exact contracts, screenshots and limits. Earlier coverage below remains historical; performance uses its own build-specific evidence in the [performance audit](performance-audit.md).

<a id="current-follow-up-verification--17-september-0509-utc-build"></a>

## Historical follow-up verification — 17 September, 05:09 UTC build

These follow-up changes preserve the saved receipt and private tracking token while browsing, show the public status history on the guest receipt, and recover an empty out-of-range account page to page 1 once. The browser page-999 check uses a newly registered account with no orders; populated-account recovery is covered by a unit fixture, not that browser check.

The full Angular suite passed **239/239 across 39 files in 6.38 seconds**, first attempt, with its test bundle completed at **`2026-09-17T05:09:06.658Z` in 8.363 seconds**. Backend passed **178/178**. Final production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**; four file hashes are retained in `artifacts/performance/current-0509-build-identity.json`.

| Invocation | Actual scope and result | Retained report |
| --- | --- | --- |
| 04:49 `main-DFZIYANS.js` desktop | 11/12 affected scenarios passed; custom-contact recovery exposed contradictory validation alerts | `artifacts/playwright-2026-09-17-followup-desktop/report` |
| 04:57 `main-INSACKAX.js` desktop | Corrected contact scenarios 2/2 passed in 7.2 seconds | `artifacts/playwright-2026-09-17-followup-contact-desktop/report` |
| 04:57 `main-INSACKAX.js` mobile | Affected scenarios 12/12 passed in 37.5 seconds | `artifacts/playwright-2026-09-17-followup-mobile/report` |
| 05:09 `main-P6YL7ZPA.js` desktop and mobile | Three cart/media/checkout/recovery scenarios per device: 6/6 passed in 27.3 seconds, one invocation, zero retries | `artifacts/playwright-2026-09-17-tracking-race-final/report` |

The 12-scenario scope comprises contact 2, storefront 4, public pages/account 5 and shipping 1. The final six-case invocation rechecks three of those scenarios on each device: media/cart **2.0 seconds desktop / 1.9 mobile**, guest checkout **2.5 / 7.4**, and extended lost-response recovery **4.3 / 5.4**. The other **23 scenarios retain their historical 04:03 coverage** below. These scoped results do not establish all 35 scenarios or 70 project cases on the new build.

Before the contact correction, the whole frontend suite passed **234/234 in 5.62 seconds** (test bundle `04:47:51.932Z`). The two validation guards then passed the affected **8/8** contact cases; they suppress ordinary validation summaries while an exact saved request is awaiting recovery. The frozen 04:57 build completed at **`2026-09-17T04:57:49.042Z` in 11.067 seconds**, initial **483.48 / 129.58 kB**, with `styles-IJQZ35G4.css`. Its source remains covered by the final 239-case suite. The inspected mobile pending-request/original-receipt screenshots show clear RTL wrapping without clipping; this is limited to those captured states.

The existing lost guest-response scenario was extended to reproduce a receipt race deliberately against that frozen, unfixed 04:57 build. After recovering order A, the test holds a real HTTP 200 tracking response for A, returns to the retained edited cart, and explicitly submits order B. B was saved with HTTP 201, a new key and a new private token, and appeared on screen. Releasing A then replaced B's receipt, causing the expected missing-B assertion failure at `e2e/public-pages.spec.mjs:384`. The original failing report is retained at `artifacts/playwright-2026-09-17-tracking-race-reproduction-desktop/report`. This is evidence of the reproduced application defect, not a test-fixture failure.

The fix captures receipt revision and tracking intent when the cold tracking Observable is subscribed. Saving or clearing a receipt invalidates older reads; only the latest subscribed tracking request can publish. Explicit tracking from an empty receipt and guest-token retention remain supported. The cart also ignores an old refresh error after its original receipt has been replaced. Five added unit cases passed in the final full suite. The extended real-browser race then passed on both devices in the final six-case invocation above: B's visible receipt and private token survive the late A response and reload.

The browser extension retains all four original recovery POST assertions, then adds **one explicit new-order POST**: **five order POST attempts and two distinct saved orders per lost-response scenario**. It adds no scenario to the 35-scenario suite. The final assertions require B's receipt and token to survive A's late response and a reload. These counts must be included when planning the unchanged local submission quota; quote/tracking reads are separate. No catalog record is modified by this fixture.

Final read-only API preservation at **`2026-09-17T05:12:30.832Z`** confirmed the original 16 product records, full settings, 44 image sources and 70 variants matched their captured baseline. The disposable database retained 11 QA orders, 11 checkout decisions, one custom request and one contact message. Evidence is `outako/backend-api/.local/final-inquiry-cart-preservation-1789621950832.json`; these synthetic records do not represent real sales. Lighthouse evidence remains separate and must be read with its own build and sample times.

## Historical configuration-consent checkpoint — 17 September, 04:03 UTC build

Source verification passed **208/208 Angular tests** and **169/169 backend tests**. Production `main-R4RLZPZA.js` / `styles-IJQZ35G4.css` completed at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. Identity and four source hashes are retained in `artifacts/performance/current-0403-build-identity.json`.

All **35 unique scenarios are verified on both devices through scoped invocations**, covering **70 project cases**. This checkpoint did not produce a clean complete-device pass. Application source, backend behavior and the 04:03 production build remained unchanged throughout; only the following test fixtures were corrected.

| Invocation | Result | Retained report |
| --- | --- | --- |
| First full desktop | 34/35 passed in 2.5 minutes | `artifacts/playwright-2026-09-17-configuration-desktop/report` |
| Second full desktop | 34/35 passed in 2.7 minutes | `artifacts/playwright-2026-09-17-configuration-desktop-final/report` |
| Targeted desktop shipping | 1/1 passed in 4.7 seconds; case 3.6 seconds | `artifacts/playwright-2026-09-17-configuration-shipping-targeted/report` |
| Full mobile | 34/35 passed in 2.7 minutes | `artifacts/playwright-2026-09-17-configuration-mobile/report` |
| Targeted mobile admin operations | 1/1 passed in 10.1 seconds; case 9.2 seconds | `artifacts/playwright-2026-09-17-configuration-admin-mobile-targeted/report` |

The first desktop shipping failure came from `.receipt-card dl` selecting the new specification lists as well as the invoice. The selector was narrowed without dropping financial assertions. The second desktop shipping run reached a later equality check comparing public checkout items directly with protected admin-detail items; the fixture now compares the exact public invoice separately and asserts the protected manufacturing snapshot is unchanged from the initial admin detail. The targeted shipping case then passed.

The sole mobile failure occurred in the existing admin `changeStatus` helper during its second contact-status update: it read `response.json()` after DOM success and CDP no longer retained the response body. The helper now consumes and caches JSON when `waitForResponse` resolves, before UI assertions, and removes its listener in `finally`. No additional request or business retry was added. The affected admin scenario passed on its targeted rerun. Fresh disposable APIs, unchanged production quotas and the existing health preflight remain the run conditions; all original failure artifacts are retained.

Final read-only preservation at **`2026-09-17T04:23:11.111Z`** confirmed all 16 original product records and the captured settings unchanged, with 44 image-source records / 70 variants intact, 12 public products and four pending inactive drafts. Draft lookups remained 404 and unauthenticated private access remained 401. The check made no database writes; its ignored evidence is `outako/backend-api/.local/post-mobile-configuration-preservation-1789618991111.json`. Synthetic QA orders and requests remain in the disposable database and are not evidence of real customer purchases or payments.

Existing storefront assertions at this checkpoint exercise the 99-piece cart limit and recovery after a quantity reduction. Existing checkout/recovery assertions verify deliberate focus after review/receipt/cart transitions. The existing pricing scenario first reviews changed prices, returns to the saved cart, then reviews changed specifications at the unchanged real price before creating its one existing order. It checks quote version 2, stored public receipt configuration and absence of private manufacturing snapshots. Cart disclosures make cached specifications available before an unchanged checkout; receipts/account orders use their stored configuration, with no current-catalog fallback. See [frontend behavior](frontend-integration-audit.md#historical-configuration-consent-checkpoint--17-september-0403-utc-build).

### Read-only configuration visual probe

The artifact-only probe passed desktop **1440 × 1000** and mobile **390 × 844, DPR 2** from **04:07:39.237 to 04:07:41.628 UTC**, with the four build hashes verified. Each fresh browser context used the real public product, locally stale name/size/fingerprint, unchanged real prices and synthetic delivery fields. Each issued exactly **one local quote POST**, with **zero order POST attempts, other writes, console errors or page exceptions**. Keyboard Back focused `cart-title`; the exact saved cart and delivery draft remained intact, no pending order was created, and the public product read was unchanged.

Evidence: `artifacts/configuration-review-visual/2026-09-17T04-07-39.036Z/` contains `report.json`, copied build identity, and `{desktop,mobile}-{actual-viewport,review-section}.png`. Visual inspection found legible Arabic old/current names, the unitless-size explanation, unchanged 100 EGP price, unknown shipping and the full-product link without horizontal overlap. The mobile section capture includes both actions; its review is 925 CSS pixels tall, so actions require normal scrolling from the initial viewport. The desktop section capture clips its lower action area around a sticky container; it does not establish desktop action visual coverage. Functional keyboard return passed on both devices. This probe created no order and remains separate from the scoped browser verification above; it does not establish performance scores.

The mobile administrator snapshot was also visually inspected after the targeted run: stored Arabic specifications distinguish the unitless value 68, and the private STL reference wraps without overlap. This is a specific order-detail state, not a whole-admin visual audit. Final catalog preservation and Lighthouse measurements are separate records in [implementation progress](implementation-progress.md#current-verification-evidence) and [performance audit](performance-audit.md).

## Historical checkout checkpoint — 17 September, 03:07 UTC build

Final production `main-LACTZSO4.js` / `styles-TFH64YQR.css` completed at **`2026-09-17T03:07:27.817Z` in 9.405 seconds**, with an initial bundle of **481.21 kB raw / 128.78 kB estimated transfer**. The final Angular run passed **177/177 tests across 30 files** in **5.10 seconds** (test bundle `2026-09-17T02:53:16.414Z`); backend passed **155/155**. The initial Angular run passed 176/177: a new rendered-cart fixture lacked `ActivatedRoute`. After supplying the real router test provider, the affected cart suite passed 19/19 and the complete suite passed. This is not a first-run frontend pass.

The complete final desktop run passed **35/35 in 3.1 minutes** and mobile passed **35/35 in 2.6 minutes**, both on `main-LACTZSO4.js` / `styles-TFH64YQR.css`. Together these are **70 passed project cases (35 unique scenarios × two devices)** across two complete invocations: 26 public account/contact/storefront/checkout, 20 SSR and 24 administrator/operations cases. Both final invocations used one worker, zero retries, a fresh restored disposable API per device and real quota waits; every case passed its first attempt on that final build, with no intervening application change. Reports: `artifacts/playwright-2026-09-17-checkout-desktop-final/report` and `artifacts/playwright-2026-09-17-checkout-mobile-final/report`. The earlier failed run below remains part of the checkpoint history; this is not a claim that the entire development cycle passed first time.

The actual desktop and 390 × 844 mobile price-review viewport captures were visually inspected. Arabic wrapping is clear; the saved 99 EGP and current 100 EGP prices, unconfirmed-shipping wording, confirmation and back actions remain distinct and readable without horizontal overlap. Both mobile actions fit the captured viewport. The offscreen fixed skip link visible in the tall full-page capture is absent from the actual viewport. Captures are retained at `artifacts/browser/checkout-price-review-{desktop,mobile}.png` and `artifacts/browser/checkout-price-review-viewport-{desktop,mobile}.png`. This observation covers those checkout states, not a whole-application visual audit.

The first desktop run on the **02:58 UTC `main-I4KYE6VB.js`** build passed **31/35 in 2.5 minutes**. Three admin/settings fixtures ignored the shared production target and tried the stopped development server on port 4200. The fourth failure was the new recovery test expecting `المحاولة السابقة لم تُسجّل` while the real status says `محاولة الطلب السابقة لم تُسجّل`; its preceding exact request/key, HTTP 409 and no-receipt checks had passed. The original result remains at `artifacts/playwright-2026-09-17-checkout-desktop/report`. Both admin specs now honor `ADMIN_QA_BASE_URL || STORE_E2E_BASE_URL ||` the existing 4200 default, and both recovery assertions match the actual phrase. Request/state/reload/review/new-key assertions and local-origin guards remain intact. The three fixture files passed formatting and syntax checks. The final 03:07 build also clarifies the pending-recovery explanation and labels saved-cart prices separately from the current quote. The two complete final passes above follow these corrections; the initial report is preserved unchanged.

Checkout now obtains a read-only current quote before a new submission. Matching displayed unit prices and shipping retain one confirmation; changed prices or shipping require an explicit old/new review. Unavailable rows keep the cart and delivery draft. An uncertain attempt reuses only its saved request and key; generic 409/422 responses cannot unlock it. Only matching durable `checkoutNotRecorded` proof permits a fresh quote, mandatory review and a new request key. The two new browser scenarios passed on both devices (**four pricing/recovery project cases**): unavailable/stale saved items require explicit price review, and a legacy unrecorded attempt survives reload before fresh quote review and a new key. Both compare the source product with its initial record. See [checkout pricing and recovery](checkout-pricing.md) for the contract, unit/race coverage and rollout limits. Final catalog-preservation and Lighthouse evidence are maintained separately in [implementation progress](implementation-progress.md#current-verification-evidence) and the [performance audit](performance-audit.md); no new performance result follows from these functional passes.

## Historical recovery checkpoint — 17 September, 02:01 UTC build

- Production build: `main-GN52CWI4.js` / `styles-2XRGXKQX.css`, completed at `2026-09-17T02:01:33.744Z` in 10.083 seconds, initial 479.73 kB raw / 128.00 kB estimated transfer. **160/160 Angular tests across 29 files** passed in 5.19 seconds; backend passed **132/132**.
- Desktop passed **33/33 in 2.6 minutes** and mobile **33/33 in 2.2 minutes** on the same build. All **66 project cases (33 scenarios × two devices)** passed across two invocations, with one worker, zero retries and every case passing its first attempt. No source change occurred between runs. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`.
- That scope contained **20 SSR**, **22 public account/contact/storefront**, and **24 administrator/operations project cases**. The third payment scenario on each device covers an uncertain attempt overtaken by another collection, including recovery without permanent lock or a duplicate entry. See [public payment summary](order-payment-public-frontend.md) and [payment browser QA](order-payments-qa.md).
- Devices used separate fresh disposable APIs with unchanged quotas and the health-header preflight. Final preservation at **02:12:22.719 UTC** confirmed the original 16 catalog records / 44 image sources / 70 variants intact. The separate **02:13–02:14 UTC** Lighthouse pass is documented in [performance-audit.md](performance-audit.md), including all regressions and measurement limits.

## Historical payment checkpoint — 17 September, 01:09 UTC build

- Production build: `main-O65VYLKE.js` / `styles-DWJFAQFT.css`, completed at `2026-09-17T01:09:53.339Z` in 10.621 seconds, initial 479.71 kB raw / 127.98 kB estimated transfer. **152/152 Angular tests across 29 files** passed in 5.09 seconds (test bundle `01:09:13.777Z`); backend passed **118/118**.
- Desktop passed **32/32 in 2.6 minutes** and mobile **32/32 in 2.2 minutes**, both on the same build. All **64 project cases (32 scenarios × two devices)** passed across these two invocations, with one worker, zero retries, no failed browser case and no intervening source changes. Reports: `artifacts/playwright-2026-09-17-payments-{desktop,mobile}/report`.
- The scope contains **20 SSR**, **22 public account/contact/storefront**, and **22 administrator/operations project cases**. The two new payment scenarios on each device verify recorded collections/refunds, separate clerical correction, uncertain/negative attempt recovery, stale-revision review and private guest receipt totals. Account summary rendering, malformed/legacy summaries and credit wording also have unit coverage. See [public payment summary](order-payment-public-frontend.md) and [payment browser QA](order-payments-qa.md).
- Devices used separate fresh disposable APIs with the original catalog restored, unchanged production quotas and the health-header preflight. Final read-only preservation at **01:20:49.302 UTC** confirmed the original 16 records, 44 image-source records and 70 variants remained intact. The completed Lighthouse pass is separately recorded in [performance-audit.md](performance-audit.md); no authenticated payment interaction is included in its scores.

## Historical shipping checkpoint — 17 September, 00:41 UTC

- Production build: `main-CRXD3LD4.js` / `styles-DWJFAQFT.css`, completed at `2026-09-17T00:41:15.253Z`, initial 479.71 kB raw / 127.98 kB estimated transfer. The full Angular suite passed **127/127 tests in 25 files** in 5.38 seconds; backend passed **101/101**. The shipping spec also passed **10/10** after the reload-validation correction.
- Desktop passed the complete **30/30 suite in 2.4 minutes** on `main-H3VQSUTN.js` (`00:36:02.788Z`). Screenshot review found a stale agreement error after recovering a committed zero-fee update. The final build clears the validation-attempt flag after a successful reload; fee/note preservation and fresh agreement requirements remain intact. The affected desktop shipping scenario then passed **1/1 in 6.2 seconds** on the final build.
- Mobile passed **30/30 in 1.8 minutes** on the final build. Across the original desktop suite, final desktop shipping rerun and final mobile suite, **60 project cases (30 scenarios × two devices) are covered by 61 successful executions**. All runs used one worker and zero retries, with no failed browser attempt in this cycle. This is not one uninterrupted 60-case run or a complete desktop rerun on the final build. Reports: `artifacts/playwright-2026-09-17-shipping-{desktop,desktop-final,mobile}/report`. Root maintains the detailed [shipping browser record](order-shipping-qa.md).
- Agreed shipping now updates the server invoice while preserving items, subtotal, discount and status history. Customer receipt refresh displays the confirmed fee and latest total, including zero, while retaining the private guest credential in its header/tab storage. Administrator notes and shipping history remain private. See [shipping frontend workflow and tests](order-shipping-frontend.md).
- Each device uses a fresh disposable API, unchanged production quotas, a health-header preflight and zero retries. Original catalog products, measurements, prices and the four pending manufacturing drafts remain outside shipping mutations. Lighthouse evidence must be read with its own measured build/time; functional checks do not update a prior performance result.

## Historical desktop and mobile checkpoint — 00:02 UTC

- Build: `main-XUOZCJNX.js` / `styles-LJPYLT3M.css`, completed at `2026-09-17T00:02:25.124Z`, initial 479.05 kB raw / 127.99 kB estimated transfer. Angular passed **115/115 tests in 24 files** again at 00:01:58 UTC in 5.25 seconds; backend passed **89/89**. Identity: `artifacts/performance/current-0002-build-identity.json`.
- **All 58 desktop/mobile project cases covered across scoped runs.** Mobile passed **29/29 in 2.2 minutes** on the historical 00:02 build (`artifacts/playwright-mobile/report`). The three affected desktop product/media/cart, guest-checkout and lost-response cases then passed **3/3 in 7.6 seconds** (`artifacts/playwright-desktop-cart-final/report`). Other unchanged desktop features retain the `main-527HOIT4.js` results: 28 initial passes plus the one admin selector case passing after its targeted correction. This is not one uninterrupted 58-case run.
- The lost guest-checkout scenario verifies preserved name/blank email across sign-in and reload, private session conflicts, local prevention after address/quantity edits, exact original-key/body replay after logout, and return to the preserved edited cart. Existing checkout also checks the rendered international Egyptian WhatsApp destination.
- Reviewed the four `artifacts/browser/checkout-{recovery,recovered-receipt}-{desktop,mobile}.png` images: Arabic RTL and wrapping remain readable; replay/return controls are visible; saved quantity one and retained cart quantity two are clearly distinguished. The mobile reference wraps inside its card. The raw zero size is gone after reusing the shared product-spec formatters; catalog data is unchanged.
- Each device used a fresh disposable API with production limits retained. The completed six-sample Lighthouse pass is documented separately in the [performance audit](performance-audit.md), including regressions and limitations. The first combined 53-pass/5-failure attempt remains archived with HTTP 429 evidence in `artifacts/browser-quota-run-2026-09-16/http-errors.json`.

## Reproducible browser runs with production rate limits

The browser spec files import `test` and `expect` from `e2e/local-api.fixture.mjs`. Its automatic fixture runs before each scenario and requests only the loopback API's `/api/health`. It matches the draft-8 `RateLimit-Policy` entry with `q=300; w=60` to the corresponding `RateLimit` remaining/reset values. When fewer than 150 requests remain, or health responds with HTTP 429, it waits the server's reported reset time plus one second and checks again. The fixture has a separate 90-second timeout; scenario timeouts are unchanged. Missing quota headers, invalid origins, other health failures and insufficient time to wait fail explicitly.

The reserve covers the inspected individual scenarios; expanding a scenario's request volume requires revisiting that budget. This preflight includes the health read itself and reflects API calls made by SSR as well as browser requests. Logs contain only the project/scenario and numerical remaining/wait values. It does not intercept business requests, retry their assertions, reset limiter stores, spoof client addresses or change production limits. Existing credential-flow trace/screenshot settings are preserved.

Run the two device projects separately, each against a **fresh disposable local API with the catalog restored**. The shared submission limit is 30 per 15 minutes. At the historical 01:09 checkpoint, the 32-scenario suite planned 24 desktop + 14 mobile submissions = 38: the earlier 21 + 11, one shipping order per device and two payment orders per device. Later suites add a payment-recovery fixture and two checkout-pricing scenarios per device. An immediate combined run exceeds the shared limit even with one worker. Read-only quote requests and administrator ledger appends use the separate API quota, not the public submission limiter; checkout attempts still consume the submission quota. A browser context reset does not reset the server's IP-based quota. The health gate handles only the separate 300-per-minute API budget; it cannot replenish authentication or submission quotas.

1. Prepare the production preview at port 4300 and a fresh local API at port 4000. Restore the 12 public products with their Arabic copy/media and the four inactive pending manufacturing drafts. The ignored `.local/runtime.json` must contain credentials for this API instance. Complete setup before the browser run and allow no competing jobs.
2. Run desktop from the repository root in PowerShell:

   ```powershell
   $env:STORE_E2E_BASE_URL = 'http://127.0.0.1:4300'
   $env:ADMIN_QA_BASE_URL = 'http://127.0.0.1:4300'
   $env:STORE_API_ORIGIN = 'http://127.0.0.1:4000'
   npx playwright test --project=desktop --workers=1 --retries=0 --output artifacts/playwright-desktop --reporter=line
   ```

3. After desktop finishes, stop and replace only the owned disposable API, then repeat catalog restoration and refresh its private runtime credentials. Keep the same production frontend build. Alternatively, wait for the real authentication/submission windows to expire before proceeding; do not use a limiter-reset endpoint or override.
4. Start a new Playwright invocation for mobile so it reads the new runtime credentials:

   ```powershell
   npx playwright test --project=mobile --workers=1 --retries=0 --output artifacts/playwright-mobile --reporter=line
   ```

Preserve both results and report them as separate device runs, including targeted corrections or rechecks after application changes. A failed business request remains a failed test; quota-aware preflight is not evidence that a checkout succeeded. The first combined recovery run reported 53 passes and 5 failures associated with real HTTP 429 limits. The fixture has now run during successful desktop and mobile verification.

## Delivered pages

- `/login` and `/register`: Arabic RTL forms using the shop's ivory and green tokens, explicit labels, autocomplete, password visibility controls, field-level errors, loading states, invalid-field focus, and keyboard submission. Links preserve a safe internal return destination.
- `/about`: physical printed products, Egypt-only delivery, EGP prices, separate shipping, product-specific details and a custom-design review process. No invented statistics, reviews, guarantees or business contacts.
- Missing routes: lightweight Arabic 404 page with native links and working keyboard product search. The previous decorative Three.js scene is removed.

The existing login input IDs and form selector remain compatible with admin browser tests. Auth-only shared styles were replaced; shared shop styles and application routing were not changed.

## Account behavior

The registration contract requires a 2–100 character name, valid email up to 254 characters, an 8–128 character password containing uppercase and lowercase English letters and a digit, and matching confirmation. Names and emails are trimmed before validation; passwords are preserved byte for byte. Login requires a password without applying registration rules to existing accounts.

The unused “remember me” option and consent links to nonexistent policies were removed. The forms explain persistence on the current device. Obsolete mock authentication and known demo admin credentials were removed.

Startup validates a stored session without blocking public rendering. Protected and guest guards wait for the same in-flight validation. A refresh token can restore a session when the access token is absent. Concurrent authentication failures share one rotating refresh request; each protected request is retried once. Late failures from an older access token reuse the already-refreshed token. Rejected refresh tokens clear the session, while temporary API failures preserve it. Responses arriving after logout cannot restore authentication. Bearer tokens are limited to the configured API origin and path boundary.

Return destinations reject external URLs, backslashes, control characters, ambiguous encoded paths and authentication loops. Customer destinations cannot target the admin area; backend authentication and role checks remain authoritative.

## Historical verification

- The final coordinated Angular suite passed **17 files / 57 tests**; the production AOT build passed.
- Targeted auth verification passed **4 files / 17 tests**, including refresh rotation, concurrency, late responses, failed refresh, logout races, URL safety, registration validation, duplicate submits and whitespace handling.

```text
npm test -- --watch=false --include src/app/core/services/auth.service.spec.ts --include src/app/core/interceptors/auth-session.interceptor.spec.ts --include src/app/core/utils/auth-navigation.util.spec.ts --include src/app/features/auth/auth-form.spec.ts
```

- First local browser run: **6 auth cases passed** across desktop (1440×1000) and mobile (390×844). Two 404 search cases exposed a native form submission bug.
- Fixed the 404 form to handle the native submit event and prevent navigation; the **2 affected desktop/mobile cases passed** on the targeted rerun in 7.9 seconds. All eight public-page scenarios have passed.
- All **8 public-page cases passed again** within the final coordinated 28-scenario run after the authentication throttle correction.
- Auth browser coverage includes real isolated-customer registration, rejected login feedback, customer/admin return restrictions, access-token refresh on reload, persistence after a second reload, desktop/mobile logout, and return to login for a protected route after logout.
- About/404 checks cover RTL layout, a single main landmark, no horizontal overflow, removal of the 404 canvas and searching by pressing Enter.

```text
npx playwright test e2e/public-pages.spec.mjs --output artifacts/playwright-public --reporter=line
npx playwright test e2e/public-pages.spec.mjs --grep "about and missing" --output artifacts/playwright-public-search --reporter=line
```

The tests enforce local origins, create separate QA customers and disable traces and automatic screenshots for credential flows. Public-page screenshots contain empty form validation states, not credentials. QA customer records remain in the isolated local database.

Screenshots are in `artifacts/browser/public-{login,register,about,not-found}-{desktop,mobile}.png`. Login desktop, registration mobile, about mobile and 404 desktop screenshots were visually reviewed. The corrected 404 behavior is covered by browser tests and the final production build.
