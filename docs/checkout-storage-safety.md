# Checkout recovery storage safety

The checkout service now requires a saved, readable idempotency key and exact request body before the first order POST. This follows the inquiry submission service’s persistence-before-send approach and also handles receipt persistence and pending-record cleanup failures.

## Submission and recovery

- A new attempt is written to `sessionStorage` and read back before HTTP begins. A quota or blocked-write failure sends no order POST and shows explicit Arabic guidance saying that the request was not sent.
- Blocked reads and nonempty malformed records block both quote and order submission. The existing record is neither removed nor overwritten. A valid in-memory request is retained if its stored copy becomes unreadable, disappears, or changes identity.
- Valid saved requests retain their original key and complete serialized payload, including legacy quote fields. Missing legacy state means uncertain; unsupported state values and invalid keys/bodies fail closed. Manual form edits and authentication changes cannot replace an uncertain request.
- An already durable attempt can be replayed even if additional storage writes are currently blocked. The stored key/body must still be readable and match the current attempt.
- Confirmed validation and terminal rejection states must also persist successfully before corrected details can proceed. If that update fails, the previous uncertain identity stays protected until storage can be checked again.
- Cancelling a subscription does not discard its recovery identity. A subsequent page reload can explicitly replay the saved request; there is no automatic order POST.

## Receipt and cleanup

A successful response remains visible even if saving its receipt or removing the pending record fails. The service retains the pending identity and prevents a new checkout. **إعادة فحص التخزين** retries receipt persistence and cleanup without sending an order request. Cleanup is permitted only when the saved pending identity still matches the confirmed attempt; it cannot remove another attempt’s record.

If tracking refreshes the same order before cleanup succeeds, cleanup persists those latest shipping, payment and status details. Both the order ID and order number must match the confirmed attempt; another tracked receipt cannot be substituted for it.

After a reload before cleanup completes, a surviving pending record is treated as uncertain and can replay its exact key/body to recover the same server receipt. If receipt storage remains blocked, the receipt is displayed again and the new-checkout lock remains. An old asynchronous response cannot clear a newer pending checkout.

The cart displays storage feedback at `#checkout-storage-feedback`, offers the explicit storage check and a contact link, and preserves editable cart/delivery data when submission is blocked. A confirmed receipt and its private-link control remain available during a cleanup failure. Storage feedback does not claim that an uncertain earlier request was rejected or never sent.

Session storage protects recovery within the current tab. Clearing site data, destroying the tab, or modifying stored records outside the app can remove that evidence; the interface therefore does not offer a reset or instruct customers to clear their pending data. A permanently corrupt record needs the store’s help to establish the outcome before another checkout.

## Files and verification

- `src/app/core/services/order.service.ts` and its spec: guarded persistence, reload checks and confirmed-response cleanup.
- `src/app/core/enums/order-storage-issue.enum.ts`, `core/constants/order.constants.ts`, and `core/models/order.model.ts`: typed storage states, request-key validation, messages and resolved-attempt contract.
- `src/app/features/cart/pages/cart-page/`: signal-driven feedback, external template, companion copy, explicit storage checking and rendering tests.

Added **14 initial cases** (11 service and 3 component) for blocked/quota writes, failed read-back, blocked/malformed reads, retained identity across edits and reload, failed rejection-state updates, cancellation, receipt/cleanup failures and the rendered recovery path. Existing exact-replay, session-conflict and late-response tests are preserved. Source review then identified and corrected a stale-receipt cleanup path, with **2 further service regressions** covering a refreshed same-order receipt and a different-order receipt: **16 new storage cases in total**.

The corrected storage checkpoint passed **276/276 tests across 42 files on the first attempt**, in **6.59 seconds**. Its test bundle completed at **2026-09-17 06:34:14.319 UTC** in **7.287 seconds**. The exact output is retained in `artifacts/checkout-storage-final-angular-tests.log`. This run includes both cleanup-refresh regressions and the wider tracking and money-format changes; the full-suite count is not a count of new storage tests.

The preceding checkpoint, before the cleanup-refresh correction, passed **274/274 tests across 42 files** in **6.31 seconds**. Its test bundle completed at **2026-09-17 06:23:47.903 UTC** in **7.651 seconds**; its historical log remains at `artifacts/checkout-storage-money-angular-tests.log`.

The final integrated full Angular suite passed **278/278 tests across 43 files in 5.70 seconds**; its test bundle completed at **2026-09-17 06:40:52.069 UTC** in **6.010 seconds**. Log: `artifacts/skip-link-corrected-angular-tests.log`. The preceding run had **277 passes / 1 failure** because the new skip-link unit used `SpyLocation`, which duplicated the base path and omitted the query. That test fixture was corrected to use real `Location` with `MockPlatformLocation` and `APP_BASE_HREF`; the failed log remains at `artifacts/skip-link-final-angular-tests.log`.

Final production **`main-XQERADW5.js` / `styles-LJHQOUSH.css`** completed at **2026-09-17 06:41:26.504 UTC** in **9.331 seconds**, initial **488.13 kB raw / 131.14 kB estimated transfer**. Identity: `artifacts/performance/current-0641-build-identity.json`. Backend verification passed **192 tests**.

Both storage scenarios passed on both devices: **4 distinct storage browser cases**. Desktop passed on the preceding 06:34 `main-A4UN3ZC3.js` build (1.9 and 1.7 seconds); mobile passed on final 06:41 (3.4 seconds each), with no intervening storage-source change. They used real quote/order responses, narrowly keyed storage denials, no automatic replay, and asserted preserved drafts, exact POST counts, no horizontal overflow and no page/console errors. The first scenario creates exactly one order per device and completes failed local cleanup without another POST; the second uses seeded pending-state fixtures and sends no quote/order POST. Four viewport screenshots per device retain the write-denied, cleanup, read-denied and corrupt-record states in each report's adjacent `results` directory.

The wider initial invocation retained **9 desktop passes, 1 real guest-tracking failure and 10 unrun cases in 32.6 seconds** at `artifacts/playwright-2026-09-17-storage-money-final/report`. The native skip link resolved against `<base href="/">` and left `/track` for the home page; this was an application defect. The corrected final build then passed **3/3 desktop cases in 8.7 seconds** at `artifacts/playwright-2026-09-17-skip-link-desktop/report` and **12/12 mobile cases in 39.5 seconds** at `artifacts/playwright-2026-09-17-storage-skip-mobile/report`. These establish **24 distinct device cases across scoped runs: 15 on final 06:41 and 9 on preceding 06:34**, not 24 on the final build or a complete 37-scenario suite. See [public-page QA](public-pages-qa.md#current-storage-and-skip-link-verification--17-september-0641-utc-build) for scope and retained logs. Performance remains separate evidence in [performance-audit.md](performance-audit.md).
