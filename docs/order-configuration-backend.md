# Purchased configuration and manufacturing snapshot

Backend source verification, 2026-09-17: `npm run check` passed in 6.16 seconds and `npm test` passed **169/169**, zero failures/skips/cancellations, in **11044.0073 ms**. This includes thirteen new configuration HTTP cases and the shipping invoice-consistency regression. All 35 browser scenarios on each device are covered through the scoped invocations below on the frozen 04:03 production build. [Implementation progress](implementation-progress.md) owns coordinated integration evidence.

## Public quote and receipt contract

`POST /api/orders/quote` still accepts only `{ items: [{ productId, quantity }] }` and returns the normal success envelope without writing business records. Its data now includes `quoteVersion: 2`. Each line retains its ID, slug, name, image, quantities and EGP amounts and adds:

```json
{
  "configurationFingerprint": "64 lowercase hexadecimal characters",
  "configuration": {
    "version": 1,
    "material": "PLA+",
    "finish": "",
    "color": "",
    "size": "",
    "weight": "",
    "printTime": "",
    "layerHeight": "",
    "infill": "",
    "isMadeToOrder": false,
    "productionTimeMin": null,
    "productionTimeMax": null,
    "productionTimeUnit": null,
    "safetyNote": ""
  }
}
```

This example illustrates the shape, not measurements for a real product. The eight non-null specification strings are copied exactly from the saved Product and each allows at most 500 characters. Legacy null/missing specification text becomes the explicit absent value `""` in the configuration only; original Product records/public fields remain unchanged. Numbers and other non-string values are never coerced. `safetyNote` allows 5000. No units are inferred from strings. Production minimum/maximum are null or finite numbers from 1 through `Number.MAX_SAFE_INTEGER`; the unit is null, `hours` or `business-days`. A made-to-order product requires all three fields and maximum at least minimum. Invalid saved facts produce indexed `errors["items[i].configuration"]` HTTP 422 rather than invented replacements.

Public Product responses add `configurationFingerprint`, a lowercase SHA-256 string or null when the configuration cannot be safely represented. Its identity includes the versioned configuration, product ID/name/image, gallery, model URL/type and source manifest hash. Names are bounded to 500 characters, URLs to 2000 and galleries to 30 entries. Ordinary description/SEO text and private costing/review notes do not participate. The hash is opaque: quote and public Order responses do not expose model URLs, source references or review evidence through this field.

The version 2 quote fingerprint binds the version, every configuration/fingerprint, quantities and existing money/shipping-confirmation fields. New creation requests require both `expectedQuoteVersion: 2` and `expectedQuoteFingerprint`. Changing specifications, promised production range, design/media/model reference or manifest hash at the same price requires fresh explicit consent. Server snapshots always come from the same Product read that generated the accepted quote.

New Order lines preserve their configuration/fingerprint through later Product edits, removal, shipping/payment changes and status progression. Legacy lines serialize both fields as null; the server never fills missing historical facts from the current catalog.

## Protected fulfillment detail

Only `GET /api/admin/orders/:id` adds `items[].manufacturingSnapshot`. It is null for legacy lines. Administrator list, status, shipping and payment responses omit it, as do all public creation/replay, account and tracking responses. The schema field is excluded from ordinary database selection and private detail explicitly selects it; serializers separately whitelist its fields.

The version 1 private snapshot contains these exact fields:

| Fields | Shape |
| --- | --- |
| `version` | `1` |
| `modelUrl`, `modelType` | URL string/null; `GLB`, `GLTF`, `GLTF_EMBEDDED`, `STL`, `OBJ`, `PLY` or null |
| `gallery` | Array of at most 30 URL strings |
| `source` | Null or `{ manifestPath, manifestSha256, provenanceUrl, attribution, previewLabel }`, all strings |
| `requiresManufacturingReview` | Boolean saved on the Product |
| `reviewRevision`, `reviewStatus` | Safe nonnegative integer/null; `pending`, `approved` or null |
| `approvedFingerprint`, `approvedAt`, `approvedBy` | Lowercase SHA-256/null; canonical ISO timestamp/null; administrator ObjectId string/null |
| `consumedFilamentGrams`, `verifiedWeightGrams`, `verifiedPrintHours` | Actual stored measured number/null |
| `measurementReference`, `sampleReference`, `rightsReference` | Stored reference string/null |

References and manifest paths allow 1000 characters, attribution 2000 and URLs 2000. The source hash is empty or a lowercase SHA-256. Measurements use the manufacturing workflow's bounds: at least 0.001, at most 100000 grams or 10000 hours. Approved records require their fingerprint, time and administrator. The snapshot excludes costing, raw source JSON and review history; references preserve the evidence location. It does not archive external file bytes, fetch private links or prove that mutable remote URLs still serve the original content.

## Durable recovery and rollout

New `CheckoutAttempt` decisions use `protocolVersion: 2` and store the requested quote version. Canonical request hashing includes `expectedQuoteVersion` only when supplied; historical missing-version hashes remain unchanged. Committed receipts replay before any current quote/version requirement.

The explicit version 1 decoder preserves approved historical JSON and its original checksum, prices, identity and absent configuration fields. Optional new Order subdocuments have no parent defaults, so version 1 JSON roundtrips do not invent fields. An exact approved version 1 retry can finish its original reserved Order even after its Product/settings disappear. Historical rejected decisions remain immutable and terminal.

An undecided missing/old numeric quote version receives a durable rejected decision (`quote-version`, or `missing-quote` if no fingerprint). An exact matching rejection returns only HTTP 409 `errors.checkoutNotRecorded: string[]`; it permits fresh review and a new key. Altered bound bodies/versions return `checkoutDetails`; altered owners return `checkoutSession`. Malformed first version values return 422. Generic 409/422/503 never proves absence for an uncertain request. Corrupt decision versions, configuration shapes, inner fingerprints or private snapshots fail closed with 503 `checkoutAttempt`, without inserting an Order.

All approved/rejected candidates still arbitrate through the same immutable private attempt record, primary-majority reads and majority journaled writes. The winner controls delayed requests: approved decisions recover the same invoice/configuration/identity; rejected decisions prohibit a late approved candidate. Drain old writers before enabling the new consent contract. Never expire/reset decisions or remove an Order to cancel it; cancellation retains both the Order and binding. No real catalog migration or mutation is required.

## Verification scope

The thirteen configuration cases use real HTTP and disposable replica-set MongoDB. They cover exact raw strings and privacy, legacy null specification absence without Product mutation, nineteen same-price specification/design changes, ordinary copy changes, missing/invalid/bound versions, hydrated creation/tracking/list/detail serialization, post-purchase Product edits/deletion, protected manufacturing evidence, exact version 1 approved and rejected recovery, both decision race winners, delayed version 2 materialization, recomputed-checksum corruption, and out-of-contract saved facts. Existing pricing, identity, shipping, payment and manufacturing suites passed in the same full run.

Local activation verification at **2026-09-17T04:01:15.849Z** preserved all sixteen original products, twelve Arabic public records/four pending inactive drafts, 44 image-source records and 70 WebP SHA/dimension/size checks. Full settings matched the newly captured pre-restart baseline. All twelve public products had valid configuration fingerprints; four draft lookups returned 404, anonymous administrator categories returned 401 and non-deleted category counts were seven/16. Orders, custom requests, contacts and checkout decisions were empty before browser QA. No login or POST probe was made. Private evidence report: `.local/configuration-activation-preservation-1789617675849.json`.

Coordinated frontend verification: root reports **208/208 Angular tests across 37 files**, 5.33 seconds, with test compilation completed at **2026-09-17T04:02:13.192Z**. This includes six administrator snapshot tests covering private field whitelisting, unloaded versus unavailable/missing evidence, escaped text with no file/link fetches, preservation through partial shipping/payment/status responses, and isolation across different orders or changed lines. The Arabic administrator view retains evidence only for the same immutable purchased line and does not cache it in local storage.

The frozen production build completed **04:03:02.471 UTC**, `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`. Desktop complete invocations passed **34/35** in 2.5 and 2.7 minutes; after correcting shipping fixture selectors and separating public invoice equality from private snapshot equality, targeted shipping passed **1/1 in 4.7 seconds**. Mobile passed **34/35 in 2.7 minutes**; its successful contact status update was followed by a late CDP response-body lookup failure in the test helper. Immediate body capture and listener cleanup fixed that fixture, and targeted mobile administration passed **1/1 in 10.1 seconds**. No application/backend/build files changed between these invocations. All 70 device cases are covered through scoped runs; this is not a clean complete 70/70 invocation. Original failed reports are preserved; see [exact browser report paths](checkout-pricing.md#version-2-verification--0403-build).

Final read-only preservation at **2026-09-17T04:23:11.111Z** compared against the pre-mobile catalog/full-settings baselines ending `1789618533939`. All sixteen original products, full settings, 44 image-source records and 70 WebP hashes/dimensions/sizes matched. Twelve public fingerprints remained valid; the four pending inactive drafts returned 404, private categories returned anonymous 401, and category counts remained seven/16. API PID 11412/session 16510 remained healthy. QA records were retained: 10 orders, 3 custom requests, 3 contact messages and 11 checkout decisions. No mutation, restart, login or POST probe occurred. Private report: `.local/post-mobile-configuration-preservation-1789618991111.json`.
