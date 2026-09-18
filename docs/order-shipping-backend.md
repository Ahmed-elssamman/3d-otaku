# Per-order shipping confirmation

`PATCH /api/admin/orders/:id/shipping` records an agreed EGP delivery fee for an existing order. Existing administrator authentication applies: anonymous requests receive 401 and customer accounts receive 403. Invalid order IDs receive 400 and missing orders receive 404. This action does not choose a shipping rate, charge a payment, contact a customer or advance fulfillment.

## Request

Required `Idempotency-Key`: a random identifier of 16–128 letters, digits or hyphens, retained with the exact request through an uncertain response. The key belongs to this order's shipping history, separately from the public checkout key.

```ts
interface ConfirmOrderShippingRequest {
  expectedShippingRevision: number;
  expectedStatus: OrderStatus;
  deliveryFee: number;
  customerAgreementConfirmed: boolean;
  note?: string;
}
```

`expectedShippingRevision` must be the current non-negative integer returned by the administrator API. `expectedStatus` uses the existing order enum. The fee must be an explicit finite number from 0 through 10,000,000 EGP with no fractional piastres; **zero is valid**. `customerAgreementConfirmed` must be literal `true`, representing the operator's attestation that the customer agreed to this fee. Optional `note` is private plain text up to 1000 characters, trimmed by the server. Other fields, including client totals, discounts, actor IDs or history, are rejected.

New confirmations are allowed only in `pending`, `processing` or `printed`. Later and cancelled orders reject new shipping changes. A customer agreement must be confirmed for each deliberate revision; the software does not infer it from a previous fee or contact attempt.

## Response and private history

Successful initial writes and accepted replays return HTTP 200 using the normal `{ success, message, data }` envelope. `data` is the complete current administrator order record. Administrator order detail, list, status and shipping responses add:

```ts
interface AdminOrderShippingFields {
  shippingRevision: number;
  canConfirmShipping: boolean;
  shippingHistory: AdminOrderShippingHistory[];
}

interface AdminOrderShippingHistory {
  revision: number;
  previousDeliveryFee: number;
  previousDeliveryFeeConfirmed: boolean;
  deliveryFee: number;
  previousTotal: number;
  total: number;
  customerAgreementConfirmed: boolean;
  createdAt: string;
  actorId: string;
  note: string;
}
```

New orders begin at revision 0 with an empty history. Legacy missing or explicitly null revision/history fields are exposed as 0/[] and initialized safely on confirmation. `canConfirmShipping` reflects an eligible status and EGP currency. Each write increments the revision once and appends a server-owned time, authenticated administrator ID, agreement attestation and previous/new amounts. Private stored entries also contain the request key and fingerprint; **neither is serialized, including to administrators**. Shipping history is separate from `statusHistory`.

Public order list, tracking and checkout replay shapes are unchanged. Authorized customers/guest receipt holders see the latest `deliveryFee`, `deliveryFeeConfirmed: true` and `total`, with no shipping revision/history, administrator identity or private note. The existing tracking token remains valid because the order ID and number do not change.

## Arithmetic and concurrency

The server computes `total = saved subtotal - saved discount + agreed fee` in integer piastres. Before mutation it also requires the existing invoice equation `saved total = saved subtotal - saved discount + saved delivery fee`. It never re-reads current catalog prices or changes invoice lines, customer details, subtotal, discount, currency, status or status history. Saved aggregate amounts may exceed the individual fee/price limit. Non-EGP invoices, fractional/unsafe saved money, an inconsistent existing total, negative subtotal-minus-discount and unsafe resulting totals are rejected rather than rounded or corrected silently.

The atomic write compares the expected shipping revision and status and guards the saved invoice amounts used in the calculation. It sets only the shipping fee/confirmation/total, advances the shipping revision and appends history. Missing or explicitly null legacy revision fields participate as revision 0; the guarded write sets the next revision instead of applying `$inc` to null. A stored null history is initialized only while the same atomic filter still matches null; missing or existing array histories use an append. A concurrent history restoration therefore causes a conflict rather than losing its entries. No bulk migration is needed. If another operator changes the fee or status first, the loser re-reads the order and either resolves an exact completed retry or returns a conflict.

The same key, normalized body and administrator replay successfully only while the applied shipping revision is still current. Later status progression may be returned without another write. If a newer fee revision superseded that request, its replay returns a conflict so the old draft is not presented as the current confirmation. Reusing a key with different details or another administrator is also a conflict. Preserve the pending key/request after uncertainty; an explicit reload/review is required before another deliberate change.

## Errors

Field validation uses HTTP 422 and `errors[field]: string[]`, including `body`, `idempotencyKey`, `expectedShippingRevision`, `expectedStatus`, `deliveryFee`, `customerAgreementConfirmed` or `note`.

HTTP 409 responses contain no order data and one structured error key:

| Key | Meaning |
| --- | --- |
| `shippingConflict` | Stale status/revision, a competing write, or a previously applied request superseded by a newer fee revision. Reload and review. |
| `shippingUnavailable` | A new confirmation was requested for a shipped, delivered or cancelled order. |
| `shippingRequest` | An existing shipping key was reused with different/malformed details or a different administrator. |
| `shippingInvoice` | The saved currency or monetary amounts cannot support a safe EGP recalculation. |

Existing-key lookup precedes detailed body validation, so a malformed retry of an already committed shipping request cannot be mistaken for a fresh validation rejection.

## Historical shipping verification — 17 September, 00:34 UTC

Latest backend source verification: the full suite passed **169/169** in **11044.0073 ms**, with syntax checks passing. Shipping now has **13 cases**. The added regression seeds an actual collection/fee history, introduces a one-piastre overstatement or understatement in the saved total, and verifies `shippingInvoice` 409 leaves the complete Order, shipping/payment histories and unavailable payment summary unchanged. Valid legacy and large-aggregate invoice cases still pass. This guard was activated with the [configuration snapshot slice](order-configuration-backend.md) in the shared local API at 04:01:15 UTC. Shipping browser scenarios passed on both devices after test-only selectors and public/private invoice comparison were aligned with the new disclosures; [scoped run details](order-configuration-backend.md#verification-scope) preserve the initial failed reports and avoid claiming clean complete device invocations.

Newest integrated verification is recorded in [implementation progress](implementation-progress.md) and [payment QA](order-payments-qa.md). The results below describe the original shipping activation checkpoint, not the latest backend suite total.

Twelve HTTP cases in `outako/backend-api/test/order-shipping.test.js` use disposable MongoDB and synthetic records. They cover authorization/defaults; piastre arithmetic and private audit history; zero fees at each eligible status; strict validation; terminal/stale rejection; concurrent administrators and identical requests; superseded replay; missing/null legacy revision and history combinations with concurrent retries; aggregate/unsafe money; a status change immediately before the shipping write; a concurrent restoration of null history without lost entries; and public receipt privacy with a stable tracking token. Explicit-null legacy fixtures use raw stored documents, matching imported or older data rather than bypassing validation in normal API requests.

- `node --test test/order-shipping.test.js`: **12/12 passed**.
- `npm test`: **101/101 passed**, with zero failures or skips.
- `npm run check`: passed.

The initial focused run exposed a synthetic fixture using lowercase letters in its order number; matching the established uppercase order-number format fixed that fixture. No tracking behavior was weakened. Automated tests used only disposable records.

Coordinated local activation was verified at **2026-09-17 00:34:33 UTC**. All sixteen protected products matched the pre-restart baseline except regenerated database metadata: twelve Arabic public products and four pending inactive drafts retained prices, specifications, media, review and provenance. All 44 image-source records and 70 distinct WebP files were checked, including decoded dimensions, format and stored size. Each draft remained public 404. Anonymous shipping access returned 401; an authenticated invalid-ID request reached the new route and returned 400 without writing an order. No checkout submissions were made, and order/custom/contact collections remained empty. Browser integration evidence is recorded separately.
