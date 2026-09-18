# Manual order payment ledger

This API records an administrator's attestation that money was already collected or refunded outside the application. It does not transfer money, verify a provider transaction, offer a payment method to shoppers, send a message or change fulfillment. Provider integration remains unconfigured.

The ledger is embedded in `Order` so appending an entry, comparing revisions and protecting the invoice/status are one atomic MongoDB write. Before an append, a separate durable write binds the request key to its original administrator and canonical action. Original entries and request bindings cannot be edited or deleted through these endpoints. Clerical corrections are separate append-only entries and never masquerade as actual refunds.

## Administrator endpoints

All routes require the existing administrator access token. Anonymous callers receive 401 and customer accounts receive 403. Invalid order/entry identifiers receive 400; absent orders or correction targets receive 404.

| Action | Endpoint |
| --- | --- |
| Read order and private ledger | `GET /api/admin/orders/:id` |
| Record completed collection/refund | `POST /api/admin/orders/:id/payments` |
| Correct an erroneous ledger entry | `POST /api/admin/orders/:id/payments/:entryId/correction` |
| Recover a particular attempt without writing | `GET /api/admin/orders/:id/payments/attempt` |

Both POSTs and the recovery GET require an `Idempotency-Key` header containing 16–128 letters, digits or hyphens. Generate a random key for each deliberate new action and retain the exact request while its result is uncertain. Keys are never placed in URLs or serialized into responses.

```ts
enum PaymentEntryKind {
  Collection = 'collection',
  Refund = 'refund',
  Correction = 'correction',
}

enum PaymentEntryMethod {
  Cash = 'cash',
  BankTransfer = 'bank_transfer',
  MobileWallet = 'mobile_wallet',
  Card = 'card',
  Other = 'other',
}

interface PaymentSnapshot {
  expectedPaymentRevision: number;
  expectedShippingRevision: number;
  expectedStatus: OrderStatus;
  expectedTotal: number;
  expectedDeliveryFeeConfirmed: boolean;
}

interface RecordPaymentRequest extends PaymentSnapshot {
  kind: PaymentEntryKind;
  amount: number;
  method: PaymentEntryMethod;
  transactionCompletedConfirmed: boolean;
  reference?: string;
  note?: string;
}

interface CorrectPaymentRequest extends PaymentSnapshot {
  reason: string;
  correctionConfirmed: boolean;
  noMoneyMovedConfirmed: boolean;
}
```

The ordinary recording endpoint accepts only `collection` or `refund`; `correction` is server-owned on the correction endpoint. `amount` is explicit positive EGP, at most 10,000,000 per entry and no fractional piastres. Aggregate recorded amounts and invoice totals may exceed that per-entry cap when they remain safely representable. References are trimmed text up to 200 characters; non-cash transactions require at least three characters. Cash references are optional. Notes are trimmed plain text up to 1000 characters. `transactionCompletedConfirmed` must be literal `true` and refers to a completed external movement, not a promised payment.

Corrections require `correctionConfirmed: true`, `noMoneyMovedConfirmed: true` and a trimmed reason of 3–1000 characters. The server copies the original entry's amount/method/reference for audit, saves the reason as the correction entry's note, and links the original ID. No replacement collection or refund is invented. To replace an erroneous entry, first explicitly correct it, then separately record the actual completed transaction with a new reviewed request.

Other body fields are rejected. The server owns IDs, revisions, timestamps, operator identity, ledger history and derived totals. Existing `paymentMethod: 'whatsapp'` is preserved as historical order data; it is not interpreted as the actual method used for the recorded movement.

## Responses and recovery

Both POSTs return the normal `{ success, message, data }` wrapper, with HTTP 201 for a new entry and 200 for an exact replay:

```ts
interface RecordPaymentResult {
  order: AdminOrder;
  entryId: string;
  replayed: boolean;
}

interface RecoverPaymentResult {
  order: AdminOrder;
  entryId: string | null;
  recorded: boolean;
}
```

The recovery GET returns HTTP 200 and `RecoverPaymentResult`. A matching key identifies the exact entry; matching amount, method, note or reference is not a substitute for that identity. A found attempt is recoverable only by its original administrator. Other administrators can read the authorized order history but cannot reuse or recover that administrator's request key.

The same key, canonical request, action/target and administrator replay before current invoice/status/revision validation. Because a ledger entry remains in history, replay may return the latest order after further collections, refunds, corrections, shipping changes or cancellation. The message acknowledges recording only; it does not announce that the order is currently settled. Changed or malformed committed requests return a structured 409 without order data. The same restriction applies to a key already bound by an uncommitted request, including changes to expected revisions, correction target, operation, amount or administrator.

A negative recovery read means no matching entry was visible at that instant. It does not prove an in-flight request cannot still commit. Retain the saved key/request and retry that exact POST when appropriate. Never mint a new key merely because a response was lost or a recovery read was negative.

An exact POST retry can now return HTTP 409 with only `errors.paymentNotRecorded: string[]` and no order data. This is terminal evidence for the saved application request: the key/body/action/target/administrator are durably bound, no matching ledger entry exists, and a durably observed payment or shipping revision has advanced beyond the request's expected revision. The append compares both revisions atomically, and supported writers never decrease them. A paused copy of that exact request therefore cannot commit later. The error says nothing about whether money moved outside the application.

After this explicit error, retain the rejected saved request until the administrator deliberately reloads the order and reviews a new action with fresh attestations. An ordinary `paymentConflict`, an equal or future revision, status/invoice-only mismatch, malformed saved state or a bare negative GET is not terminal evidence. Any future expected revision keeps the result nonterminal even if the other revision advanced. `paymentRequest` always takes precedence for changed bound requests and must never be interpreted as permission to replace the saved action.

## Private audit fields

Administrator order detail/list/status/shipping responses add `paymentRevision: number` and `paymentHistory: AdminPaymentEntry[]` alongside the public summary:

```ts
interface AdminPaymentEntry {
  id: string;
  revision: number;
  kind: PaymentEntryKind;
  amount: number;
  method: PaymentEntryMethod;
  reference: string;
  note: string;
  transactionCompletedConfirmed: boolean;
  correctionConfirmed: boolean;
  noMoneyMovedConfirmed: boolean;
  correctionOfEntryId: string | null;
  isCorrected: boolean;
  createdAt: string;
  actorId: string;
}
```

`createdAt` is the server time of recording, not an invented time of the external money movement. `isCorrected` is derived from correction links; the original stored entry is unchanged. Ordinary movements have completed-money attestation true and correction flags false. Correction entries have completed-money attestation false and both correction flags true. Their amount is audit context, not an additional collection or refund. Stored request keys and fingerprints are excluded even from administrative serialization.

The private `Order.paymentAttempts` array contains only immutable `{ requestKey, requestFingerprint, actorId, createdAt }` bindings. The fingerprint covers the normalized action/target, all expected snapshot fields, amounts, methods, references, notes and attestations. It is selected only by the privileged payment utility and excluded from every public/admin serializer, including recovery. Binding a request does not change the invoice, ledger, revisions, ownership, fulfillment history or public `updatedAt` timestamp.

Canonical valid requests bind before business-state checks, including a previously unseen stale retry. A later insufficient-funds, duplicate-reference or missing-target rejection can therefore leave a private binding without a financial entry. Invalid request bodies or malformed stored ledgers are rejected before creating a binding. Revised deliberate actions need new reviewed keys; existing bindings never expire, reset or silently disappear.

## Recorded totals and invoice protection

All sums use validated integer piastres. Effective totals exclude both corrected original movements and correction events. A refund cannot exceed currently recorded net funds. Correcting a collection is rejected if removing it would leave refunds greater than collections; if a refund entry was also erroneous, it must be explicitly corrected first. An actual refund must never be undone clerically merely to bypass this check. A correction cannot target another correction or an already corrected entry.

Nonblank references cannot duplicate an effective entry with the same order, kind, method and exact trimmed reference, including concurrent requests with different keys. The same reference may legitimately occur on another order, another kind or another method. Cash transactions without a reference can repeat, which makes exact attempt recovery essential. Once a mistaken original entry has been explicitly corrected, its reference can be used when separately recording the correct transaction.

New appends compare payment revision, shipping revision, status, total and shipping-confirmed state. The database filter also guards the saved currency, subtotal, discount and delivery fee used for validation and requires the exact private request binding. A concurrent loser re-reads and resolves an exact replay, emits terminal non-recording evidence when justified, or returns a nonterminal conflict. The append changes only payment revision/history and the record update timestamp. Items, customer, invoice amounts, shipping history/status, fulfillment history/status and tracking identity remain unchanged.

Both completed collections and refunds may be recorded in every existing order status, including cancelled orders, because external transactions may be logged late. This does not authorize a new charge or imply a cancellation/refund policy. The application does not automatically refund, cancel or alter an invoice when recording money.

## Public summary

Public create/replay, owner order lists and authorized guest tracking expose only this allowlisted addition:

```ts
enum PaymentSummaryState {
  NoRecords = 'no-records',
  ShippingUnconfirmed = 'shipping-unconfirmed',
  RecordedBalance = 'recorded-balance',
  SettlementReview = 'settlement-review',
  Unavailable = 'unavailable',
}

interface PaymentSummary {
  state: PaymentSummaryState;
  recordedCollected: number | null;
  recordedRefunded: number | null;
  recordedNet: number | null;
  balanceDue: number | null;
  credit: number | null;
  shippingConfirmed: boolean;
}
```

State precedence is:

1. Invalid/unsafe invoice or ledger: `unavailable`, with all five money fields null.
2. Cancelled order: `settlement-review`, recorded totals remain visible but due/credit are null. No additional charge or automatic full refund is inferred.
3. No effective movement entries: `no-records`, recorded totals are zero and due/credit null. This includes new/legacy empty ledgers and cases where every movement has been explicitly corrected. It is not proof that the customer has paid nothing elsewhere.
4. Effective records with unconfirmed shipping: `shipping-unconfirmed`, recorded totals are numeric and due/credit null. A partial deposit may be recorded, but the final invoice is still unknown.
5. Effective records with confirmed shipping on a noncancelled order: `recorded-balance`, where due is `max(current invoice total - recorded net, 0)` and credit is the inverse positive difference.

No state is called fully paid, settled or provider verified. Changing the shipping fee recomputes public due/credit from the current invoice and existing ledger; it never rewrites earlier collections. Public responses contain no ledger entries/revisions, methods, references, notes, operators or correction reasons. Existing tracking tokens remain valid.

## Errors and legacy handling

HTTP 422 uses `errors[field]: string[]` for `body`, `idempotencyKey`, snapshot fields, `kind`, `amount`, `method`, `transactionCompletedConfirmed`, `reference`, `note`, `reason`, `correctionConfirmed` or `noMoneyMovedConfirmed`.

HTTP 409 has no order data and one structured key:

| Key | Meaning |
| --- | --- |
| `paymentConflict` | Invoice, shipping, status or payment revision changed; recover/reload and review. |
| `paymentNotRecorded` | Exact bound request has no ledger entry and a durable revision advance prevents every late copy from committing; explicitly reload/review before a new action. |
| `paymentRequest` | Committed or reserved key used with another action, target, body or administrator; no terminal non-recording proof. |
| `paymentDuplicate` | The effective order ledger already contains this transaction kind/method/reference. |
| `paymentFunds` | A refund or correction would make recorded net funds negative. |
| `paymentCorrection` | Target is a correction or has already been corrected. |
| `paymentLedger` | Saved invoice/ledger is malformed, unsupported or unsafe for exact arithmetic. |

Missing/null legacy payment revision/history normalize to 0/[] without inventing historical transactions. Initializing such a history uses a null/missing predicate and sets revision 1 atomically. Concurrent restoration of a nonempty history cannot be overwritten. Inconsistent nonempty history/revision or invalid ledger evidence yields `unavailable` and blocks further appends; administrators must reconcile the stored data outside these actions. No migration or new unique index is needed for the embedded ledger.

Missing/null legacy `paymentAttempts` initialize with a guarded write that cannot overwrite a concurrently added binding. Existing committed entries from before reservations still replay first, using their original private key/fingerprint/operator, without creating replacement bindings. Before new appends or terminal proof, the privileged utility validates every private ledger key/fingerprint as a string with the expected format, rejects duplicate keys and rejects disagreement with a corresponding reservation. Public arithmetic validation remains independent because public projections intentionally omit these identities.

## Durability, rollout and operational boundary

`src/config/order-revision-policy.js` requires primary reads with `readConcern: majority` and writes with `writeConcern: { w: 'majority', j: true, wtimeout: 10000 }`. The policy applies to request reservation, payment append, shipping revision changes, order creation and order status writes. Admin order list/detail/dashboard snapshots, owner lists, guest tracking, checkout replay lookups, keyed recovery and the revision-bearing operations read Order data from the primary with majority concern. Other collections retain their existing policy. Responses are current durable snapshots, not a promise that no subsequent administrator action can change the order.

Supported storage must honor those concerns: a journaled WiredTiger standalone has local journal durability; a replica set requires a writable primary and an available majority. A write-concern timeout or connection failure is ambiguous and must retain the saved attempt. It must not be downgraded to a local write, secondary/cache read or terminal rejection. The single-node disposable replica-set tests verify the actual Mongo command concerns; they do not simulate multi-node failover or backup restoration.

**Rollout must drain all old writers and in-flight payment requests before enabling this version's terminal recovery contract.** Pre-reservation code cannot enforce immutable binding. Do not run mixed old/new payment or shipping writers. No supported API resets revisions, rewrites ledger entries or removes reservations. Direct database restoration, migration or administrative scripts that regress these fields invalidate the proof; such operations require taking writers offline and reconciling retained requests before reopening the service. No runtime or production migration is performed by this change.

Reservations are bounded in individual field size but accumulate per order, including valid rejected attempts. They share MongoDB's 16 MiB document limit with existing invoice/history data. No arbitrary business cap or garbage collection is introduced. Monitor order document size and preserve immutable identities when designing archival or larger-scale storage; deleting old bindings to reclaim space would reopen unsafe retries. The existing authenticated API rate limit still applies.

## Verification and activation status

Terminal recovery adds eleven passing cases in `test/order-payment-recovery.test.js`, using a disposable single-member WiredTiger replica set. They exercise four paused movement/correction versus payment/shipping revision races, immutable actor/body/action bindings, private serialization, stale first binding, committed legacy replay, missing/null initialization races, malformed private identities, negative-read/nonterminal boundaries and observed Mongo command durability for payment/shipping/status and receipt snapshots. The original payment tests retain their append-specific race barriers and now distinguish persisted bindings from financial writes.

Verification on 2026-09-17, from `outako/backend-api`:

```powershell
npm run check
npm test
```

Both commands passed on their first run: syntax checks completed in 5.767 seconds; the full suite passed **132/132**, zero failures/skips, in **7674.2678 ms** (8.241 seconds command wall time). This includes 11 recovery, 17 existing payment and 12 shipping cases, alongside the newly enrolled product-creation coverage. No extra focused pass was needed. These checks left the shared API/preview and catalog untouched.

Terminal recovery was then activated on the disposable local API and verified at **2026-09-17 02:03:42 UTC**. The pre-restart baseline and restored catalog matched for all sixteen original product records, excluding only regenerated top-level database metadata. Twelve Arabic products remained public; four pending review drafts remained inactive and returned public 404. All 44 image-source records and 70 WebP hashes/dimensions/sizes matched. Category aggregation remained seven options/16 non-deleted products, and anonymous private category access returned 401. Fresh order/custom/contact collections were empty; no checkout, payment or other business POST probes or credential logins were made. Private evidence: `.local/payment-recovery-activation-preservation-1789610622417.json`. Browser verification is tracked separately.

The final production build (`main-GN52CWI4.js`, `styles-2XRGXKQX.css`) passed **66/66 browser cases** on first runs: desktop 33/33 in 2.6 minutes and mobile 33/33 in 2.2 minutes, including all three payment scenarios on each device. See [payment browser QA](order-payments-qa.md). After the mobile suite, read-only verification at **2026-09-17 02:12:22.719 UTC** again confirmed the original 16 product records, 44 image sources, 70 WebP files, four private drafts and seven categories/16 non-deleted products. Anonymous private category access remained 401. No restart, login or business mutation was made during that final check; QA records were left intact. Private preservation report: `.local/post-mobile-recovery-preservation-1789611142719.json`.

Seventeen disposable-MongoDB HTTP cases in `test/order-payments.test.js` passed as part of the full backend suite. They cover administrator gates, piastre totals, deposits and cancelled-order handling, refund bounds, strict validation, simultaneous collections/refunds/replays/corrections, duplicate references, status/shipping races, append-only correction history, exact keyed recovery including an in-flight negative read, missing/null legacy fields, history-restoration races, malformed state and guest/owner privacy.

Historical verification before terminal recovery on 2026-09-17:

- `npm run check`: passed.
- `npm test`: **118/118 passed**, with zero failures/skips, in 7827.4043 ms. This includes the **17 payment cases** and **12 shipping cases**, which also exercise the extracted unchanged money parser.

Coordinated local activation was verified at **2026-09-17 01:07:50 UTC**. All sixteen original products matched the pre-restart baseline except regenerated database metadata: twelve Arabic public products and four pending inactive drafts retained their prices, specifications, review and provenance. All 44 image-source records and 70 distinct WebP hashes/dimensions/sizes were verified. The four drafts remained public 404; category counts remained seven options/16 non-deleted products. The payment recovery route returned anonymous 401 and authenticated invalid-ID 400 without writing an order or ledger entry. No checkout or other public submission was made; fresh order/custom/contact collections remained empty. Runtime credentials stayed private. Browser integration evidence is recorded separately; no external money movement or provider integration was performed.

The local runner still requires `node scripts/dev-local.js --snapshot-public-catalog`, followed by the existing guarded four-draft import and twelve-product Arabic localization. Payment fields affect orders only; there is no additional catalog restoration step. Existing ledger-free orders remain readable without migration. A future coordinated restart must preserve the existing 16-product/44-source/70-variant baseline as before.
