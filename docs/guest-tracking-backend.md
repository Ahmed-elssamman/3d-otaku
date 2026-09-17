# Guest order tracking API

The existing `GET /api/orders/track/:orderNumber` reads a saved receipt. It does not create, link, update or cancel an order. Access requires either the authenticated owner or the order's exact `X-Order-Token` header. Missing orders and absent/wrong/cross-order capabilities return the same private 404 without receipt data. The capability is not accepted from a URL query parameter.

All responses beneath `/api/orders/track` now carry `Cache-Control: no-store`. This narrow middleware runs before CORS, JSON parsing, authentication and both rate limiters, covering successful receipts, denied access, authentication/parser errors, preflight responses and 429 responses from either quota. Public catalog caching and other endpoints are unchanged. No token algorithm, schema, lifetime or ownership rule changes are included.

## Capability and response contract

- Creation or an authorized exact checkout replay returns `trackingToken`. Ordinary tracking responses do not echo it; the client retains the original capability.
- The token is a lowercase 64-character hexadecimal HMAC-SHA256 of the existing order ID/number using `JWT_SECRET`. It is derived, not stored as a separate hash. There is no individual expiry or revocation field. Fulfillment, shipping and payment updates preserve the token; rotating the signing secret invalidates existing links. The JWT access-token expiration interval does not set a guest-link lifetime.
- The response contains the saved customer/delivery details, purchased items/configuration, current invoice totals, public fulfillment history and whitelisted payment summary. Private manufacturing snapshots, shipping/payment history, operator evidence, idempotency keys and request fingerprints remain excluded.
- A valid guest capability can be used anonymously. An invalid/expired `Authorization` token still returns 401 before capability validation, because the existing optional-authentication rules are unchanged. A client opening a private guest link should omit unrelated Authorization headers for that capability read; it must not log the user out or turn the operation into checkout.
- Existing limits remain 60 tracking requests per IP per 15 minutes and the broader 300 API requests per IP per minute. HTTP 429 retains `Retry-After`; no quota was raised or bypassed.

## Browser integration boundary

A browser-only recovery link may hold the saved order number and capability in its fragment. Fragments are not sent in HTTP request URLs or referrers. The client should validate and capture it, strip it from the visible URL/history, then use the header-only GET above from a client-rendered page. The link grants access to customer delivery information; copying it must be an explicit action with clear private-link wording. Do not put it in server-rendered HTML, query parameters, analytics, automatic messages or request logs. Preserve unrelated cart, delivery-draft and pending-checkout state.

The API supplies no durable rejected-attempt decision through tracking and does not recover an unknown capability from an order number alone. A missing/invalid link must offer a safe manual support path without creating a replacement order. Deployments must preserve the no-store header and avoid logging `X-Order-Token`.

## Verification

Five HTTP cases in `outako/backend-api/test/order-tracking-cache.test.js` passed using disposable MongoDB and synthetic records. They cover unchanged guest/owner capability behavior, saved invoice/payment summary, private evidence exclusion, missing/wrong/cross-order access, invalid authentication, malformed paths, preflight, both rate limits and complete unchanged stored records. No public POST is used by this suite.

`npm run check` passed in **6.179 seconds**. The first complete run passed all 178 existing tests, while the five new cases stopped in fixture setup because its model type used lowercase `stl` instead of the existing `STL` enum. Correcting that test-only value produced a focused **5/5 pass** (5878.1244 ms TAP), followed by a complete **183/183 pass**, zero failures/skips/cancellations (**11768.1003 ms** TAP; 12.253 seconds wall time; started **2026-09-17T05:30:42.309Z**). Application code needed no correction after execution.

Ignored local evidence is preserved in `.local/guest-tracking-check-2026-09-17.log`, `.local/guest-tracking-full-test-2026-09-17.log` (initial fixture failure), `.local/guest-tracking-targeted-2026-09-17.log` and `.local/guest-tracking-full-test-final-2026-09-17.log`. These test commands did not change or restart the shared API.

The coordinated frontend passed **256/256 tests across 42 files in 5.83 seconds** (test compilation completed **05:36:54.936 UTC**). The baseline integration build completed **2026-09-17T05:38:24.836Z** in **10.727 seconds**, producing `main-BALOZ47T.js` and `styles-LJHQOUSH.css`.

Scoped browser verification subsequently passed on the **05:44 `main-NOO3XGHS` build** with API 183: one initial desktop guest case, ten authentication/lost-response recovery/product-cart cases across desktop/mobile, and two strengthened guest cases across both devices. The strengthened cases inspect complete request headers for private-link recovery. The initial and strengthened guest cases overlap; these invocations are not a new complete browser-suite run. Fresh-context recovery uses GET only and does not add orders.

## Local activation

The guarded disposable API activation passed at **2026-09-17T05:40:51.377Z**. All sixteen original products and full settings matched the prepared baselines, preserving twelve Arabic public products and four pending inactive drafts. All 44 image-source records and 70 WebP variants matched explicit preactivation file checksums, with metadata, dimensions and sizes verified. Four draft 404s, anonymous private-category 401, seven categories/sixteen non-deleted products, twelve public configuration fingerprints and health 200 passed. A GET for a nonexistent order returned private 404 with `Cache-Control: no-store`, confirming the activated middleware.

Orders, custom requests, contact messages and checkout decisions were empty before browser QA. No login or POST probe was sent. Prior synthetic records were retained in a private pre-reset evidence artifact. The report is `.local/guest-tracking-activation-preservation-1789623651377.json`, with catalog/settings and explicit media baselines ending `1789623480841.json`. No production data or runtime was accessed for mutation.

Final read-only preservation passed at **2026-09-17T05:47:26.559Z** against those activation baselines. All sixteen original products, full settings, 44 image-source records and 70 variant file checksums remained unchanged; exact byte equality preserves the previously verified dimensions. Twelve public configuration fingerprints, four pending draft 404s, anonymous private-category 401, seven categories/sixteen products and health 200 passed. Private tracking 404 still returned `no-store`. Seven synthetic orders and seven checkout decisions remained intact, with zero custom requests/contact messages. No restart, login, POST or cleanup occurred. Report: `.local/guest-tracking-final-preservation-1789624046559.json`.
