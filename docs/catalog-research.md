# Catalog sourcing, product truth and Egypt costing

Research date: 16 September 2026. This is a sourcing and manufacturing draft, not evidence that a product has been printed, tested, stocked or approved for sale. Source downloads are stored in `public/assets/catalog/`. No database products were published by this work.

## Existing catalog audit

- `scripts/download-models.js` saves Google's Astronaut as `shadow-katana.glb` and `otaku-desk-dragon.glb`, Neil Armstrong as `demon-edge-dagger.glb` and `shonen-hero-emblem.glb`, and a shoe as `cyber-samurai-mask.glb`. These files do not represent their product names. Do not display them as those products.
- `outako/backend-api/src/seed/makerworldProducts.js` contains nine third-party products and image URLs but no author, license, commercial-print permission, verification date or source revision. Downloadability does not establish permission to sell prints or reuse photographs.
- That seed gives a 45 g product a price of 24.99. At the owner's specified 2.50 EGP/g, material alone would cost 112.50 EGP. Its 12 g keychain is priced at 7.99 despite 30.00 EGP material alone. The source of all listed weights and print times remains unverified.
- `Best Seller`, ratings defaulting to 5.0, and similar social-proof values have no supporting sales/review evidence in those seed files.
- `seedMakerworld.js` sets `modelUrl` to the MakerWorld HTML page, not an STL/GLB model. `downloadModels.js` expects `makerworldId`, which the seed entries do not define; it can also overwrite multiple downloaded parts using the same slug and extension.
- The existing anime wallpaper assets have no recorded attribution or commercial-use permission. Product photography and generated geometry previews should describe the actual product; imagery of unrelated anime characters is not product evidence.

## Source-verified candidates

These candidates avoid copyrighted character merchandise. Their suitability for Egypt is a product hypothesis based on ordinary desk, home and gift uses; it is not a measured Egyptian trend ranking. Google Trends for Egypt returned HTTP 429 during this session. Printables returned an access challenge (HTTP 403). Neither was bypassed. No trend counts, sales figures or competitor prices are invented.

| Candidate | Commercial copyright basis and original source | Status / evidence |
| --- | --- | --- |
| Wavy desk bin / decorative container | [wireddown/openscad-models](https://github.com/wireddown/openscad-models/tree/da5e93de58652028f552e12e73840e45502361ce/wavy-bin), root [CC0 dedication](https://github.com/wireddown/openscad-models/blob/da5e93de58652028f552e12e73840e45502361ce/LICENSE) | Original STL and OpenSCAD downloaded. Source is a bin, not a watertight vase. Proposed 55% uniform display scale. Own geometry render. |
| Modular desk organizer starter kit | [vector76/gridfinity_openscad](https://github.com/vector76/gridfinity_openscad/tree/0e7308cd8fc7fb4191aa69d81175a90d10de751c), [MIT license](https://github.com/vector76/gridfinity_openscad/blob/0e7308cd8fc7fb4191aa69d81175a90d10de751c/LICENSE), copyright Jamie 2022 | Original ready-to-print STLs downloaded: 5×3 base, three divided trays, three open trays and three small cups. All dimensions measured from source geometry. Fit remains untested physically. |
| Modular chess gift set | Same pinned vector76 repository, [original chess source](https://github.com/vector76/gridfinity_openscad/blob/0e7308cd8fc7fb4191aa69d81175a90d10de751c/gridfinity_chess.scad), MIT | Six piece STLs plus tile downloaded. Preview contains 32 pieces and 64 separate tiles at uniform 75% scale. Knight includes an upstream sacrificial support; remove it after printing. |
| Resorte Triangle phone stand | [Javier Bórquez / Resorte](https://github.com/javierbyte/resorte/tree/04f9d4735a64b3ecdbe851eb4b4f72e3be3e8335), [BSD 3-Clause](https://github.com/javierbyte/resorte/blob/04f9d4735a64b3ecdbe851eb4b4f72e3be3e8335/LICENSE.txt) | STL generated using the exact pinned Triangle geometry function and default parameters. This is a vase-mode design. Source geometry is a slicer input: end faces in an STL preview are not a promise of the final vase-mode shell. Before publishing, render/photograph the finished print and verify stability with phone cases. |
| Workshop hammer holder | [thomo/3d-models](https://github.com/thomo/3d-models/tree/e31588bf53fd85189e77815b78ac99acd1209919), [CC BY 4.0](https://github.com/thomo/3d-models/blob/e31588bf53fd85189e77815b78ac99acd1209919/LICENSE.md) | Original `hammer_holder.stl` is directly available (17,884 bytes in repository tree); source README explicitly licenses the work CC BY 4.0. Secondary candidate only, not downloaded or offered. Load and mounting tests needed. Attribute author/source/license and disclose changes. |
| Developer gift: Ferris desk character | [RayMarch/ferris3d](https://github.com/RayMarch/ferris3d/tree/2a8ed2b5484b87e831c70f3346891fe1cab9aab4), [CC0](https://github.com/RayMarch/ferris3d/blob/2a8ed2b5484b87e831c70f3346891fe1cab9aab4/LICENSE) | README explicitly permits commercial use and credits original character to Karen Rustad Tölva, 3D interpretation to RayMarch. Blender asset only, not a validated printable STL. Secondary candidate: mesh preparation, printability and stability required before download/publication. |

## Rights and image handling

- Pinned raw GitHub URLs, downloaded bytes and SHA-256 digests are recorded in each product's `provenance.json`. Keep downloaded license notices with redistributed source/model files.
- The wavy-bin source imports BOSL. Its BSD 2-Clause notice is retained separately. The exact BOSL version used to create the upstream STL is not recorded upstream; do not claim that a particular dependency revision produced it.
- Resorte's original source and BSD notice are retained. The polygon-clipping 0.15.7 MIT notice is retained for the geometry generation dependency. No author endorsement is implied.
- New `preview.webp` files are renders of the sourced mesh geometry. They are digital previews, not photographs, test-print evidence, color proofs or evidence of available inventory. No third-party product photographs were copied into these drafts.
- An open design license does not guarantee mechanical fitness, safety, trademark rights or ownership of unrelated characters. These four main candidates use ordinary geometric forms; none is advertised as branded or officially endorsed.
- Customer-facing attribution can be concise, for example: `تصميم Jamie / vector76، بترخيص MIT. الطباعة والتشطيب بواسطة 3D Otaku. معاينة رقمية للتصميم.` Keep links to the source and notice accessible.

## Measured geometry versus manufacturing facts

STL files do not declare units. Millimetres are supported here by the source OpenSCAD dimensions / Resorte configuration. Bounds below are computed from triangle vertices, not guessed from product photos.

| Asset | Original bounds in mm | Draft transformation |
| --- | --- | --- |
| Wavy bin | 131.230 × 200.051 × 255.848 | Uniform 0.55 scale gives approximately 72.18 × 110.03 × 140.72 mm. Source STL retained unchanged. |
| Organizer base | 210 × 126 × 5 | None; 5×3 cells at 42 mm pitch. |
| Open organizer tray | 83.5 × 41.5 × 17.75 | None; two cells. |
| Five-compartment organizer tray | 83.5 × 41.5 × 24.75 | None; two cells. |
| Chess tile | 41.5 × 41.5 × 7.25 | Uniform 0.75 scale; assembled 8×8 arrangement has 251.625 mm outer span at 31.5 mm pitch. |
| Chess king | 41.5 × 41.5 × 56 | Uniform 0.75 scale gives 42 mm king height. |
| Resorte Triangle stand | Generated from pinned parameters | 60° angle, 60 mm extrusion width, 9 mm holder depth, 50 mm holder height, 100 mm base depth. Final computed bounds are in provenance. |

Mass cannot be inferred reliably from surface bounds or solid mesh volume. Shells, infill, supports, brim, purging, line width and printer profile change material use. Product mass, filament consumption, print duration, strength, usable internal dimensions, assembly fit and real preparation lead time therefore remain unverified. Draft JSON uses null for unmeasured numbers and keeps products inactive.

The organizer preview has 10 printed parts: one base, three divided trays, three open trays and three small cups. The chess preview has 96 printed parts: 64 tiles and 32 pieces. Price and product description must include that exact bill of materials. Magnets, screws, tools, plants and phones are not included in either model's geometry.

## Egypt costing formula

Required owner input: PLA/PLA+ filament cost is **2.50 EGP per consumed gram**, excluding shipping. This is the owner's assumption, not a researched commodity quote. If 2.50 EGP/g is already a retail printing charge, separate it from actual material cost before using this formula to avoid charging the same overhead twice.

Use consumed filament from the approved slicer profile, including support/brim/purge. For a kit, total all included parts and all required colors.

```text
print_cost = (consumed_grams × 2.50 + print_hours × machine_hour_cost)
expected_print_cost = print_cost / (1 - failed_print_rate)
cost_before_sales_fees = expected_print_cost
                      + finishing_minutes × labor_cost_per_minute
                      + packaging_cost
                      + hardware_cost
                      + allocated_order_overhead
                      + fixed_payment_fee
sale_price_ex_shipping = round_up_to_5_EGP(
  cost_before_sales_fees /
  (1 - target_gross_margin - variable_payment_fee_rate - return_reserve_rate)
)
```

`machine_hour_cost` should include electricity, wear, maintenance and printer depreciation. It excludes filament and labor already counted elsewhere. `failed_print_rate` is a measured production failure proportion; the division allows for replacement attempts. Avoid counting normal support waste both in `consumed_grams` and another waste multiplier. Return reserve covers commercial losses, not a quoted delivery charge. Keep shipping as a separate checkout line. Confirm VAT/tax treatment and payment-provider terms for the actual business before using a public final price.

Illustrative planning assumptions only: machine 6 EGP/hour; failure rate 8%; finishing labor 1 EGP/minute; overhead 5 EGP/order; payment fee 3%; return reserve 5%; target gross margin 30%; no additional hardware or fixed payment fee. These inputs are editable commercial decisions, not measurements or Egyptian market statistics.

| Hypothetical job (not any sourced product) | Packaging | Calculated rounded price, excluding shipping |
| --- | --- | --- |
| 30 g consumed, 1.5 hours, 10 finishing minutes | 15 EGP | 200 EGP |
| 60 g consumed, 3 hours, 12 finishing minutes | 15 EGP | 350 EGP |
| 120 g consumed, 6 hours, 15 finishing minutes | 20 EGP | 655 EGP |

These examples demonstrate the arithmetic only. Publishing one of these figures for a model without slicing it would invent its cost. Set a real sale price only after approving the model/scale/color variant, measuring consumption and including all kit parts. Recalculate on material, model or profile changes.

## Arabic content and publication requirements

`docs/catalog-drafts.json` contains Arabic titles, descriptions, uses, exact kit contents, care instructions and known limitations for the four acquired candidates. The incomplete manufacturing values are stored as missing data; they are not customer-facing promises.

Before any candidate becomes buyable:

1. Slice the exact intended variant on the production printer/profile. Record slicer version, profile, nozzle, layer height, wall count, infill, material/brand, support/brim/purge weight, consumed grams, print hours and file hash.
2. Produce a first sample, weigh it, measure it, check fit/stability and finish, and take own photographs. In particular, do not sell the vase-mode phone stand using the source STL's solid end-cap render as if it were a photograph of the final print.
3. Set real color availability and whether each item is made to order. Confirm daily capacity before setting preparation days. Validate PLA temperature/care advice against the actual filament manufacturer's specification; do not promise outdoor/car/high-temperature use.
4. Calculate EGP price from actual consumption and approved business inputs; exclude shipping. Publish a clear return/custom-order policy appropriate to the business.
5. Put author/license attribution and the digital-preview label beside renders; publish accurate package contents and photos. Keep inactive until the weight/time/cost/sample review is complete.
6. Use actual order and analytics evidence to decide which products deserve `الأكثر طلبًا`. Use supported review aggregates for ratings. Measure Egyptian demand through real Arabic search/ad tests and fulfilled orders rather than presenting a research shortlist as a popularity ranking.
