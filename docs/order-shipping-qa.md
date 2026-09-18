# Per-order shipping browser verification

The local browser scenario is `e2e/order-shipping.spec.mjs`. It uses the disposable
API on port 4000 and the local frontend on port 4200 or 4300. Login credentials
are read privately from the ignored runtime file. Traces and automatic screenshots
are disabled; the explicit screenshots contain only synthetic order information.
Nonlocal browser writes are blocked.

## Current follow-up verification — 17 September, 05:09 UTC build

The full Angular suite passed **239/239 tests across 39 files in 6.38 seconds**, first attempt (test bundle `2026-09-17T05:09:06.658Z`, 8.363 seconds); backend passed **178/178**. Production `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` completed at **`2026-09-17T05:09:50.721Z` in 10.283 seconds**, initial **483.50 kB raw / 129.61 kB estimated transfer**. Four exact build files are recorded in `artifacts/performance/current-0509-build-identity.json`.

Final cart/media, guest-checkout and extended lost-response checks passed **6/6 in 27.3 seconds** (three per device, one invocation, zero retries) on this build. Broader follow-up coverage is scoped: **11/12 desktop** on 04:49 plus corrected contact **2/2** on 04:57, and **12/12 mobile** on 04:57. The other **23 scenarios retain historical 04:03 coverage**. This is not a new 70-case or complete-device pass. [Public-page QA](public-pages-qa.md#current-follow-up-verification--17-september-0509-utc-build) retains every report, the before-fix tracking failure, corrected application behavior and exact coverage limits.

Shipping passed within the 04:49 desktop and 04:57 mobile follow-up runs (mobile shipping case 6.8 seconds). Its existing order now also receives a public cancellation note, followed by a read-only guest refresh that displays it and excludes the private shipping note. Invoice assertions still select the direct receipt `dl`; public invoice and original private manufacturing snapshot preservation remain separate. The final 05:09 six-case run does not replay the shipping scenario.

## Historical configuration checkpoint — 17 September, 04:03 UTC

At this historical checkpoint, source verification passed **208/208 Angular tests** and **169/169 backend tests**. Production was `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`, built at **`2026-09-17T04:03:02.471Z` in 10.031 seconds**, initial **483.48 kB raw / 129.57 kB estimated transfer**. All 35 unique scenarios were verified on both devices through scoped invocations, covering 70 project cases; no complete-device run passed cleanly in that checkpoint.

| Invocation | Result | Report |
| --- | --- | --- |
| First full desktop | 34/35 in 2.5 minutes | `artifacts/playwright-2026-09-17-configuration-desktop/report` |
| Second full desktop | 34/35 in 2.7 minutes | `artifacts/playwright-2026-09-17-configuration-desktop-final/report` |
| Targeted desktop shipping | 1/1 in 4.7 seconds; case 3.6 seconds | `artifacts/playwright-2026-09-17-configuration-shipping-targeted/report` |
| Full mobile | 34/35 in 2.7 minutes; shipping passed | `artifacts/playwright-2026-09-17-configuration-mobile/report` |
| Targeted mobile admin operations | 1/1 in 10.1 seconds; case 9.2 seconds | `artifacts/playwright-2026-09-17-configuration-admin-mobile-targeted/report` |

Both desktop failures were shipping-fixture mismatches exposed by new order configuration disclosures. The first broad `.receipt-card dl` selector matched configuration lists as well as the invoice; it now selects the direct invoice list. The second compared protected administrator items directly with public checkout items. The fixture now preserves exact public invoice assertions and separately compares the private manufacturing snapshot against the initial administrator detail. No invoice or privacy assertion was removed. Targeted desktop shipping then passed, and shipping also passed in the full mobile run.

The only mobile failure was unrelated to shipping: the existing admin `changeStatus` helper tried to read a CDP response body after DOM success during its second contact-status change. It now consumes/caches JSON immediately when `waitForResponse` resolves and removes its listener in `finally`. This added no request or business retry; the targeted admin case passed. All corrections were confined to test fixtures. Application source, backend and the 04:03 build stayed unchanged, and all original reports remain retained. [Public-page QA](public-pages-qa.md) records run conditions and visual limits. Final read-only preservation at **04:23:11.111 UTC** confirmed the original 16 products/settings and 44 image sources / 70 variants intact; no merchant shipping rate or real customer agreement follows from these synthetic fixtures.

The scenario creates one guest order from the current catalog without changing
its products or store settings. It exercises the administrator's shipping form
and the guest's existing receipt in separate browser contexts:

- Unknown shipping starts with a blank fee and a disabled confirmation action.
- Reviewing 49.75 EGP makes no request. Explicit confirmation saves the fee and
  recalculates the invoice while preserving product snapshots, customer details,
  subtotal, discount and status history.
- Another administrator session changes the fee after a draft has been reviewed.
  The stale save receives 409; the draft survives an explicit reload and requires
  a new agreement attestation and review before saving.
- A real zero-fee update commits, but its browser response is deliberately lost.
  Reloading the order recovers the saved result without another write or history
  event. Zero remains a confirmed fee.
- The guest refreshes the receipt using the original private tracking token.
  Both the fee and total update, private administrative history stays absent, and
  the client retains the token for the next refresh. Tokenless tracking returns 404.
- A cancelled order rejects another fee update. Synthetic fixture cleanup checks
  the exact customer marker before cancelling an unfinished order.

The scenario runs in both configured desktop and mobile projects with one worker
and no retries. It uses the shared health preflight and real API quotas; it does
not retry business writes. The values are test inputs, not commercial shipping
rates or proof of real customer agreement/payment.

## Historical verified results — 17 September, 00:36–00:45 UTC

Newest integrated verification is recorded in [implementation progress](implementation-progress.md) and [payment QA](order-payments-qa.md). The shipping-specific results below preserve the earlier builds, scoped rerun and report locations.

- Backend: **101/101 tests**, including **12 shipping HTTP cases**, passed with
  syntax checks. Coverage includes null/missing legacy shipping fields, competing
  updates, protected audit initialization and private receipt data.
- Angular: **127/127 tests across 25 files** passed in 5.38 seconds after the final
  fix; the focused shipping component passed **10/10**. Production build completed
  at `00:41:15.253Z`: `main-CRXD3LD4.js` / `styles-DWJFAQFT.css`.
- Desktop: all **30 scenarios passed together in 2.4 minutes** on the preceding
  `00:36` build, `main-H3VQSUTN.js`. Visual inspection then found an obsolete red
  agreement-validation message after a committed zero fee was recovered. Clearing
  the validation-attempt flag after successful reload fixed the message without
  changing the draft or agreement requirements. The affected desktop shipping
  scenario passed again on the final build: **1/1 in 6.2 seconds**, with an explicit
  assertion that no field error remains.
- Mobile: **30/30 scenarios passed together in 1.8 minutes** on the final build,
  using the configured 390×844 viewport at DPR 2. The new shipping scenario passed
  in 7.5 seconds. There were no failed browser attempts in this cycle.

This covers **60 project cases (30 unique scenarios × two devices) across scoped runs** and
61 successful executions. It is not one uninterrupted 60-case invocation, and the
other 29 desktop scenarios were not repeated after the validation-message fix.
All runs used one worker and zero retries. The original complete desktop report
is retained; no assertion or business API limit was weakened.

Reports:

- `artifacts/playwright-2026-09-17-shipping-desktop/report`
- `artifacts/playwright-2026-09-17-shipping-desktop-final/report`
- `artifacts/playwright-2026-09-17-shipping-mobile/report`

The two project runs of this shipping scenario verify exact invoice preservation,
four distinct shipping history revisions, a real committed-but-aborted response,
read-only recovery and current guest receipt amounts. The deliberate aborted
response is part of the test; it is not claimed as an error-free network session.
The browser's page-error list is empty, and neither admin nor receipt has horizontal
overflow. Reviewed final desktop/mobile screenshots show wrapped Arabic controls,
legible fee/total/history details and the corrected validation state. The initial
desktop image with the obsolete message is preserved under
`artifacts/browser/shipping-0036-desktop/`; final images use
`artifacts/browser/order-shipping-{admin,receipt}-{desktop,mobile}.png`.

The disposable API was refreshed between the complete desktop and mobile runs.
The final desktop shipping recheck and mobile suite used that same fresh API,
remaining below its shared submission quota. Health preflights waited for the
actual general API quota reset when necessary. Final read-only verification at
`00:45:43.190Z` found all original 16 products and 70 WebP variants unchanged, four
draft routes returning 404 and anonymous private-category access returning 401.

Run against a fresh, restored local API and a matching production preview:

```powershell
$env:STORE_E2E_BASE_URL='http://127.0.0.1:4300'
$env:ADMIN_QA_BASE_URL='http://127.0.0.1:4300'
$env:STORE_API_ORIGIN='http://127.0.0.1:4000'
npx playwright test e2e/order-shipping.spec.mjs --project=desktop --workers=1 --retries=0
npx playwright test e2e/order-shipping.spec.mjs --project=mobile --workers=1 --retries=0
```

Use separate report/output directories when preserving multiple runs. This
verification does not establish merchant-approved rates, actual customer
agreement, physical dispatch or payment collection.
