# Agreed order shipping — frontend

The Arabic administrator order detail now includes a separate shipping editor. It saves the fee agreed with the customer and updates the existing invoice total. It does not collect payment, change order status, or create a status-history event. The server remains authoritative; see [backend contract](order-shipping-backend.md).

## Current follow-up verification — 17 September, 05:09 UTC build

The full Angular suite passed **239/239 tests across 39 files in 6.38 seconds**, first attempt (test bundle `2026-09-17T05:09:06.658Z`, 8.363 seconds); backend passed **178/178**. Production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**. Four exact build files are recorded in `artifacts/performance/current-0509-build-identity.json`.

Final cart/media, guest-checkout and extended lost-response checks passed **6/6 in 27.3 seconds** (three per device, one invocation, zero retries) on this build. Broader follow-up coverage is scoped: **11/12 desktop** on 04:49 plus corrected contact **2/2** on 04:57, and **12/12 mobile** on 04:57. The other **23 scenarios retain historical 04:03 coverage**. This is not a new 70-case or complete-device pass. [Public-page QA](public-pages-qa.md#current-follow-up-verification--17-september-0509-utc-build) retains every report, the before-fix tracking failure, corrected application behavior and exact coverage limits.

Shipping passed within the 04:49 desktop and 04:57 mobile follow-up runs. The scenario now refreshes the public status note after cancellation while preserving the exact invoice and separately checking private manufacturing evidence. The 05:09 checks target cart/receipt tracking, not another shipping mutation.

## Historical configuration checkpoint — 17 September, 04:03 UTC

The full suites passed **208/208 Angular tests** and **169/169 backend tests**. Production `main-R4RLZPZA.js` / `styles-IJQZ35G4.css` completed at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. All 35 scenarios are verified on both devices through scoped invocations, covering 70 project cases: desktop **34/35 in 2.5 minutes**, then **34/35 in 2.7 minutes**, then targeted shipping **1/1 in 4.7 seconds**; mobile **34/35 in 2.7 minutes**, then targeted admin operations **1/1 in 10.1 seconds**. No application/backend/build change occurred between these runs. These are not clean complete-device passes; [shipping QA](order-shipping-qa.md) and [public-page QA](public-pages-qa.md) retain the failure scope and report paths.

Shipping browser assertions now target the receipt's direct invoice list, since item-configuration disclosures also contain semantic `dl` elements. Exact public invoice preservation is checked separately from the protected manufacturing snapshot captured in the initial administrator detail. Shipping responses omit that private snapshot; the parent preserves matching already-loaded evidence without substituting current product data. Public receipt configuration remains separate from private manufacturing evidence and from payment status.

## Workflow

1. Open an order in `/admin/orders`. An unconfirmed fee starts blank; an existing confirmed fee is shown. Zero is an explicit valid fee. Amounts must be finite, between zero and EGP 10,000,000, with at most two decimal places, matching the server's decimal rule.
2. Enter the fee and optional private note, then confirm that the customer agreed to the resulting total. Changing the fee or note clears the agreement and previous review.
3. Select **مراجعة رسوم الشحن**. The review shows saved product subtotal, discount when present, proposed shipping and resulting total, calculated in integer piastres.
4. Select **تأكيد وحفظ الشحن** to make the explicit PATCH request. The request contains the saved shipping revision and order status, agreement, fee and optional trimmed note. A generated idempotency key identifies that exact attempt.
5. A successful response replaces the displayed snapshot and updates the parent detail/list. Dedicated shipping history shows previous/new fees and totals, the recorded agreement, timestamp and private note. Actor identifiers and request keys are not rendered.

Shipping fields and actions are disabled for server-reported ineligible order states. The server currently permits new shipping writes only while pending, processing or printed. An unchanged confirmed fee cannot create a redundant update. Existing confirmed zero fees remain displayed as confirmed.

## Conflicts and uncertain responses

Conflicts, validation failures and transport errors preserve the typed fee and note and clear the agreement. Saving remains blocked until the administrator explicitly selects **تحميل أحدث تفاصيل الطلب**. Reload uses GET, preserves the draft, and requires another agreement/review if the fee still needs changing. It never automatically replays a write.

If the earlier PATCH committed but its response was lost, the refreshed fee/history identify the saved result; the editor does not create another shipping event for the unchanged fee. If the request did not commit and the saved snapshot is unchanged, an explicit re-reviewed retry retains the original exact body and key. A changed request is permitted only after the explicit reload and receives a new key. Backend revision/status checks and replay rules decide whether any write is valid.

Parent detail switching, closing, pagination and status changes are blocked while a shipping draft or request is active. A known-stale status update also disables the shipping editor until the parent detail is reloaded. Updated input snapshots invalidate the prior review; callbacks and finalizers are guarded by both request identity and order identity so a late response cannot alter a subsequently opened order.

## Customer views

Existing tracking/account reads return server shipping, confirmation and total. Guest receipt refresh sends the private tracking credential in `X-Order-Token`, preserving it when the public response omits it. A late read cannot replace a newer or cleared receipt, and its error cannot appear on a subsequently saved order. The receipt includes a conditional discount row and distinguishes unconfirmed shipping from confirmed shipping, including zero. Its status history displays only public notes, dates and labels; administrator shipping history and private notes remain excluded. Browsing products preserves the saved receipt and token.

## Files

- `src/app/features/admin/components/order-shipping/`: standalone signal-based editor, external Arabic HTML/SCSS, companion form configuration/state/messages and HTTP integration specs.
- `src/app/features/admin/models/admin-order-shipping.model.ts`, `admin-operation.model.ts`: typed request, snapshot and administrator history contracts.
- `src/app/features/admin/services/admin-operations.service.ts`: typed PATCH/header integration and detail mapping.
- `src/app/features/admin/pages/operations/`: parent integration and navigation/status guards.
- `src/app/features/cart/pages/cart-page/cart-page.component.html`: conditional receipt discount and confirmed-shipping copy.
- Existing order service/cart specs cover updated totals, private token retention and rendered receipt wording.

## Historical shipping verification — 17 September, 00:41 UTC

Newest integrated verification is recorded in [implementation progress](implementation-progress.md) and [payment QA](order-payments-qa.md). The shipping-specific results below retain their original build and run scope.

At this checkpoint, source formatting was complete. Twelve new unit cases passed: ten administrator cases, one public order-service case (tracking and account totals) and one rendered receipt case. They include normalized HTTP 409 errors, lost-response recovery, zero fees, invalid decimal precision, terminal states and overlapping request finalizers. Async rendering assertions use `fixture.whenStable()` rather than forced post-response change detection.

- `npm test -- --watch=false --include=src/app/features/admin/components/order-shipping/admin-order-shipping.component.spec.ts`: **10/10 passed**, duration 1.80 seconds, after the reload validation correction below.
- `npm test -- --watch=false`: **127/127 tests passed in 25 files**, duration 5.38 seconds; test bundle completed `2026-09-17T00:40:47.847Z`.
- `npm run build`: **passed**, without warnings, in 11.120 seconds at `2026-09-17T00:41:15.253Z`. Browser entry `main-CRXD3LD4.js`, stylesheet `styles-DWJFAQFT.css`; initial bundle 479.71 kB raw / 127.98 kB estimated transfer. The administrator operations route remains lazy-loaded (`chunk-HY76IFOW.js`, 69.29 kB raw).
- The production preview process and prior browser reports were left untouched for root's coordinated restart and checks.

The preceding `main-H3VQSUTN.js` build (`00:36:02.788Z`) passed 127 units and the complete **30/30 desktop browser suite in 2.4 minutes**. Root's screenshot review then identified an incorrect agreement error after a committed zero-fee response was recovered through reload: the agreement was correctly unchecked, but the prior validation-attempt flag remained set. Successful reload now clears that flag while retaining the fee/note and the fresh agreement requirement for future changes. The existing committed-response-loss test now also asserts that no agreement error remains in the rendered panel.

Final desktop shipping passed **1/1 in 6.2 seconds**, and the complete mobile suite passed **30/30 in 1.8 minutes**, both on `main-CRXD3LD4.js`. Together with the preceding complete desktop 30/30, these runs cover **60 project cases through 61 successful executions**, using one worker and zero retries. No browser attempt failed this cycle; the validation defect was found by screenshot review between desktop and mobile, and the original image is preserved in `artifacts/browser/shipping-0036-desktop`.

Reports are `artifacts/playwright-2026-09-17-shipping-{desktop,desktop-final,mobile}/report`. This is scoped verification across two builds, not one uninterrupted 60-case run or a complete desktop rerun on the final build. Both shipping device cases verify real HTTP, retained conflict drafts, recovery of the committed zero fee without another write, private guest tracking and mobile/desktop overflow checks. Root maintains the detailed [shipping browser record](order-shipping-qa.md); performance measurements remain separate in [performance-audit.md](performance-audit.md).
