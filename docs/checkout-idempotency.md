# Checkout retries across authentication changes

`POST /api/orders` accepts `Idempotency-Key` (16–128 letters, digits or hyphens). New keyed orders use a private immutable CheckoutAttempt decision and one global `attempt:<key>` value under the existing unique sparse Order idempotency index. Login is not part of the unique attempt key. The winning approval reserves its original owner, invoice and stable Order identity before insertion. See [checkout pricing and durable decisions](checkout-pricing.md) for mandatory quote consent, terminal rejection and rollout requirements.

Version 2 also reserves each purchased specification and its design fingerprint, with private manufacturing references captured from the same Product read. New submissions include `expectedQuoteVersion:2`; exact legacy committed orders and approved protocol 1 decisions recover using their original identity and snapshot without migration. Uncommitted old-version requests require a fresh explicit review after durable rejection. Current verification is recorded below; older test/build results remain historical evidence.

An identical retry by that original owner returns 200 with the existing receipt/token. This lookup happens before current product availability, prices, shipping settings or maintenance mode are checked, so a lost response remains recoverable after catalog changes. A changed payload remains a 409 with `errors.checkoutDetails`, described below. Requests without a key retain the existing non-idempotent API behavior; the storefront supplies a random key and retains it until the outcome is resolved.

## Session conflicts and privacy

Guest → customer, customer → guest and customer A → customer B retries cannot create another order with the same attempt key. They return a generic HTTP 409 with no `data`, order number, customer details, owner identity or tracking token:

```json
{
  "success": false,
  "message": "This checkout attempt cannot be retried in the current session.",
  "statusCode": 409,
  "errors": {
    "checkoutSession": [
      "Restore the original sign-in state before retrying, or contact the store. Do not submit this attempt as a new order."
    ]
  }
}
```

The regular error envelope also includes `timestamp` and `path`. Clients should recognize `errors.checkoutSession` and retain the existing pending key/payload. They should explain the changed checkout session and restoration/support path instead of reporting a stock/price problem or silently creating a new key. Ownership is checked before comparing fingerprints. There is no automatic account linking and no cross-owner receipt recovery through an idempotency key.

Concurrent different-owner submissions race on the private decision's global key; only its original owner can materialize/recover the approved Order. Other owners receive the private session conflict. Same-owner retries retain one Order. An approved but unmaterialized snapshot remains recoverable after catalog changes; a rejected decision cannot insert.

## Storefront recovery

The Angular client persists the key, exact payload and enum state in session storage. A legacy record without state is uncertain. Network/session failures retain the original request. While uncertain, edited delivery details or cart cannot silently replace it: the service returns local `checkoutDetails` without HTTP. A validation rejection observed by a first previously certain submission permits corrections followed by a newly reviewed request and **new key**. A 422 or generic 409 on an already uncertain retry cannot unlock its snapshot. Sequence checks stop a late initial rejection overriding a newer retry.

Only exact `checkoutNotRecorded` terminal proof can resolve an uncertain attempt as not recorded: a durable rejected decision prevents every participating writer from inserting. The client preserves the rejected snapshot for explanation, requires fresh quote review and explicit confirmation, then uses a new key. Current verification is recorded below, separately from historical browser checkpoints.

Pending attempts also suppress automatic profile-name/email filling, both when authentication arrives and after the cart reloads. Signing in therefore does not silently change a blank email or the request identity. Current form and cart edits remain visible and saved.

**إعادة محاولة الطلب السابق** explicitly sends the saved request and key. The panel shows its name, address and item count. Its explanation covers receipt recovery, completion of the same approved request, and fresh price/shipping review after confirmed rejection. It does not promise every old uncommitted request will be inserted. This action does not switch accounts, link a guest order to an account or bypass the server's owner check.

When a response arrives, the cart compares the sent request and captured product configuration against current form/cart facts, including same-ID/quantity changes while waiting. For uncertain recovery it compares the returned purchased configuration; legacy unavailable specifications cannot prove that the cart still matches, so the cart is retained. Unchanged new checkout clears the cart; otherwise the receipt explains that current edits were preserved. **الرجوع للسلة المحفوظة** returns to those edits with deliberate keyboard focus, and reload retains them. Creating a later order requires explicit submission.

Browsing products from the receipt now retains its saved order and private tracking token. Returning to an empty cart restores that receipt; adding products keeps the saved receipt separately accessible. The guest receipt also displays only whitelisted public status history and notes, using the same presentation helper as account orders. Current scoped browser evidence is recorded in [implementation progress](implementation-progress.md); the version 2 evidence below belongs to the earlier 04:03 build.

Receipt tracking captures its revision and latest request sequence when subscribed. Saving or clearing a receipt invalidates earlier reads, so tracking order A cannot overwrite a newly saved order B. An error from A is also ignored if the cart now holds B. Five regression cases cover those races, clearing, cold subscriptions and response ordering. The historical **05:09 P6YL7ZPA** build passed **239/239** Angular and **6/6** targeted cart browser cases after reproducing the actual overwrite on 04:57. Current **05:44 NOO3XGHS** verification passed **256/256** Angular and **12 distinct affected browser device cases**, including the same extended recovery scenario on both devices. It retains the four original same-key attempts, then submits a second order with a new key and checks its receipt/token after releasing A's response and after reload. The new [private guest link](guest-tracking-frontend.md) retrieves that receipt in a separate browser session without replaying checkout or clearing an unresolved submission.

These changes retain the existing standalone components, external templates/styles, typed contracts, signals, companion control data and subscription cleanup. They do not replace server-side idempotency with browser state.

## Changed checkout details

An existing attempt submitted by its original owner with different normalized details returns HTTP 409 with no receipt, token or order data:

```json
{
  "success": false,
  "message": "This idempotency key was already used for different order details.",
  "statusCode": 409,
  "errors": {
    "checkoutDetails": [
      "Restore the original checkout details to recover the existing receipt, or contact the store. Do not submit this attempt as a new order."
    ]
  }
}
```

The standard `timestamp` and `path` fields are also present. Preserve the pending key and saved original request while the customer edits the form. Receipt recovery must explicitly retry the saved request under its original sign-in state; a details conflict must not silently generate a new key. Ownership is checked first, so a different owner receives only `checkoutSession`, even if details also changed. These rules apply equally to new and legacy attempts.

For a valid key, committed-order/decision lookup and ownership checks precede customer validation. A committed or bound attempt with malformed customer details receives `checkoutDetails` 409 for its original owner or `checkoutSession` 409 for another owner. A first invalid request without a binding receives 422 and performs no insertion/reservation; this does not prove another running request cannot later commit. Previously uncertain clients keep the original request. Equivalent trimmed names/Egyptian phone formats retain their normalized fingerprint. Quoted requests also bind `expectedQuoteFingerprint`; legacy no-quote hashing remains unchanged.

## Compatibility and rollout

Existing `guest:<key>` and `<24-character lowercase hexadecimal user ID>:<key>` records are checked alongside the new global key, across all owners, before any insertion. A single legacy match follows the same original-owner/payload rules without rewriting its key, prices, ownership or history. If multiple old or mixed-format orders already share an attempt key, lookup fails closed with `errors.checkoutSession`; no record is chosen, disclosed, merged or deleted and no further order is inserted.

This compatibility path requires no database migration or backfill. It uses the existing idempotency index and a bounded two-result legacy lookup; legacy suffix matching may examine more index entries as order volume grows. A later measured optimization can normalize verified keys offline, but must not merge historical orders silently.

Drain **all old writers**, including versions with global keys but no durable decisions. Pre-reservation writers cannot honor rejection tombstones. Confirm the existing unique sparse Order index (`Order.init()` at startup); CheckoutAttempt uses MongoDB's intrinsic unique `_id` index. Never expire/delete/reset bindings or silently remove approved Orders; use cancellation. Consistent backups, primary/majority reads and majority journaled writes are part of the recovery boundary. No shared/deployed database was changed during implementation.

## Version 2 source verification

The final full Angular suite passed **208/208 across 37 files** in **5.33 seconds**; backend syntax and **169/169 tests** passed, including exact v1 snapshot recovery and v2 configuration race/privacy cases. Production build `main-R4RLZPZA.js` / `styles-IJQZ35G4.css` completed at **04:03:02.471 UTC** in **10.031 seconds**, **483.48 kB raw / 129.57 kB estimated initial transfer**.

All **35 scenarios on each device** are covered on this unchanged build through scoped browser invocations. Desktop complete runs passed **34/35 in 2.5 minutes** and **34/35 in 2.7 minutes**, then targeted shipping **1/1 in 4.7 seconds** after fixture changes for nested disclosures and the private/public response boundary. Mobile passed **34/35 in 2.7 minutes**, then targeted administration **1/1 in 10.1 seconds** after capturing its browser response body before DOM assertions. Existing lost-response/session/cart-edit recovery and version 2 consent pass on both devices. No application/backend/build change occurred between those invocations. The original failures, corrected assertions and artifact paths are documented in [checkout pricing](checkout-pricing.md#version-2-verification--0403-build). These are 70 covered device cases, not a single clean complete 70/70 run. The following earlier checks remain historical evidence.

## Historical source and integrated verification — 03:07 build

Quote consent passed **143/143** backend tests. Durable decisions then passed **155/155** first run, zero failures/skips/cancellations (**9330.3312 ms**), and `npm run check` passed. The final rerun after the kebab-case model rename again passed **155/155** (**10665.0963 ms** TAP duration), with syntax checks passing in **6.04 seconds**. Twelve new cases cover both paused decision race winners, approved snapshot completion, lost acknowledgements, legacy unquoted recovery, strict binding, corruption, privacy and MongoDB durability options. Angular passed **177/177 across 30 files** in **5.10 seconds**. The final production build completed at **03:07:27.817 UTC** in **9.405 seconds**, producing `main-LACTZSO4.js` / `styles-TFH64YQR.css` (**481.21 kB raw / 128.78 kB estimated initial transfer**). Browser integration is tracked in [checkout pricing](checkout-pricing.md).

Final desktop **35/35 in 3.1 minutes** and mobile **35/35 in 2.6 minutes** passed on that same build: **70 project cases**, one worker, zero retries, fresh disposable API per device and real quota-reset pacing. The new four device cases exercise price consent and durable legacy rejection/new-key recovery; existing lost-response/session/edited-cart cases remain green. Reports are under `artifacts/playwright-2026-09-17-checkout-{desktop,mobile}-final/report`. The first 02:58 desktop run's 31/35 outcome and four fixture corrections remain documented in [checkout pricing](checkout-pricing.md); the current pass is not represented as an unbroken first run.

## Historical integrated verification — 02:01 UTC

The historical `main-GN52CWI4.js` / `styles-2XRGXKQX.css` checkpoint, built at `2026-09-17T02:01:33.744Z`, passed **160/160 Angular tests across 29 files**, **132/132 backend tests** and **66 browser project cases (33 unique scenarios × two devices)**. Desktop passed **33/33 in 2.6 minutes** and mobile **33/33 in 2.2 minutes** on that same build, both on the first attempt with one worker, zero retries, a fresh restored API for each device and no intervening application edit. Guest checkout and lost-response recovery passed on both devices. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. Complete timings and scope are maintained in [implementation progress](implementation-progress.md#current-verification-evidence) and [payment QA](order-payments-qa.md).

## Historical integrated checkpoint — 01:09 UTC

The shared 01:09 checkpoint passed **152/152 Angular tests across 29 files**, **118/118 backend tests** and **64 browser project cases**. Desktop passed 32/32 in 2.6 minutes and mobile 32/32 in 2.2 minutes on the same `main-O65VYLKE.js` build, completed at `2026-09-17T01:09:53.339Z`. Guest checkout and lost-response recovery passed on both devices. The initial manual-payment cases also verified that refreshed private receipts exposed recorded totals without changing checkout identity. These results are retained as historical evidence, separate from the current recovery checkpoint.

## Historical integrated checkpoint — 00:41 UTC

That checkpoint used `main-CRXD3LD4.js` / `styles-DWJFAQFT.css`, completed at `2026-09-17T00:41:15.253Z`. **127/127 Angular tests across 25 files** and **101/101 backend tests** passed. Desktop's complete suite passed **30/30** on the preceding build; after a shipping-only validation correction, affected desktop shipping passed **1/1**, and mobile passed **30/30** on `main-CRXD3LD4.js`. The guest-checkout and lost-response recovery scenarios passed on both devices. Those runs covered 60 project cases through 61 successful executions across scoped builds. Historical shipping scope and reports are in [shipping browser QA](order-shipping-qa.md).

The new agreed-shipping flow preserves the existing order and guest receipt credential while updating confirmed shipping and the latest invoice total. Both device shipping cases verify private guest refresh and zero-fee recovery; see [shipping browser QA](order-shipping-qa.md). Performance remains separate evidence tied to its measured build in [performance-audit.md](performance-audit.md).

## Historical integrated checkpoint — 00:02 UTC

The 00:02 production target was `main-XUOZCJNX.js` / `styles-LJPYLT3M.css`, built at `2026-09-17T00:02:25.124Z` and served from local port 4300, initial 479.05 kB raw / 127.99 kB estimated transfer. The full Angular suite passed **115/115 tests in 24 files** at 00:01:58 UTC in 5.25 seconds, and the backend suite passed **89/89**. The saved historical build identity is `artifacts/performance/current-0002-build-identity.json`.

All **58 then-existing desktop/mobile project cases** were covered across scoped invocations. Mobile passed **29/29 in 2.2 minutes** on the historical 00:02 build (`artifacts/playwright-mobile/report`). After the cart display correction, desktop product/media/cart, guest-checkout and lost-response recovery passed **3/3 in 7.6 seconds** on the same build (`artifacts/playwright-desktop-cart-final/report`). Remaining unchanged desktop features retained the preceding `main-527HOIT4.js` evidence: 28 initial passes plus one admin case passing after a selector-only correction. This was not a single clean 58-case run. Performance measurements and their historical limits are documented separately in the [performance audit](performance-audit.md).

The lost-response scenario passed on both devices: a real guest order is saved, sign-in/reload preserves the blank email, wrong-session attempts return private 409 responses, edited checkout details send no HTTP request, and explicit replay after logout returns the original receipt. All four POSTs use the original key/body. The edited quantity/address remain when returning from the receipt. Existing checkout also verifies the rendered WhatsApp link uses an international Egyptian `201` prefix.

Static review of the four `artifacts/browser/checkout-{recovery,recovered-receipt}-{desktop,mobile}.png` images found readable Arabic RTL, intact wrapping and visible replay/return actions. The images distinguish the saved quantity of one from the retained current cart quantity of two. The mobile order reference wraps inside its card. The previously observed raw size zero is gone after the cart reused existing product-spec formatters; source catalog data is unchanged. These images and the browser assertions are local evidence; recovery returning 201 after a request never reached the server, confirmed-422 correction and recovery from an empty/invalid current cart remain unit-covered branches.

The earlier combined run's 53 passes and 5 quota-associated failures are preserved in `artifacts/browser-quota-run-2026-09-16/`, including `http-errors.json`. Current device isolation and pre-scenario health-header pacing preserve production quotas and all business assertions; see [public-page QA](public-pages-qa.md). No new tests, API requests or browser jobs were started to update this report.

## Backend regression history

Eight HTTP regression cases in `test/checkout-idempotency.test.js` cover sequential and concurrent authentication transitions; malformed committed retries; invalid first requests and same-key corrections; original-owner replay after product deletion/repricing and maintenance changes; legacy compatibility; concurrent legacy retries; and preexisting ambiguity. The tests use a disposable MongoDB, including real unique-index races.

Verification on 2026-09-17, from `outako/backend-api`:

- `node --test test/checkout-idempotency.test.js`: **8/8 passed**.
- `npm test`: **86/86 passed**, with zero failures or skips.
- `npm run check`: passed.

These commands did not restart the shared API or modify the shared catalog. Coordinated frontend/browser integration is tracked separately.

The earlier `checkoutDetails` extension added assertions to the existing two changed-payload cases without increasing the case count. Its full suite passed **84/84**, with zero failures or skips; `npm run check` also passed.

A later correction moves existing-key ownership checks ahead of customer validation. Two additional HTTP cases cover malformed committed retries for global/legacy guest/customer attempts, unchanged stored orders, normalized replay, and invalid first requests followed by correction using the same key. This correction passed **8/8 targeted cases**, **86/86 full backend cases**, and syntax checks; the subsequent category-endpoint full suite also passed **89/89**. Its per-test limiter reset affects only the disposable test application's loopback key and does not change production quotas. The coordinated local API restart activated the correction and restored the catalog. No checkout requests were sent during that activation, preserving submission quota for browser verification; regression assertions used disposable test databases.

Before that validation-precedence correction, the coordinated local API restart restored twelve Arabic public products and four pending inactive drafts. Live HTTP verification returned **201 → 409 (`checkoutDetails`) → 200** for a synthetic checkout, changed details, then the saved original request. The recovered receipt/token matched the first response. Only the synthetic order was removed afterward; the order count and all sixteen catalog documents were unchanged by the probe. All four draft lookups returned 404, and 44 image-source records/70 distinct WebP files passed file-size and decoded-dimension checks. Media GET and order preflight allowed the local `http://127.0.0.1:4300` origin. This is local integration evidence, not a deployed checkout verification.
