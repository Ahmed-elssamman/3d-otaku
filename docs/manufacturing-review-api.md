# Administrator manufacturing review API

Implementation contract, 2026-09-17. All paths below start with `/api/admin/products/:id` and require an administrator. Save/quote/approve accept only non-deleted products with `requiresManufacturingReview: true`; other products return 409. The explicit start action can enroll an inactive, saved product. Missing/deleted products return 404, missing authentication 401 and customer authentication 403. The workflow does not publish products or change prices.

New administrator `POST /api/admin/products` requests now create inactive products requiring review. Omit `isActive` or supply literal `false`; an active or non-boolean value receives HTTP 422 with `errors.isActive`, without insertion. Review values supplied through the ordinary product payload are ignored by its allowlist: measurements/costs start missing, status is pending and no approval is inherited. Every duplicate also requires review, including copies of unenrolled legacy products. Existing source products and global model defaults remain unchanged.

## Requests and responses

`GET /api/admin/products/:id` continues returning the product, including its private `manufacturingReview`. The actions return the usual `{ success, message, data }` envelope:

| Action | Body | `data` |
| --- | --- | --- |
| `POST /manufacturing-review/start` | `StartManufacturingReviewRequest` | Full administrator product |
| `PUT /manufacturing-review` | `SaveManufacturingReviewRequest` | Full administrator product |
| `POST /manufacturing-review/quote` | `{ expectedRevision: number }` | `ManufacturingQuoteResult` |
| `POST /manufacturing-review/approve` | `ApproveManufacturingReviewRequest` | Full administrator product |

```ts
enum ManufacturingMaterial { PLA = 'PLA', PLAPlus = 'PLA+' }
enum ManufacturingRounding { Piastre = 'piastre', FiveEgp = 'five-egp' }
enum ManufacturingStatus { Pending = 'pending', Approved = 'approved' }
enum ManufacturingHistoryAction { Started = 'started', Saved = 'saved', Approved = 'approved', Invalidated = 'invalidated', Duplicated = 'duplicated' }

interface ManufacturingCostingInputs {
  material: ManufacturingMaterial | null;
  consumptionIncludesSupportAndWaste: boolean | null;
  machineCostPerHourEgp: number | null;
  electricityCostPerHourEgp: number | null;
  laborCostEgp: number | null;
  packagingCostEgp: number | null;
  hardwareCostEgp: number | null;
  overheadCostEgp: number | null;
  fixedPaymentFeeEgp: number | null;
  failureRatePercent: number | null;
  targetGrossMarginPercent: number | null;
  variablePaymentFeePercent: number | null;
  returnReservePercent: number | null;
  retailRounding: ManufacturingRounding | null;
}
interface ManufacturingReviewInputs {
  consumedFilamentGrams: number | null;
  verifiedWeightGrams: number | null;
  verifiedPrintHours: number | null;
  measurementReference: string;
  sampleReference: string;
  rightsReference: string;
  costing: ManufacturingCostingInputs;
}
interface SaveManufacturingReviewRequest extends ManufacturingReviewInputs {
  expectedRevision: number;
}
interface StartManufacturingReviewRequest {
  expectedUpdatedAt: string;
}
interface ApproveManufacturingReviewRequest {
  expectedRevision: number;
  quoteFingerprint: string;
  sampleApproved: boolean;
  rightsReviewed: boolean;
  pricingApproved: boolean;
}
interface ManufacturingCostBreakdown {
  material: number; machine: number; electricity: number; failureAllowance: number;
  expectedPrint: number; labor: number; packaging: number; hardware: number;
  overhead: number; fixedPaymentFee: number; costBeforeSalesFees: number;
  variablePaymentFee: number; returnReserve: number; expectedProfit: number;
  minimumPrice: number; roundingIncrease: number; retailPrice: number;
}
interface ManufacturingCostQuote {
  currency: string;
  material: ManufacturingMaterial;
  consumedFilamentGrams: number;
  materialPiastresPerGram: number;
  breakdownPiastres: ManufacturingCostBreakdown;
  retailPriceEgp: number;
  achievedMarginBasisPoints: number;
  targetMarginBasisPoints: number;
  retailRounding: ManufacturingRounding;
  excludedCosts: string[];
  shippingIncluded: boolean;
  taxesCalculated: boolean;
  manufacturingApprovalGranted: boolean;
}
interface ManufacturingQuoteResult {
  revision: number;
  quoteFingerprint: string;
  effectiveSellingPriceEgp: number;
  meetsQuoteTarget: boolean;
  quote: ManufacturingCostQuote;
}
interface ManufacturingReviewHistory {
  action: ManufacturingHistoryAction;
  revision: number;
  createdAt: string;
  actorId: string;
  reason: string;
}
interface ManufacturingReview extends ManufacturingReviewInputs {
  revision: number;
  status: ManufacturingStatus;
  sampleApproved: boolean;
  pricingApproved: boolean;
  rightsReviewed: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedFingerprint: string | null;
  approvedQuote: ManufacturingQuoteResult | null;
  history: ManufacturingReviewHistory[];
}
```

## Editing, quoting and approval

- Start accepts only `{ expectedUpdatedAt }`, copied from the latest product response in canonical UTC ISO format (`YYYY-MM-DDTHH:mm:ss.sssZ`). It requires an inactive product; active products return 409 and must be explicitly unpublished first. The timestamp is checked both when reading and in the atomic save condition, alongside optimistic product version checks. Stale requests return 409; malformed timestamps and additional fields return 422. Enrollment returns 200, sets `requiresManufacturingReview: true` and initializes revision 0, pending status, null measurements/costs, empty references, cleared approvals and one server-owned `started` history event. Existing product specifications, prices, provenance, media and other fields are preserved. This explicit enrollment cannot be undone through ordinary product edits.
- Starting an already flagged inactive product with its current `updatedAt` returns the existing record unchanged, including any saved inputs/approval/history. A retry using the older pre-enrollment timestamp returns 409; reload the record before retrying. An active flagged product also returns 409. The frontend service is `startReview(id: string, request: StartManufacturingReviewRequest): Observable<ApiResponse<AdminProductRecord>>`.
- Save replaces the complete editable review input object. Every field must be present; unavailable numbers/enums/confirmation use explicit null, unavailable references use an empty string. Saves preserve pending drafts, reset existing approval and increment `revision`. A non-negative integer `expectedRevision` is mandatory. Unknown/protected fields are rejected with 422. References are trimmed plain text, maximum 1000 characters; they are never fetched by the server.
- Quantities must be positive when supplied, with at most three decimal places. Costs are non-negative EGP amounts with at most two decimal places; percentages accept two decimals. Null remains missing, never zero. Save may be incomplete; quote requires all costing fields, positive consumed grams, finished weight and print hours, plus `consumptionIncludesSupportAndWaste: true`. Printing hours and hourly machine/electricity costs are always included in this workflow. The existing calculator's material policy is fixed at 250 piastres/gram for PLA/PLA+.
- Quote is read-only. It recomputes the saved review and binds a SHA-256 fingerprint to its revision, input/evidence and relevant product configuration/price. Its breakdown excludes shipping and does not calculate taxes. Quoting does not grant manufacturing approval. The product material must match the selected costing material before approval.
- Approval requires the current revision/fingerprint, all three explicit true attestations and nonempty measurement/sample/rights references. It recomputes the quote and verifies the current effective selling price (`discountPrice` when present, otherwise `price`) is a positive amount in whole piastres at least as high as the quoted retail target. A low current price may still be quoted (`meetsQuoteTarget: false`), but cannot be approved. Apply a chosen price through the existing product editor, then reload/re-quote.
- Approval does not increment the input revision. Repeating an already successful approval with the same revision/fingerprint returns the same approval without another history entry. Stale revisions/fingerprints or concurrent changes return 409; invalid/incomplete inputs and attestations return field-specific 422. Approval identity/time/history are server-owned.
- Changes to price, discount, material, model URL/type, finish, color, size, weight, print time, layer height, infill, production-time configuration or image/gallery/poster/social image URLs increment the review revision and reset approval. Media URLs participate in the quote fingerprint because rights approval applies to those media too. An active flagged product must first be explicitly unpublished before saving a review or making these changes; otherwise the request returns 409 with no mutation. Relevant changes combined with `isActive: true` return 409. Inactive products remain inactive until the separate existing publication action succeeds. Ordinary descriptions/SEO/featured changes do not invalidate review. Replacing media requires a new quote and explicit rights attestation before republishing.
- All duplicates are inactive and explicitly require review, with pending status and cleared approvals/history. Copied review inputs remain editable, but are not evidence of approval for the copy. A copied legacy description such as a unitless weight is never converted into measured consumption or finished weight.
- All review/cost/evidence/history information remains inside the private `manufacturingReview` object, omitted from every public product response. The original catalog provenance and protected full source JSON remain intact.

## Verification

Automatic new/copy enrollment passed the complete backend suite: **132/132 tests** and syntax checks on the first run on **17 September 2026**, in **7674.2678 ms**. The three new HTTP regressions cover missing/false publication fields and forged approvals, rejected active/non-boolean creation with no insertion, and an automatically enrolled legacy copy with its source unchanged. The adjusted image test verifies new draft privacy while retaining public serialization coverage through a separate synthetic legacy fixture. Existing explicit legacy-enrollment and approved-copy invalidation coverage remains intact.

The complete Angular suite passed **160/160 across 29 files** on the first run in **5.19 seconds**, test bundle `2026-09-17T02:00:48.628Z`. Production build passed in **10.083 seconds** at `2026-09-17T02:01:33.744Z`, producing `main-GN52CWI4.js` / `styles-2XRGXKQX.css`, initial **479.73 kB raw / 128.00 kB estimated transfer**. Browser verification passed **33/33 desktop scenarios in 2.6 minutes** and **33/33 mobile scenarios in 2.2 minutes**, both on the first run of the same `main-GN52CWI4.js` / `styles-2XRGXKQX.css` build. Together these are **66 passed project cases (33 unique scenarios × two devices)** across two complete invocations, with one worker, zero retries and a fresh restored API for each device. There was no application edit between the runs. Reports: `artifacts/playwright-2026-09-17-recovery-desktop/report` and `artifacts/playwright-2026-09-17-recovery-mobile/report`. Automatic enrollment of a legacy product copy and new-product CRUD passed on both devices; only disposable QA copies were changed, with no real catalog mutations.

Historical results below retain their original scope; newest coordinated status is tracked in [implementation progress](implementation-progress.md).

Historical explicit-enrollment checkpoint: full `npm test` passed **78/78 tests**, including **18 manufacturing tests**, with zero failures or skips; `npm run check` passed. The five new enrollment cases cover strict authorization/timestamps, preservation of product/media/pricing/provenance, fresh repeated enrollment without resetting an existing approval, simultaneous enrollment and a competing timestamp-only update that does not advance the document version. All use disposable test databases. No shared runtime or real catalog record was enrolled by that implementation. The earlier checkpoints below record the preceding manufacturing workflow verification.

The preceding full `npm test` run passed **73 tests**, including **13 manufacturing HTTP/lifecycle tests**, with zero failures or skips. `npm run check` and `git diff --check` passed. Earlier focused and 72-case runs were followed by the media-rights regression and this full rerun.

Media-rights follow-up: `node --test test/manufacturing-review.test.js` passed **13 tests** with zero failures or skips. One added regression exercises all four media fields, covering active-edit 409 with unchanged storage, inactive-edit approval invalidation/revision increase, rejection of the prior fingerprint and model-level rejection when media change without a revision change. A subsequent full `npm test` run passed **73 tests**, with zero failures or skips. Ordinary copy/SEO behavior remains covered in the passing manufacturing suite.

Coverage includes administrator-only access, deleted/unflagged products, explicit nulls and strict inputs, complete printing costs and exact 250-piastre arithmetic, unchanged quote state, reference/material/effective-price checks, stale quote rejection, concurrent save conflicts, concurrent/repeated approval idempotence, private-data exclusion after publication, active-edit rejection, approval invalidation, duplication and model-level rejection of stale approval snapshots. The four licensed drafts and twelve independent legacy fixtures remain byte-equivalent in the disposable test database. Original source JSON is preserved when duplicating and remains excluded from API responses.

Existing product writes use Mongoose optimistic concurrency, so a simultaneous competing save returns 409 rather than overwriting the winning review. Legacy approval flags alone no longer satisfy publication: the current server quote and reviewer record are required. No production migration was performed.

The coordinated local API was subsequently restarted and its twelve Arabic public products/four inactive drafts restored. All 52 browser project cases passed on `main-ZIXSIPIB.js`, including four manufacturing cases covering incomplete saves, server costing, explicit price application, approval without publication and stale-revision recovery. These cases mutate only newly duplicated QA fixtures, remove those copies and verify the four original draft responses unchanged. Real manufacturing measurements, sample inspection and rights/pricing evidence remain pending. See [the administrator workflow](manufacturing-review-frontend.md).
