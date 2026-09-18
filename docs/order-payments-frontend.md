# Administrator payment records

## Current follow-up verification — 17 September, 05:09 UTC build

The full Angular suite passed **239/239 tests across 39 files in 6.38 seconds**, first attempt (test bundle `2026-09-17T05:09:06.658Z`, 8.363 seconds); backend passed **178/178**. Production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**. Four exact build files are recorded in `artifacts/performance/current-0509-build-identity.json`.

Final cart/media, guest-checkout and extended lost-response checks passed **6/6 in 27.3 seconds** (three per device, one invocation, zero retries) on this build. Broader follow-up coverage is scoped: **11/12 desktop** on 04:49 plus corrected contact **2/2** on 04:57, and **12/12 mobile** on 04:57. The other **23 scenarios retain historical 04:03 coverage**. This is not a new 70-case or complete-device pass. [Public-page QA](public-pages-qa.md#current-follow-up-verification--17-september-0509-utc-build) retains every report, the before-fix tracking failure, corrected application behavior and exact coverage limits.

The three payment scenarios per device were not rerun in this follow-up. Their last browser coverage remains the historical 04:03 checkpoint; the newer cart checks do not establish new ledger coverage.

## Historical configuration checkpoint — 17 September, 04:03 UTC

The full Angular suite passed **208/208** and backend passed **169/169**. Production is `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`, built at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. All **35 unique scenarios are verified on both devices through scoped invocations**: desktop **34/35 in 2.5 minutes**, then **34/35 in 2.7 minutes**, followed by shipping **1/1 in 4.7 seconds**; mobile **34/35 in 2.7 minutes**, followed by admin operations **1/1 in 10.1 seconds**. This covers **70 project cases**, without a clean complete-device pass. The three failures were test-fixture issues: a broad receipt list selector, public/private item equality, and delayed CDP response-body access. Their corrections preserve business assertions and introduce no application/backend/build change. [Public-page QA](public-pages-qa.md) retains all five reports, the exact failure/recheck scope and the separate read-only visual probe. Earlier dated results below remain historical.

The Arabic order-detail panel records collections or refunds that an administrator confirms already happened. It does not initiate a payment, bank transfer or refund, and it does not change fulfillment or shipping status. Clerical corrections are a separate action, with separate attestations, rather than fictitious refunds.

## Recording and correction

`app-admin-order-payments` appears beside the existing shipping editor. Transaction kind, method and amount start unselected/blank. The operator chooses collection or refund, enters a positive EGP amount with at most two decimal places, selects the actual method, and supplies an optional private note. A trimmed reference of 3–200 characters is mandatory for noncash methods; cash references are optional. The amount cannot exceed EGP 10,000,000, and a refund cannot exceed the latest server-recorded net funds.

After checking the completed-operation attestation, **مراجعة تسجيل العملية** shows the exact amount, method, private reference/note and saved invoice context. **تأكيد تسجيل العملية** sends an explicit keyed POST with expected payment revision, shipping revision, status, total and delivery-confirmation state. Changing any transaction field clears the attestation and previous review. There is no default method, invented balance, external transfer or automatic write retry.

Each eligible history row offers **تصحيح هذا القيد**. The separate correction form requires a reason plus confirmation of the clerical error and that no money moved. Its review/save calls the correction endpoint for that original entry. The server preserves the original, appends a correction, excludes the corrected original from effective totals and rejects corrections that would make net funds negative. The UI does not create a replacement entry or label the correction as refunded money. An already corrected entry and a correction entry do not offer another correction action.

History rows use their actual `data-entry-id`, show the action, amount, method, timestamp, private reference/note and corrected marker, and do not render actor IDs or idempotency keys. The shared public-summary component displays the server's whitelisted totals and state. Missing legacy records are explicitly unknown evidence rather than proof of nonpayment; unconfirmed shipping and cancelled orders do not acquire a fabricated final balance. See [public summary documentation](order-payment-public-frontend.md).

## Uncertain results and concurrent changes

Every attempt retains its exact action, target entry, body and key in component state and tab-scoped storage under its order. Storage parsing is bounded to 12 KB and validates the envelope, allowed fields, enums, amounts, references, attestations and expected invoice context. Invalid stored data blocks a new transaction; a valid retained key still enables read-only recovery even when its body cannot be reconstructed safely. Private attempt data never enters the URL or public order models.

**التحقق من المحاولة السابقة** uses the protected attempt GET with the original key header. A found `entryId` updates the displayed order and clears that attempt without another POST. An absent attempt is not treated as evidence that an earlier in-flight request cannot commit. Uncertain attempts remain locked; after a negative read, **إعادة نفس المحاولة المحفوظة** can only resend the exact original body/key and correction target. A generic later 409 does not erase prior uncertainty or authorize a new identity.

The exact retry can return the specific `409 errors.paymentNotRecorded` contract when the backend proves that the bound attempt has no ledger entry and cannot commit against the advanced payment or shipping revision. Only a nonempty string-array proof with that status, without a conflicting `paymentRequest` error, changes a previously uncertain attempt to rejected. The draft remains saved and review stays blocked until the operator explicitly recovers the latest records. Both transaction and correction forms then require fresh attestations, review and an explicit save using a new key/current context. A reload preserves this resolved rejection and explains the required recovery. The message concerns the store's ledger; it does not claim that an external movement of money did or did not happen. See the backend contract for private attempt binding and durable-read requirements.

A definite initial rejection, with no earlier uncertainty, still preserves its draft/key and requires explicit successful recovery before a fresh review. Revised values are submitted only through a new explicit final-save action against the latest context. No new key is silently issued on an error. Recovery and reload clear old validation-attempt state and require fresh attestations for changed records. Failed reads preserve the draft and continue blocking writes. Request/order identity guards prevent a late callback or finalizer from changing a subsequently displayed order.

## Parent locks

Status saves, shipping saves and payment saves share the existing parent order detail. A shipping or payment draft blocks sibling commits, navigation and status changes; a known stale result also blocks commits based on that snapshot. The shared response handler updates the order and refreshes its list.

Recovery inputs are separate from edit locks. A sibling draft does not disable local discard or the active panel's required read; recovery is paused only while a status save or sibling request is in flight. Unresolved payment attempts cannot be discarded as though they were unrecorded. This keeps recovery reachable without permitting another financial write against a pending snapshot.

## Files and verification

- `src/app/features/admin/components/order-payments/`: standalone component, external template/styles, form/control data, bounded storage parser and HTTP integration specs.
- `src/app/features/admin/enums/order-payment.enum.ts` and `models/admin-order-payment.model.ts`: strict transaction/correction/recovery interfaces and state enums.
- `models/admin-operation.model.ts`, `services/admin-operations.service.ts`: administrator ledger/snapshot mapping and keyed POST/GET methods.
- `pages/operations/`: shared order updates and cross-panel locks.
- `components/order-shipping/`: independent recovery lock and updated typed test fixture.
- Public summary/model/receipt/account changes are documented separately in [order-payment-public-frontend.md](order-payment-public-frontend.md).

Signals/computed state, reactive-form event bridges, `inject`, external HTML/SCSS, companion data and `takeUntilDestroyed` follow the supplied workspace rules. Templates bind derived values and use modern tracked control flow.

### Historical checkout integration — 17 September, 03:07 UTC build

The full Angular suite passed **177/177 tests across 30 files** in **5.10 seconds**, test bundle `2026-09-17T02:53:16.414Z`, after correcting a missing router provider in a new cart test; backend passed **155/155**. Final production is `main-LACTZSO4.js` / `styles-TFH64YQR.css`, built at **`2026-09-17T03:07:27.817Z` in 9.405 seconds**, initial **481.21 kB raw / 128.78 kB estimated transfer**. Complete desktop passed **35/35 in 3.1 minutes** and mobile **35/35 in 2.6 minutes**, including all three payment scenarios on each device. These are **70 project cases across two final invocations**, using one worker, zero retries, fresh disposable APIs and real quota waits, with no application change between devices. Every case passed its first attempt in these final runs. Reports: `artifacts/playwright-2026-09-17-checkout-{desktop,mobile}-final/report`.

The preceding 02:58 build's desktop run passed 31/35. Three fixtures selected the stopped development origin, and one new checkout assertion mismatched the actual Arabic status. Those fixture corrections preserve business assertions; the final build also clarifies checkout recovery and the old-versus-current price labels. The failed report is retained at `artifacts/playwright-2026-09-17-checkout-desktop/report`; see [public-page QA](public-pages-qa.md) for the full run history. New synthetic order fixtures obtain the required quote fingerprint through the real read-only quote API. The [checkout contract](checkout-pricing.md) is separate from ledger terminal-proof recovery, and order creation still does not imply payment.

### Historical recovery checkpoint — 17 September, 02:01 UTC build

`npm test -- --watch=false` passed **160/160 tests across 29 files** on the first run, in **5.19 seconds**; its test bundle completed `2026-09-17T02:00:48.628Z`. The administrator payment suite now has eighteen cases, including terminal transaction/correction recovery through reload and rejection of invalid proof responses. It retains exact retry, negative-read/generic-conflict uncertainty, validation, late responses, private storage and parent locks. Two new product-creation cases account for the other increase from the preceding 152 tests. Backend verification passed **132/132**, including eleven new reservation/recovery cases.

The production build passed in **10.083 seconds** at `2026-09-17T02:01:33.744Z`, producing `main-GN52CWI4.js` / `styles-2XRGXKQX.css`. Initial bundle sizes are **479.73 kB raw / 128.00 kB estimated transfer**; the lazy administrator operations bundle is 122.97 kB raw / 20.51 kB estimated transfer. No font change was adopted.

**Real-browser verification passed on the same final `main-GN52CWI4.js` build:** desktop **33/33** in **2.6 minutes**, followed by mobile **33/33** in **2.2 minutes**. These are two complete device invocations, covering 33 scenarios on both devices, with one worker, zero retries and no application change between them. Reports are under `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. All three payment scenarios passed on both devices, including the new uncertain-attempt/concurrent-collection/terminal-proof flow, draft restoration and fresh explicit review. Existing refund/correction accounting, lost-response recovery and private guest summaries also passed.

The prior read-only viewport check confirmed that the clipped skip-link strip in tall receipt element captures was a screenshot artifact. Normal mobile viewport captures were clean; keyboard focus exposed the link and its activation moved focus to the main content. Evidence is preserved in `artifacts/browser/payment-viewport-diagnostic`; no related application change was made. That checkpoint's desktop/mobile payment and receipt captures were also visually inspected. The separate [performance audit](performance-audit.md) maintains measured home/catalog/product results and their limitations; functional success does not establish a Lighthouse score.
