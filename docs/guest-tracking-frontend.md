# Private guest order tracking

The storefront now offers an explicit **«نسخ رابط متابعة الطلب»** action on a saved checkout receipt and on the tracking page. The resulting link opens `/track` without requiring an account. Possession of that link permits reading the order and its delivery details, so the UI explains that it must be kept private.

## Link and request contract

The link has the shape `/track#order=<order-number>&token=<private-token>`. The generator puts both values in the fragment, with no query string. It accepts only an HTTP(S) origin without embedded user credentials. It does not create a link for a missing or invalid capability.

The parser accepts a fragment with or without its leading `#`, up to 400 characters. It requires exactly one `order` and one `token` parameter, without additional parameters. Order numbers match `^[A-Za-z0-9][A-Za-z0-9-]{2,99}$`; the token must be 64 lowercase hexadecimal characters. Duplicate, malformed, incomplete and oversized fragments fail validation.

After the first browser render, the page captures the fragment and removes it with `history.replaceState`, preserving the path and existing query string. Removal precedes the tracking request. An invalid fragment, missing fragment, or failed history replacement sends no tracking request. The page does not accept credentials in query parameters or emit an analytics event containing the link.

Tracking uses `GET /api/orders/track/:orderNumber` with `X-Order-Token`. The guest HTTP context removes an unrelated `Authorization` header, sets `withCredentials:false` and Fetch `credentials:'omit'`, and prevents a denied capability from refreshing or clearing an account session or redirecting to login. `transferCache:false` also prevents private responses from entering Angular's HTTP transfer cache. The currently configured application uses `withFetch()`.

`OrderService` requires `success:true` and the requested order number before normalizing or saving a response. Its existing receipt revision and latest-tracking guards protect a newer receipt. The page also checks that the normalized receipt contains usable delivery, item and amount fields before displaying it.

## Page behavior

- A valid link displays loading, then the recorded items and public specification snapshots, Arabic fulfillment status, public status history, delivery details, totals and the shared recorded-payment summary. Private payment references, operator identities, shipping notes and customer notes are not rendered by this page.
- Confirmed shipping includes a legitimate zero fee. Unconfirmed shipping stays provisional; the receipt says the fee will be agreed with the customer. A positive discount has its own row. Amounts use the existing `1.0-2` number format.
- Payment copy describes recorded collections, refunds and balances; tracking or creating an order does not itself complete payment. The shared summary preserves its existing legacy/no-records and unconfirmed-shipping semantics.
- Read failures offer **«إعادة محاولة المتابعة»** using the same credentials. A successful receipt offers **«تحديث تفاصيل الطلب»**. Both actions are GET requests; they do not submit or replay checkout.
- After successful tracking, an available session receipt permits an explicit **«عرض آخر طلب محفوظ في هذا التبويب»** action on a fragment-free reload. It does not automatically reveal delivery details or issue a GET. The page explains that this is the last receipt in the tab and could differ from another link. A nonempty invalid incoming fragment never offers that fallback.
- Session storage is a convenience, not a replacement for saving the private link. If no usable receipt survives, reopen the original saved link. Credentials from a failed first read are not separately persisted by this page.
- A new fragment cancels the previous subscription before handling the new link, including when the new link is invalid. Leaving the page also cancels the request. Abandoned HTTP responses therefore cannot pass through the subscription to publish an old receipt.
- Tracking leaves the cart, delivery draft and pending checkout identity/payload unchanged. It may update the separate saved receipt after a successful read.

The copy component uses the Clipboard API only after an explicit button action. If copying fails, it presents a readonly, selectable text area with the private link and privacy guidance. A pending copy for an older receipt cannot mark a replacement receipt as copied. The raw credential is not normally displayed in the page DOM.

`/track` is an unguarded lazy client-rendered route. Its server-route configuration declares `Cache-Control:no-store` and `X-Robots-Tag:noindex, noarchive`; the page applies `noindex, nofollow, noarchive` metadata after the shared SEO title call. Server rendering never reads the fragment or displays a tracked receipt. Normal page state uses signals, companion enums/copy, external HTML/SCSS and subscription cleanup; restored browser state is gated until `afterNextRender`.

## Source

- [Tracking component, template, styles and focused tests](../src/app/features/order-tracking/pages/order-tracking-page/order-tracking-page.component.ts), with companion [copy and validation](../src/app/features/order-tracking/pages/order-tracking-page/order-tracking-page.control.ts) and [state enum](../src/app/features/order-tracking/pages/order-tracking-page/order-tracking-page.enum.ts).
- [Credential interfaces](../src/app/core/models/guest-order-tracking.model.ts), [parser/generator](../src/app/core/utils/guest-order-tracking.util.ts) and [validation configuration](../src/app/core/utils/guest-order-tracking.data.ts).
- [Private-link component](../src/app/shared/components/private-order-link/private-order-link.component.ts), reused by the checkout receipt and tracking page.
- [Guest request context](../src/app/core/api/guest-order-tracking.context.ts), [token interceptor](../src/app/core/interceptors/auth-token.interceptor.ts), [error interceptor](../src/app/core/interceptors/api-error.interceptor.ts) and [order service](../src/app/core/services/order.service.ts).
- [Browser routes](../src/app/app.routes.ts) and [server routes](../src/app/app.routes.server.ts).

## Verification checkpoint

The full Angular suite passed **256/256 tests across 42 files in 5.83 seconds**, with the test build completed at **2026-09-17T05:36:54.936Z** in 7.011 seconds. This includes seven page cases covering private-fragment removal, public receipt rendering, unchanged cart/draft/pending state, explicit reload recovery, invalid-link isolation, exact read retry, abandoned-request cancellation and failed history removal. Root-owned utility, interceptor, copy-component and order-service regressions cover the shared contract.

The preceding full run had **255 passes and one failure**: the new page test expected `140.00`, whereas the established shared payment component correctly rendered `140 ج.م`. The assertion now targets that component's balance row exactly. The shipping assertion targets the shipping row and verifies `0 ج.م`; page amounts were aligned with the established receipt format. The duplicate top privacy notice was also removed after receipt success, where the shared copy block already provides it. The complete 256-test suite then passed.

The browser-verified production build completed at **2026-09-17T05:44:24.928Z** in **9.035 seconds**, with `main-NOO3XGHS.js` and `styles-LJHQOUSH.css`, initial **484.86 kB raw / 130.03 kB estimated transfer**. Exact hashes and lengths are retained in [the final build identity](../artifacts/performance/current-0544-build-identity.json). The template uses the existing receipt timestamp format `dd/MM/yyyy، HH:mm`, avoiding English month names and AM/PM. The earlier [05:38 identity](../artifacts/performance/current-0538-build-identity.json), before that timestamp adjustment, remains an unmeasured pre-browser checkpoint. Backend verification is **183 passing tests**.

## Scoped real-browser verification

All checks below used the unchanged 05:44 production build and the local disposable API. The new capability extends the existing guest-checkout scenario; it creates no additional order solely for tracking.

| Invocation | Result | Retained report |
| --- | --- | --- |
| Initial guest tracking, desktop | 1/1 passed in 6.4 seconds; case 5.2 seconds, before strengthening the header assertion | `artifacts/playwright-2026-09-17-private-tracking-desktop/report` |
| Related authentication, lost-response and product/cart checks, both devices | 10/10 passed in 24.4 seconds: three authentication scenarios, one lost-response scenario and one product/cart scenario per device | `artifacts/playwright-2026-09-17-private-tracking-regressions/report` |
| Final guest tracking, both devices | 2/2 passed in 13.9 seconds; desktop 4.6 seconds, mobile 6.2 seconds | `artifacts/playwright-2026-09-17-private-tracking-final/report` |

These cover **12 distinct device cases** across scoped invocations. The initial desktop pass is an additional execution of an already covered case, not a thirteenth distinct case. They do not establish a new whole-suite 35-scenario/70-case pass. Earlier scopes and failures remain recorded in [public-page QA](public-pages-qa.md).

The final helper copies the real receipt link through the browser Clipboard API, then opens it in a fresh context seeded with an existing cart, a pending checkout and an expired access-token value without a refresh token. It verifies fragment removal, a token-free HTML response, `noindex`, private response `no-store`, exact receipt/token persistence, no token in observed request URLs or the observed analytics state, and three tracking GETs: initial valid read, explicit saved-receipt resume after reload, and a private 404 for a well-formed wrong token. A malformed token sends no request and cannot reveal the saved receipt. No POST occurs in the tracking context, and the saved cart and pending checkout are preserved.

The final assertions use `await request.allHeaders()` and require both `authorization` and `cookie` to be absent. This is deliberately a **seeded-start-state** browser check: startup `/auth/me` may clear expired access before tracking. The deterministic interceptor unit test separately proves guest isolation while unrelated account credentials remain available. The helper does not claim that an expired credential remained loaded at every browser request.

Screenshots are retained at [desktop tracking receipt](../artifacts/playwright-2026-09-17-private-tracking-final/results/storefront-guest-checkout--18da3-ately-refreshes-its-receipt-desktop/private-guest-tracking.png) and [mobile tracking receipt](../artifacts/playwright-2026-09-17-private-tracking-final/results/storefront-guest-checkout--18da3-ately-refreshes-its-receipt-mobile/private-guest-tracking.png). Both runs assert no horizontal overflow; screenshot captures alone do not establish keyboard focus or complete application visual coverage. No new Lighthouse result is claimed by this document; performance remains separate evidence in the [performance audit](performance-audit.md).
