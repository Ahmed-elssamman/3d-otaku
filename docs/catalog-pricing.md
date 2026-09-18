# Egypt costing and inactive catalog import

The owner specifies **2.50 EGP per consumed gram of PLA or PLA+**. `outako/backend-api/src/utils/product-costing.js` applies that fixed rate as **250 piastres per gram**. It produces a planning quote from explicitly supplied inputs. It does not measure a model, approve a product, infer tax treatment or include shipping.

## Costing input

Run from `outako/backend-api`:

```powershell
npm run catalog:quote -- path/to/costing-input.json
```

Example input for an **imaginary job**, not a price or measurement for any catalog candidate:

```json
{
  "material": "PLA",
  "consumptionIncludesSupportAndWaste": true,
  "consumedFilamentGrams": 30,
  "printing": {
    "hours": 1.5,
    "machineCostPerHourEgp": 6,
    "electricityCostPerHourEgp": 0
  },
  "laborCostEgp": 10,
  "packagingCostEgp": 15,
  "hardwareCostEgp": 0,
  "overheadCostEgp": 5,
  "fixedPaymentFeeEgp": 0,
  "failureRatePercent": 8,
  "targetGrossMarginPercent": 30,
  "variablePaymentFeePercent": 3,
  "returnReservePercent": 5,
  "retailRounding": "five-egp"
}
```

- Consumption is the total for the complete sellable unit/kit, including supports, brim, purge and all colors. Use the approved slicer/printer profile and compare against production. Do not add the same support waste again as a failure allowance.
- Every fixed cost and percentage is required, including explicit zero when the operator has decided it does not apply. Missing, null, negative, nonnumeric, infinite and overly precise values are rejected. Unsupported materials are rejected instead of reusing the PLA price.
- Grams/hours support three decimal places; EGP amounts and percentage inputs support two. Money operations use integer piastres and BigInt intermediate arithmetic.
- The entire `printing` group is optional. If absent, the quote explicitly lists machine time and electricity as excluded. It is not a complete manufacturing cost assessment. If supplied, measured hours and both hourly amounts are required.
- Machine costs include the operator's chosen depreciation/maintenance allocation. `electricityCostPerHourEgp` is separate: if machine rate already includes electricity, enter explicit zero separately to avoid counting it twice. These are supplied business inputs, not claimed Egyptian utility prices.
- Labor and packaging are costs per complete successful sellable unit; include assembly/finishing time for every included kit part. Hardware, overhead and fixed payment fees are separately declared. Allocate order-level costs consistently when pricing units or bundles.
- Failure allowance covers expected repeat **printing** costs: `(material + machine + electricity) / (1 - failure rate)`. It does not automatically multiply finishing/packaging performed only after a successful print.
- Gross margin, percentage payment fees and return reserve share the sales-price denominator. Their sum must be below 100%. Gross margin is not the same as markup on cost.
- Each fractional cost is rounded up to the next piastre. The candidate retail price is rounded up to a piastre or a multiple of five EGP, then checked again against actual rounded fee amounts to ensure the requested margin is met.

For the hypothetical input above, the breakdown is:

| Item | EGP |
| --- | ---: |
| Consumed material | 75.00 |
| Machine time | 9.00 |
| Separately entered electricity | 0.00 |
| Failed-print allowance | 7.31 |
| Finishing labor | 10.00 |
| Packaging | 15.00 |
| Hardware | 0.00 |
| Allocated overhead | 5.00 |
| Fixed payment fee | 0.00 |
| Cost before variable sales fees | 121.31 |
| Payment percentage at rounded selling price | 6.00 |
| Return reserve at rounded selling price | 10.00 |
| Expected profit before excluded taxes/shipping | 62.69 |
| Candidate price excluding shipping | **200.00** |

The response includes `breakdownPiastres`, `retailPriceEgp`, achieved/target margin in basis points, exclusions and explicit `shippingIncluded: false`, `taxesCalculated: false`, `manufacturingApprovalGranted: false`. Zero tax has **not** been assumed; tax treatment remains outside this calculator. Configure and disclose the actual business treatment before publishing a final customer price.

## Importing the sourced drafts

`npm run catalog:import` performs a dry run without a database connection. It reads the four records in `docs/catalog-drafts.json`, verifies their asset hashes against local provenance, and displays the proposed inactive insertions.

To apply to an explicitly chosen local development database, use:

```powershell
$env:NODE_ENV = 'development'
$env:CATALOG_IMPORT_MONGODB_URI = 'mongodb://127.0.0.1:27017/3dotaku-local'
npm run catalog:import -- --apply
```

This importer:

- Rejects production mode, non-loopback hosts, credentials/query options, and database names that do not end in `local`, `dev` or `test`. It never falls back to `MONGODB_URI` or the deployed database.
- Inserts missing slugs only. Repeated imports skip existing records, preserving any manual edits/reviews and avoiding accidental replacement of published products.
- Preserves all Arabic descriptions, package contents, uses, care instructions, limitations, attribution and digital-preview labels. Full original draft/provenance JSON and a manifest SHA-256 are retained internally; generated asset hashes are checked before insertion.
- Sets `isActive: false`, `isFeatured: false` and `requiresManufacturingReview: true`. Because the legacy schema requires a numeric price, the internal record uses **0 only as an inactive placeholder**, while preserved source data still says `price: null`. This is never a free-product offer.
- Keeps consumption, finished weight and print hours as null. Proposed material choices and geometry bounds remain source metadata; they are not converted into manufactured facts.
- Uses the accurate Arabic draft categories. Any future public category filters must support those values instead of silently remapping them to an unrelated category.

For products requiring manufacturing review, the application model rejects activation until positive consumed grams, finished weight and print hours, evidence references, explicit sample/rights/pricing approvals and a current server-quoted price review are recorded. New administrator API creations and all product copies now enter this workflow automatically as inactive drafts; explicit active creation is rejected with an `isActive` field error. Supplied review flags or approvals cannot bypass the ordinary write allowlist. Existing catalog products, prices and publication/review flags are not migrated or changed. An unenrolled legacy product's published state is not manufacturing or profitability approval.

The administrator-only workflow is documented in `docs/manufacturing-review-api.md`: it saves incomplete inputs, calculates full printing costs and approves a revision-bound quote with server-recorded reviewer identity/time. Effective selling price, including discounts, must meet the quote target. Approval does not publish a product or change its price. The displayed expected profit belongs to the calculated target price, not the current catalog price. No public approval endpoint exists. The automatic new/copy enrollment change passed the unit/backend and complete device-browser verification below.

The initial importer and activation guard were exercised on a disposable test MongoDB without restarting or changing the shared browser-test database during that implementation. A local API must run the corresponding backend before restoring these drafts; never import them into an older API that does not enforce their activation guard.

## Verification

On **17 September 2026**, the complete backend suite passed **132/132** and syntax checks on the first run, including the three new creation/copy regressions and the adjusted image-API fixture. The complete Angular suite passed **160/160 across 29 files** on the first run in **5.19 seconds**, with test bundle `2026-09-17T02:00:48.628Z`. Production build passed in **10.083 seconds** at `2026-09-17T02:01:33.744Z`: `main-GN52CWI4.js` / `styles-2XRGXKQX.css`, initial **479.73 kB raw / 128.00 kB estimated transfer**. These software checks do not approve any real product measurement, cost or selling price.

Browser verification passed **33/33 desktop scenarios in 2.6 minutes** and **33/33 mobile scenarios in 2.2 minutes**, both on the first run of the same `main-GN52CWI4.js` / `styles-2XRGXKQX.css` build. Together these are **66 passed project cases (33 unique scenarios × two devices)** across two complete invocations, with one worker, zero retries and a fresh restored API for each device. There was no application edit between the runs. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. Automatic enrollment of a legacy product copy and new-product CRUD passed on both devices; only disposable QA copies were changed, with no real catalog mutations.

`npm test` includes calculator arithmetic, rounding/margin boundaries, invalid inputs, database-target validation, actual CLI insertion/idempotence and HTTP activation rejection. Import tests run against their own temporary MongoDB and do not publish products or charge customers.
