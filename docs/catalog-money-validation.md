# Catalog and shipping money validation

Administrator writes validate monetary inputs before assigning fields or saving records. Product and settings schemas also use the same validation so normal model saves cannot persist a fractional piastre that checkout would reject.

| Field | Valid input | Missing field |
| --- | --- | --- |
| Product `price` | Numeric EGP amount from 0 through 10,000,000, in whole piastres | Still required on creation; unchanged on partial update |
| Product `discountPrice` | `null`, or a numeric whole-piastre amount within the same cap and strictly below the regular price | Defaults to null on creation; unchanged on update |
| Global `deliveryFee` | `null`, or a numeric whole-piastre amount from 0 through the existing 10,000 EGP limit | Existing null default; unchanged on update |

Zero remains a valid amount. Inactive manufacturing drafts keep their existing zero-price placeholder, null optional values and missing measurements. A null delivery fee remains unknown shipping; numeric zero remains explicitly confirmed free shipping. No measurement, price, fee or currency is inferred or changed automatically.

`src/utils/catalog-money.js` reuses `safeOrderPiastres` from `order-money.js`; it does not round. Numeric strings, booleans, arrays, objects, nonfinite numbers and fractional piastres are rejected with HTTP 422 and `errors.price`, `errors.discountPrice` or `errors.deliveryFee` as applicable. Examples: `1.001` is rejected; `1.01`, `0.1` and `0` are accepted. The product cap matches the existing checkout/pricing cap. Existing discount ordering, manufacturing approval, authorization and optimistic-concurrency rules remain in force.

The affected endpoints are `POST /api/admin/products`, `PUT /api/admin/products/:id` and `PUT /api/admin/settings`. Rejected updates do not save other submitted fields, change timestamps or alter manufacturing review history. Invalid settings requests are validated before the existing default-settings initializer, so rejection does not create a settings record.

Legacy malformed values inserted outside validated model writes are not silently rounded or repaired. Existing quote validation continues to reject them. Exact committed checkout replay still returns the original invoice before current catalog/settings validation. Repairs require an explicit valid administrator write; stored orders and durable checkout decisions are not repriced or rewritten. Direct raw MongoDB writes and Mongoose updates without validation remain privileged bypasses, not supported administrator API behavior.

## Verification scope

`npm run check` passed in **7.557 seconds**, then the complete `npm test` suite passed **192/192 on its first run**, with zero failures/skips/cancellations (**12708.1887 ms** TAP; **13.215 seconds** wall; started **2026-09-17T06:22:19.309Z**). All seven cases in `outako/backend-api/test/catalog-money.test.js` passed: settings/product HTTP rejection and raw-record preservation, inactive draft defaults, exact valid quotes/orders and existing upper bounds, independent model validation, malformed legacy quote safety with committed replay, and no settings initialization on invalid input. No source correction or separate focused rerun was needed. All fixtures used a disposable MongoDB database and synthetic products.

Logs are retained in backend `.local/catalog-money-check-2026-09-17.log` and `.local/catalog-money-full-test-2026-09-17.log`. These tests did not access or restart the shared API. Coordinated frontend/browser verification remains separate from the backend evidence.

Guarded local activation of API 192 passed at **2026-09-17T06:33:40.130Z**. Before stopping the verified disposable runner, its one synthetic guest order and one checkout decision were privately backed up at **06:31:49.006 UTC**. All sixteen original products and full settings matched the preactivation baselines ending `1789626709006.json`, excluding regenerated top-level database metadata. All 44 image-source records and 70 WebP files passed exact hash, decoded dimension and size checks. Twelve products remained public, four drafts pending/inactive and public 404, seven categories totaled sixteen non-deleted products, anonymous private-category access returned 401, health returned 200 and tracking 404 retained `no-store`. Fresh order/custom/contact/checkout-decision collections were empty. No login, order or other POST probes were sent. Report: backend `.local/catalog-money-activation-preservation-1789626820130.json`.

Coordinated settings browser coverage passed on desktop and mobile: `1.001` was rejected before PUT; zero and null were accepted with their distinct meanings. Final **06:41 `main-XQERADW5`** passed scoped desktop **3/3 in 8.7 seconds** and mobile **12/12 in 39.5 seconds**. The earlier 06:34 desktop run retained nine passes, one application skip-link failure and ten unrun cases (32.6 seconds); 06:41 verified the shared link fix. These results do not constitute a new full browser-suite pass.

Final read-only preservation passed at **2026-09-17T06:45:10.027Z**. Original sixteen products, full settings, 44 image-source records/70 WebP hashes/dimensions/sizes and all public configuration/privacy/category gates remained intact against the activation baselines. The unchanged API returned health 200 and private tracking 404 `no-store`. Thirteen synthetic orders/fifteen checkout decisions were retained, with zero custom requests/contact messages. No restart, cleanup, login, POST or database mutation occurred. Report: backend `.local/catalog-money-final-preservation-1789627510027.json`.

Relevant existing fixtures were inspected before implementation. The checkout fractional-price regression deliberately uses an unvalidated update and remains a legacy-data test; existing valid seed/draft/manufacturing fixtures retain their prior monetary values. Full verification commands, from `outako/backend-api`, are `npm run check` then `npm test`; a focused diagnostic command is `node --test test/catalog-money.test.js`.
