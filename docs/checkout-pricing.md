# Checkout specification and price consent

New orders require consent to current product specifications, effective prices and configured shipping. Version 2 binds the purchased configuration into the quote and stores it with the Order, so subsequent catalog edits cannot change the recorded purchase. A quote does not change products, settings or orders and exposes no customer or private manufacturing/operational fields.

The version 2 implementation passed 208 Angular tests, 169 backend tests and all 35 browser scenarios on each device through the historical 04:03 scoped invocations documented below. Current verification passed **278 Angular tests and 192 backend tests**. The added [storage guards](checkout-storage-safety.md) require a saved, readable request identity before submission and preserve refreshed receipts during cleanup; [money validation](catalog-money-validation.md) rejects fractional piastres at administrator writes. Pricing and legacy-recovery browser cases passed on desktop 06:34 and mobile 06:41, with the checkout service unchanged between those builds. Final 06:41 checks also verify the repaired native skip link on both devices. The complete current scope is 24 distinct device cases across these builds, including 15 on the final build; it is not a new whole-suite pass. [Private tracking](guest-tracking-frontend.md), [public QA](public-pages-qa.md) and [implementation progress](implementation-progress.md) preserve exact scope and earlier failures. The 05:44 private-tracking and 03:07 version 1 results remain historical evidence.

## Public quote

`POST /api/orders/quote` accepts only `{"items":[{"productId":"<ObjectId>","quantity":2}]}`. This read-only operation requires no authentication and uses the broad API limiter, not the public submission quota. The usual success envelope contains:

```ts
interface CheckoutQuoteItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number | null;
  lineTotal: number;
  configuration: ProductConfiguration;
  configurationFingerprint: string;
}

interface CheckoutQuote {
  quoteVersion: CheckoutQuoteVersion; // Current = 2.
  quoteFingerprint: string;
  currency: string; // Always EGP.
  items: CheckoutQuoteItem[];
  subtotal: number;
  discount: number; // Currently zero.
  deliveryFee: number;
  deliveryFeeConfirmed: boolean;
  total: number;
  estimatedDeliveryDays: string;
}

interface ProductConfiguration {
  version: ProductConfigurationVersion; // Current = 1.
  material: string;
  finish: string;
  color: string;
  size: string;
  weight: string;
  printTime: string;
  layerHeight: string;
  infill: string;
  isMadeToOrder: boolean;
  productionTimeMin: number | null;
  productionTimeMax: number | null;
  productionTimeUnit: ProductionTimeUnit | null;
  safetyNote: string;
}
```

Amounts are EGP with exact whole-piastre arithmetic. `discountPrice:null` means no item discount; otherwise it is the effective selling price, below `unitPrice`. Quantity multiplies that effective price. Safe aggregate totals can exceed the per-unit price limit. No tax amount or tax-inclusive claim is introduced.

Unknown configured shipping is `deliveryFee:0, deliveryFeeConfirmed:false`; the total excludes unconfirmed shipping. Explicit free delivery is `0,true` and produces a different fingerprint. The quote invents no rate or final delivery date.

Invalid or unavailable items return 422 with indexed errors such as `items[1].productId`, `items[1].quantity` or `items[1].configuration`, in submitted order. No partial quote or inactive details are returned. Missing settings and maintenance return 503. Reading never initializes settings.

The 64-character lowercase SHA-256 quote fingerprint covers protocol version, EGP currency, ordered product IDs/quantities, each configuration and its fingerprint, original/effective prices and line totals, subtotal, discount, shipping amount/confirmation and total. The configuration fingerprint binds product ID/name/image, raw configuration, gallery/model reference and catalog source manifest hash. This makes a same-price change to color, dimensions or design require a fresh review. Estimated-delivery text remains outside the quote identity. Reads use primary/majority. A quote has no database record or expiry; a new insertion checks current data again.

Raw specification values remain unchanged: a stored weight of `45` is not converted into an asserted `45 g`. Each of the eight specification strings is bounded to 500 characters and the safety note to 5,000. Production estimates are finite values from 1 through the safe numeric limit; made-to-order configurations require a unit, both bounds and maximum ≥ minimum. Public Product responses expose only the opaque configuration fingerprint, with null for invalid/unavailable configuration. Private review references are never encoded as public fields.

## Submission and immutable decisions

`POST /api/orders` accepts the existing customer/items payload plus `expectedQuoteVersion:2` and `expectedQuoteFingerprint`, with `Idempotency-Key` (16–128 letters, digits or hyphens). Client totals/currency remain untrusted. New insertions require a valid matching version 2 quote. Quoted requests bind its fingerprint and supplied version into their canonical identity; absent-version legacy hashes remain unchanged.

A private `CheckoutAttempt` atomically chooses one decision under the raw key's natural unique `_id` index:

| Decision | Private stored facts | Exact owner/request retry |
| --- | --- | --- |
| Approved | Owner, protocol/quote version, request/quote hashes, complete validated customer/invoice/configuration snapshot, private manufacturing references, stable Order ID/number/time and snapshot checksum | Completes the same Order despite later catalog/settings changes; 201 when inserted or 200 for an existing receipt. |
| Rejected | Owner, request hash, quote version, optional quote hash, missing-quote/changed-quote/unsupported-version reason; no snapshot | Terminal 409 `checkoutNotRecorded`; this attempt cannot insert an Order. |

Only canonical valid customer/items requests can create a decision. Missing/empty/null quote or missing/old numeric quote version on an old uncommitted request receives a rejected decision and usable recovery. Malformed fingerprints/versions, invalid first customer/items requests, transient configuration failures and ordinary errors are not terminal proof. Old clients cannot approve a new configuration by ignoring its version field.

Every keyed new writer must win or read the decision before insertion. Duplicate candidates obey the durable winner. A previously approved candidate paused before reservation cannot insert after rejection wins; a rejected candidate cannot announce rejection after approval wins. Stable reserved Order ID and unique Order idempotency key prevent duplicate materialization without a multi-document transaction. No attempt update, TTL, expiry or reset exists.

Before materialization, approved snapshots are checked for strict shape/checksum, owner/request/customer/item binding, version-specific quote hash, configuration/design fingerprint, private snapshot validity and exact arithmetic. Corrupt records return 503 `checkoutAttempt`, without data or terminal proof. Decisions/materialization use majority journaled writes; decision, committed-order and race-winner reads use primary/majority. Lost write acknowledgement remains uncertain until an exact retry reads the durable result.

Existing protocol 1 approved decisions retain their original JSON, digest and fingerprint algorithm and can still materialize exactly. Legacy Order lines serialize configuration/fingerprint as null; the system does not reconstruct historical specifications from today's Product. Version 2 line snapshots include actual model/source/review references and verified measurement values from the same Product read. Only protected admin detail exposes `manufacturingSnapshot`; quote, checkout, tracking and customer-order serializers whitelist public fields. Stored references are historical records, not a new verification of rights, samples, measurement units or externally hosted file retention.

## Terminal response and private conflicts

Only a matching owner/body with a valid durable rejected decision receives:

```json
{
  "success": false,
  "message": "This checkout attempt was rejected and cannot create an order.",
  "errors": {
    "checkoutNotRecorded": [
      "This exact checkout attempt cannot create an order. Review current prices and shipping, then explicitly confirm a new checkout request."
    ]
  }
}
```

The usual `statusCode:409`, timestamp and path are also present. There is no data, receipt/token, refreshed quote or private metadata. The marker never accompanies an identity-conflict field. The client may now require fresh quote review, explicit confirmation and a **new key**; the rejected key cannot accept a changed body.

Different original sign-in state returns private `checkoutSession` 409. Changed normalized customer/items/quote returns `checkoutDetails` 409. Neither proves non-recording or discloses a receipt. Generic 409/422 after an earlier uncertain request must preserve the exact body/key. A bare negative read, price mismatch or HTTP status alone is not proof. Unkeyed compatibility callers have ordinary quote-validation errors and no durable retry guarantee; the storefront always supplies a key.

Committed global and owner-prefixed Orders replay first, before quote/customer/catalog validation, for the original owner and exact original request. They require no new quote or attempt migration. Ambiguous legacy matches remain private conflicts. Cancellation retains Order and decision: exact replay returns the current cancelled receipt and stable tracking token without a replacement.

## Rollout and operational boundary

Drain **all old checkout writers**, including versions with global keys but no decisions, before rollout. Pre-reservation writers cannot honor rejection; mixed-version traffic invalidates terminal proof. Confirm the existing Order unique idempotency index. CheckoutAttempt uses MongoDB's intrinsic unique `_id` index. No catalog, price or historical order migration is required.

Never delete/reset decisions or reuse keys. Raw deletion of an approved Order permits recovery to rematerialize its reserved snapshot; use operational cancellation. Restore decisions and Orders consistently. Rollback/reset, unsupported external writers or manual binding edits invalidate the proof. Approved snapshots contain private delivery details and need Order-equivalent access/backup controls. Retention/redaction requires a separate protocol preserving bindings and recovery; there is no silent garbage collection. Collection growth is one permanent bounded-size record per canonical decided attempt, protected by existing submission quotas.

Durability tests use a disposable one-member replica set with primary/majority reads and explicit majority+j writes. They do not simulate elections, restoration or deployed mixed-version traffic. Disposable single-node local development is not production durability evidence.

## Backend verification

The quote implementation first passed **143/143 backend tests**. After durable decisions, `npm run check` passed and `npm test` passed **155/155** first run, zero failures/skips/cancellations (**9330.3312 ms** TAP duration). These checks did not change the shared API/catalog or deployed databases.

Coverage includes 11 quote cases, 12 durable-decision cases and 8 existing checkout-identity cases. Tests pause actual reservation/Order saves, exercise both race winners, lost acknowledgements at either write, completion without catalog/settings, owner/body conflicts, legacy replay, invalid/corrupt records, public/admin privacy, cancellation and observed MongoDB durability commands. Source is under `outako/backend-api/src/utils/{order-quote,checkout-decision}.js`, `src/models/checkout-attempt.js` and checkout HTTP tests.

The final backend rerun after naming the model `checkout-attempt.js` passed **155/155** again, with **10665.0963 ms** TAP duration and syntax validation passing in **6.04 seconds**. Frontend and integrated verification are recorded below; earlier checkpoints remain historical evidence.

## Frontend price review and recovery

The ordinary **تأكيد طلب الشراء** action validates delivery fields, reads the current quote and compares effective prices, quantities, shipping, product name/image and versioned configuration/fingerprint with the displayed cart. Native disclosures make the saved cart specifications available before submission. If they match, that same customer action submits the quoted request without an extra confirmation step. Cart line totals, subtotal and estimated total use integer piastres so unchanged fractional prices such as 0.10 × 3 do not trigger a false price-change review.

Changed specifications, design, prices or shipping open a named, focused review section before insertion. It shows changed specification values side by side, current/previous names and images when changed, effective prices, quantities and shipping. A current-product link opens the full gallery/viewer separately while retaining the review. Missing legacy cart fingerprints require explicit review even at the same price. Unknown shipping remains distinct from confirmed zero. **أوافق على التفاصيل وأؤكد الطلب** submits the reviewed fingerprint/version; **الرجوع لتعديل السلة** retains the cart and delivery fields and restores keyboard focus. The review remains visible with disabled controls while its POST is pending. Same-ID/quantity metadata changes, cart edits or delivery edits invalidate the review; late quotes cannot silently submit them.

The quote normalizer verifies protocol version, configuration bounds/completeness, fingerprint formats, EGP currency, requested identities/quantities and exact line/subtotal/shipping arithmetic, then whitelists public fields. Null/missing legacy Product specification text becomes explicit empty text only when deriving a configuration; stored Product facts are unchanged and numeric values are not coerced into measurements. It does not infer tax, delivery promises or manufacturing approval. Invalid quotes and network errors preserve the form and create no checkout attempt. Indexed unavailable/configuration errors attach to the submitted product IDs with explicit removal controls; valid delivery fields remain intact.

An uncertain submission keeps its exact body, quote fingerprint when present, and request key. Ordinary confirmation can only retry that saved request when current delivery/items still match; edited details require the explicit previous-request recovery action. Neither path fetches a new quote while the attempt is uncertain. A later generic 409/422 cannot downgrade that uncertainty, and late responses cannot clear a newer pending request.

Only HTTP 409 with a nonempty array of nonblank string `checkoutNotRecorded` messages, no conflicting identity/quote markers and no malformed error fields can persist `NOT_RECORDED`. The saved snapshot remains available across reload. The customer is told that the previous attempt was not recorded; the next explicit action fetches a fresh quote and always shows a new review, even if its amounts match the cart. Only the review confirmation creates a new key. A definite first validation rejection also uses a new key for corrected details; generic rejection after prior uncertainty remains locked. Legacy saved requests without quote metadata remain intact for exact recovery.

The implementation follows the existing standalone cart component, signals/computed values, typed API interfaces, external template/styles, companion copy/data and subscription cleanup. Fingerprints and keys are not rendered in customer copy. Core changes are in `order.model.ts`, `pending-order-state.enum.ts`, `order.service.ts`, `cart.service.ts` and `checkout-quote.{util,data}.ts`; the cart page owns presentation and explicit customer actions.

Successful new submissions clear the cart only if its captured facts and current customer/details still match. Exact uncertain recovery additionally checks the returned purchased configuration against the current cart; unavailable legacy snapshots cannot prove a match and therefore retain that cart. Receipt/account disclosures use stored Order specifications, never current Product lookups. Invalid/missing configuration is presented as unavailable. Protected admin detail separately displays validated manufacturing references and preserves them across status/payment/shipping responses that intentionally omit them.

## Version 2 verification — 04:03 build

The complete Angular suite passed **208/208 across 37 files** in **5.33 seconds**, build **04:02:13.192 UTC**. This includes 31 additional cases for configuration normalization/consent/recovery/display, quantity limits and admin evidence preservation. Earlier targeted builds stopped while cart fixtures and generated CSS were still being written; no tests executed in those attempts. A narrowed artifact-only core configuration then passed 27/27 before the final full-project pass, and the later null-spec regression is included in 208.

Backend syntax and all **169/169 tests** passed after the actual legacy-null regression, with **11044.0073 ms** TAP duration. Thirteen configuration cases cover both race winners, exact v1 approved recovery, same-price changes, private snapshots and invalid stored facts. The production build completed **04:03:02.471 UTC** in **10.031 seconds**, producing `main-R4RLZPZA.js` / `styles-IJQZ35G4.css` (**483.48 kB raw / 129.57 kB estimated initial transfer**).

All **35 scenarios on each device** were verified on this frozen build through scoped invocations, with one worker and zero retries. Desktop complete runs passed **34/35 in 2.5 minutes** and **34/35 in 2.7 minutes**. Shipping first needed its invoice selector narrowed to exclude the new nested specification disclosure; its final private-detail comparison then needed to assert unchanged public invoice facts and private manufacturing snapshots separately. Targeted desktop shipping passed **1/1 in 4.7 seconds** (case 3.6 seconds). Both failed reports remain under `artifacts/playwright-2026-09-17-configuration-{desktop,desktop-final}/report`, alongside `artifacts/playwright-2026-09-17-configuration-shipping-targeted/report`.

Mobile's complete run passed **34/35 in 2.7 minutes**. Its admin operations helper attempted to read a browser response body after waiting for rendered success; Chrome reported the body unavailable. The fixture now consumes JSON as the response arrives, retains it for assertions and removes its request listener in `finally`, without adding a request or retry. Targeted mobile administration passed **1/1 in 10.1 seconds** (case 9.2 seconds). Reports: `artifacts/playwright-2026-09-17-configuration-mobile/report` and `artifacts/playwright-2026-09-17-configuration-admin-mobile-targeted/report`. These fixture corrections changed no application, backend or build files. This is coverage of 70 device cases through scoped runs, not one clean 70/70 suite or two clean complete device runs.

The pricing scenario verifies stale-price review followed by a same-price specification/design review before creating one Order. It retains delivery fields, returns focus to the cart, sends version 2 and the reviewed fingerprint, and displays the stored public configuration without private fields. Existing legacy recovery, guest receipt, shipping and payment cases pass. Protected admin detail verifies the matching purchased configuration and private manufacturing snapshot, then preserves the snapshot after a status response omits it. Inspected desktop/mobile admin images show readable Arabic and explicit missing weight units; references wrap within their cards.

A separate two-device visual probe at **04:07:39.237–04:07:41.628 UTC** used one real local quote per device and no Order POST attempts or other writes. Exact cart/draft contents and keyboard return focus remained intact; browser errors were empty. The mobile review section is 925 CSS pixels tall and both actions are available by scrolling. Its section capture and the desktop actual viewport were inspected. The desktop section capture crops the lower action area because of the sticky container and does not prove its visual coverage. Artifacts: `artifacts/configuration-review-visual/2026-09-17T04-07-39.036Z/`. Performance is measured separately in [the audit](performance-audit.md).

## Historical frontend verification — 03:07 build

The first full Angular run built at **2026-09-17T02:51:58.902Z** and passed **176/177 tests across 30 files** in **5.06 seconds**. Its only failure was the new rendered-cart test's missing `ActivatedRoute` provider. Replacing the old minimal Router stub with `provideRouter([])` and a navigation spy corrected the fixture without changing application behavior or weakening assertions. The targeted cart suite then passed **19/19** in **1.80 seconds** (test build **02:52:58.410Z**). The final full `npm test -- --watch=false` rerun passed **177/177 across 30 files** in **5.10 seconds**, with test build **02:53:16.414Z**. Formatting and scoped whitespace checks passed.

New coverage comprises three quote-validation cases, six order-service recovery cases and eight cart cases. These cover exact discounted/fractional prices, malformed quote money/identity, unknown versus zero shipping, changed-price consent retained during a pending POST, unavailable rows, stale form responses, strict terminal markers, reload, fresh reviewed keys and late callback protection. A quoted request blocked before API delivery is recovered through a simulated durable rejection and a different fresh quote; backend tests establish the real decision/race behavior.

`e2e/checkout-pricing.spec.mjs` adds two scenarios: stale browser prices plus a synthetic unavailable saved item against the real quote API, and legacy-unquoted terminal recovery across reload followed by explicit new-price review and a new key. They preserve source catalog records and use only synthetic local checkout data.

The first full desktop run on the **02:58** build passed **31/35 in 2.5 minutes**. Three admin cases used their old port-4200 override while the development server was stopped. The new recovery case received the correct real terminal response but expected a different Arabic substring. The fixtures now respect `STORE_E2E_BASE_URL` after any explicit admin override and assert the actual status wording; request, storage, reload, quote and key checks remain intact. The original report remains at `artifacts/playwright-2026-09-17-checkout-desktop/report`.

Visual review also clarified two customer-facing labels: the cart identifies its saved item price separately from the current quoted price, and the recovery explanation covers both completion and confirmed rejection. These copy changes use the existing companion control and external template. The final production build completed at **2026-09-17T03:07:27.817Z** in **9.405 seconds**, producing **main-LACTZSO4.js** and **styles-TFH64YQR.css**, **481.21 kB raw / 128.78 kB estimated initial transfer**. Its four build files are pinned in `artifacts/performance/current-0307-build-identity.json`.

Both complete final browser invocations passed: **desktop 35/35 in 3.1 minutes** and **mobile 35/35 in 2.6 minutes**, giving **70/70 device cases from 35 unique scenarios**. Each used one worker, zero retries and a freshly restored disposable API, with no application change between devices. Quota preflights waited for the real limiter reset; production limits were unchanged. Reports: `artifacts/playwright-2026-09-17-checkout-desktop-final/report` and `artifacts/playwright-2026-09-17-checkout-mobile-final/report`. The earlier four fixture failures remain separate evidence, not silently replaced.

All four new pricing/recovery device cases passed against the real API. They verify unavailable-item row errors with retained address, explicit old/new-price review, no premature Order POST, exactly quoted totals, a durable legacy rejection surviving reload, a fresh reviewed key and continued rejection of the original key. Existing guest checkout, lost-response/authentication recovery, administration, manufacturing review, shipping, payment and SSR cases also passed.

The two actual viewport images `artifacts/browser/checkout-price-review-viewport-{desktop,mobile}.png` were visually inspected: Arabic labels and prices are readable, unknown shipping remains explicit, and confirmation/back controls do not overlap. Both actions fit the 390×844 mobile viewport. Full-page images are retained separately; the desktop full-page capture includes an offscreen fixed skip link after focus scrolling, while the actual viewport image does not. This inspection covers the price-review state, not a complete visual audit of every route.
