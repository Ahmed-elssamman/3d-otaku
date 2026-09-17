# Existing catalog price audit

**Read-only local snapshot: 2026-09-16T21:29:19.972Z.** All twelve public products were checked. No price, discount, activation state, specification or database record was changed.

The owner's rate is **2.50 EGP per consumed gram of PLA or PLA+**, excluding shipping. One record has both an applicable material and an explicit gram unit: the display sword. Its nominal material amount is **2125 EGP**, compared with a current price of **89 EGP**. This is a **conditional inconsistency requiring verification**, not a measured loss or an approved replacement price. Ten PLA+ records have unitless weight text; the remaining explicitly unit-labelled weight belongs to a Resin product, outside this rate.

## Evidence and interpretation

- Prices/material/weight came from the read-only local endpoint `http://127.0.0.1:4000/api/products?limit=100`. The exact response is saved at ignored `artifacts/catalog-localization/price-audit-snapshot.json`, SHA-256 `afa75c05e9b22971144618b63e5d2e9ec1d4c44396dfbc0b4b8a37a780d86afe`.
- [`catalog-localization.json`](catalog-localization.json) retains original copy/specifications and source URLs/hashes. [`catalog-content-audit.md`](catalog-content-audit.md) records image review, missing model/image rights and manufacturing gaps. The original source records provide no slicer report or verified consumed-filament measurement.
- “Current EGP” below is the actual displayed selling price: a numeric discount of at least zero and below `price`, otherwise `price`. This matches [`getSalePrice`](../src/app/core/utils/product-display.util.ts). The separate regular-price column preserves the comparison with the stored list price. Shipping is excluded from both the audit calculation and the requested product quote.
- The product specification label is **الوزن**, not “grams”; its value is displayed as a string by [`product-details.control.ts`](../src/app/features/product-details/product-details.control.ts) and the details component. A bare `68`, for example, does **not** establish 68 grams.
- A gram suffix makes a string parseable; it does not verify a scale measurement, material identity, whether weight covers one complete unit, whether hardware is included, or whether the value describes finished weight versus filament consumed. The conditional column is `explicit grams × 2.50` only for a displayed PLA/PLA+ material. It is a material-only benchmark **if those grams actually represent that much PLA**, before printing losses or other costs. No bare number was silently converted to grams.

## All twelve public products

All money columns are EGP. A dash is an unresolved calculation, not a zero cost or a profitability finding.

| Arabic name | Stable slug | Current EGP | Regular EGP | Displayed material / weight | Conditional PLA material-only floor | Product-specific unknowns |
| --- | --- | ---: | ---: | --- | ---: | --- |
| حامل موبايل بشكل مينيون | `minion-phone-stand` | 300.00 | 300.00 | `PLA+` / `68` | — | Weight unit, actual sample and complete consumed filament unknown; size is `0`. |
| حامل موبايل وتابلت بشكل فارس | `templar-knight-phone-and-tablet-holder` | 250.00 | 300.00 | `PLA+` / `45` | — | Weight unit unknown; no model URL, measured sample or consumed-filament report. |
| حامل موبايل صغير بخطوط بارزة | `compact-phone-stand` | 100.00 | 100.00 | `PLA+` / `15` | — | Weight unit and consumption unknown; size is `0`. |
| مجسم ساموراي بحامل أعواد للديكور | `samurai-sword-incense-holder` | 850.00 | 1000.00 | `PLA+` / `140` | — | Weight unit, complete parts and consumption unknown. Decorative/unlit use only; hot-incense construction is unverified. |
| سبينر بتصميم كوناي | `kunai-fidget-spinner-2` | 200.00 | 250.00 | `PLA+` / `20` | — | Weight unit, moving-part assembly, hardware and consumption unknown. |
| ميدالية مفاتيح راقصة باليه | `ballerina-keychain` | 40.00 | 70.00 | `PLA+` / `6` | — | Weight unit, ring/chain inclusion and consumption unknown; stored print time `0.2` has no unit. |
| ميدالية مفاتيح لاعبة جمباز | `gymnast-keychain` | 50.00 | 70.00 | `PLA+` / `5` | — | Weight unit, ring/chain inclusion and consumption unknown; size `20` also has no unit. |
| ميدالية مفاتيح هلال ونجمة | `moon-star-keychain` | 40.00 | 70.00 | `PLA+` / `5` | — | Weight unit and hardware unknown; original “soft filament” description conflicts with PLA+. |
| لوحة اسمين بتأثير بصري | `dual-name-customize` | 450.00 | 450.00 | `PLA+` / `45` | — | Weight unit and consumption unknown; names, dimensions, script and selected design can affect the complete job. |
| حامل قلم بشكل نينجا | `ninja-pen-holder` | 500.00 | 500.00 | `PLA+` / `70` | — | Weight unit and consumption unknown; size `70` also has no unit. |
| مجسم تنين صغير | `tiny-dragon-statue` | 24.50 | 24.50 | `Resin` / `120g` | Not applicable | Explicit 120 g is unverified, with no photo/model. Resin needs its own approved costing basis; the PLA calculator rejects it. |
| سيف بطل اللهب للعرض | `sword-of-the-flame-hero` | **89.00** | **89.00** | `PLA` / `850g` | **2125.00, conditional** | Explicit 850 g is unverified, with no photo/model; complete construction, actual PLA content, finished weight and total consumption unknown. |

## Flag requiring priority review

For `sword-of-the-flame-hero`, **850 × 2.50 = 2125 EGP**. That exceeds its current and regular price of 89 EGP by **2036 EGP**, before labor, machine time, electricity, failed prints, finishing, hardware, packaging, overhead, payment costs, reserves or profit. Conversely, 89 EGP funds only **35.6 consumed grams** at the owner's rate if every piastre goes to material and every other cost is excluded. Neither calculation establishes the actual weight or an acceptable selling price.

First verify whether `850g` is correct, which parts it covers, and whether it is PLA mass or total assembled weight. Then obtain a complete production consumption report. Do not replace the price with 2125 EGP: that number omits all other costs and profit. The ten unitless PLA+ entries cannot yet be classified as above or below material cost. Their absence from this flag is not evidence that their current discounts or regular prices are profitable.

No PLA calculation was applied to the Resin dragon. A material correction would require evidence of the actual sample; a resin quote would require an independently approved resin process/rate rather than reusing 2.50 EGP/g.

## Exact inputs needed for a defensible selling price

The implemented calculator and its contract are in [`product-costing.js`](../outako/backend-api/src/utils/product-costing.js), [`pricing-policy.js`](../outako/backend-api/src/config/pricing-policy.js) and [`catalog-pricing.md`](catalog-pricing.md). For each complete sellable unit or kit, gather:

| Calculator input | Required evidence or explicit business decision |
| --- | --- |
| `material` | Confirm the actual material is `PLA` or `PLA+`; other materials are unsupported by this rate. |
| `consumedFilamentGrams` | Positive measured/slicer-verified consumption for every included printed part and color, including supports, brim and purge. Keep the approved profile and sample reference. Do not substitute an unverified product-weight string. |
| `consumptionIncludesSupportAndWaste` | Must explicitly be `true` after the complete consumption amount is established. This is not a default assumption. |
| `printing.hours` | Measured or validated hours for the complete job. Existing free-text `printTime` values are not verified inputs or fulfillment promises. |
| `printing.machineCostPerHourEgp` | Operator-approved depreciation/maintenance allocation per printing hour. |
| `printing.electricityCostPerHourEgp` | Explicit electricity allocation per hour; use an intentional zero only when accounted for elsewhere, avoiding double counting. No tariff is inferred. |
| `laborCostEgp` | Per-successful-unit preparation, assembly and finishing allocation. |
| `packagingCostEgp` | Actual packaging allocation for the unit/kit. It is separate from shipping. |
| `hardwareCostEgp` | Cost of confirmed included rings, chains, bearings, fasteners or other nonprinted parts; do not assume pictured accessories are included. |
| `overheadCostEgp` | Explicit per-unit overhead allocation. |
| `fixedPaymentFeeEgp` | Explicit fixed payment/collection cost allocated consistently across units or orders. |
| `failureRatePercent` | Supported process failure allowance. The engine applies it to material, machine and electricity repeat costs, not automatically to successful-unit finishing/packaging. |
| `targetGrossMarginPercent` | Owner-selected gross margin on selling price, not markup on cost. No margin was guessed in this audit. |
| `variablePaymentFeePercent` | Actual percentage payment/collection cost on selling price. |
| `returnReservePercent` | Explicit owner-approved return/reserve percentage on selling price. |
| `retailRounding` | Optional `piastre` default or explicit `five-egp`; rounding is upward, followed by another margin check. |

All five fixed costs and four percentage inputs are mandatory, including an intentional zero where applicable. Grams/hours allow three decimal places; amounts and percentages allow two. The `printing` group is technically optional in the engine, but omitting it explicitly excludes machine time and electricity, so the result is incomplete for a full manufacturing profitability decision. Margin plus percentage payment fee plus return reserve must total less than 100%.

With `G` as verified consumed grams, `H` as measured hours, rates expressed as fractions, and all amounts in EGP, the engine's calculation before currency rounding is:

```text
material = 2.50 × G
print_cost = material + H × machine_rate + H × electricity_rate
expected_print_cost = print_cost / (1 − failure_rate)
cost = expected_print_cost + labor + packaging + hardware + overhead + fixed_payment_fee
candidate_price = cost / (1 − target_margin − variable_payment_fee − return_reserve)
```

The implementation rounds fractional costs upward to piastres, uses integer money arithmetic, rounds retail upward, then checks the target margin against rounded fees. **Shipping stays excluded. Taxes are not calculated or silently assumed to be zero.** A final customer price still needs the actual business tax treatment and approval of the sample, rights and commercial terms.

No quote input was fabricated and no product was run through the calculator with placeholder labor, hours, fees or margin. The table is a gap audit, not twelve approved quotes.

## Verification performed

A read-only Node calculation applied the same valid-discount rule as the storefront, required an explicit `g` suffix for this snapshot's gram parsing, and restricted material arithmetic to PLA/PLA+. It confirmed **12 records, 10 unitless weights, one Resin exclusion, and one applicable conditional calculation**: 2125 EGP for the sword, with a 2036 EGP shortfall against 89 EGP. Arithmetic/results are retained in ignored `artifacts/catalog-localization/price-audit-calculation.json`.

No browser, full test suite, pricing engine mutation, local database write or remote write was used for this audit.
