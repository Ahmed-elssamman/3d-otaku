# Public server rendering

The Angular application uses its standard server renderer and route render modes. Home, catalog, product, about, contact and missing-page routes render from current API responses for each document request. Cart, private guest tracking, orders, login, registration and administration use client rendering. No catalog snapshot is embedded during a build.

## Data and browser state

Angular 21 uses explicit `provideZonelessChangeDetection()` with no Zone.js browser polyfill. Signal updates, form-event bridges and framework pending-task tracking drive hydration and later UI updates. The earlier 52-case production browser run verified SSR, authentication/cart restoration and administrative HTTP/form behavior on `main-ZIXSIPIB.js`; that is historical local evidence, not verification of the new client-identity slice. See [implementation progress](implementation-progress.md) for the current application checkpoint.

Only anonymous public product/category/settings GET responses enter Angular's HTTP transfer cache. The browser consumes those responses during hydration without repeating the initial API calls. The server uses a configured internal API origin; `HTTP_TRANSFER_CACHE_ORIGIN_MAP` maps its keys to the browser's public origin. Authentication, customer history, tracking tokens, contact submissions and admin requests are excluded.

The public endpoints do not receive browser authorization tokens. Token and cart services initialize empty on the server and during the first public browser render. Initial authentication restoration waits for the first router navigation and its render; cart restoration runs after its initial render. The client-rendered cart route can initialize saved quantities immediately, and a delayed account response fills only blank, pristine name/email fields. Private client-route guards can validate a session before navigation. Storage failures keep the current in-memory session usable.

The Node renderer now derives a client identity from its actual socket and an explicit proxy-address allowlist. A server-only Angular request context forwards that identity only on anonymous public API GETs to the configured internal origin. Document authorization/cookie headers, private API calls and browser requests do not receive this forwarding behavior. Client identity is not added to public data, transfer state or persistent browser storage. The [client-identity contract](ssr-client-identity-plan.md) records the exact boundary, completed local checks and production limits.

Settings resolve before the public layout and page metadata, so server and client branding use the same response. Product state comes from the real API rather than persisted mock catalog data. Public API failures transfer only their anonymous error result, allowing the browser to hydrate the same 404/503 page; a subsequent user retry reaches the API. Missing routes/products return HTTP 404 with `noindex`; catalog outages return 503 rather than a successful empty catalog page.

Product JSON-LD and absolute canonical/social URLs are present before JavaScript. Structured JSON escapes `<` before serialization. Original media remains a fallback for legacy records or unavailable variants; cards, detail images and gallery thumbnails use native responsive image candidates derived by the backend.

## Local verification

```powershell
npm run build
npm run preview
```

The preview listens on loopback port 4300 and proxies the local backend on port 4000. It renders through the built `server.mjs`, compresses HTML and static assets, rejects unexpected hosts and applies script hashes to its generated inline hydration scripts. Its media/connect policy also allows the configured API port on `localhost` and `127.0.0.1`, so API-returned absolute upload URLs can load. Bracketed IPv6 literals are excluded from CSP sources because Chrome rejects them; the server's loopback input validation remains separate. Document/API responses use `no-store`; content-hashed static assets and generated WebP variants have immutable caching. Restart the preview after every production rebuild to replace the loaded server modules.

The preview uses `renderStorefrontFromNodeRequest(IncomingMessage)`, the same Node context path used by `reqHandler`. It forces the SSR trusted-proxy list empty, ignoring any inherited value, and strips inbound IP claims on API proxy requests. Plain `renderStorefront(Request)` remains available for context-free rendering. Two isolated HTTP scenarios passed on the actual preview process, including compressed GET/HEAD, transfer privacy, API sanitation and malformed authority/target rejection.

```powershell
$env:STORE_E2E_BASE_URL = 'http://127.0.0.1:4300'
npx playwright test e2e/ssr.spec.mjs
```

The identity checks passed on the **2026-09-17T15:46:55.350Z** build: **7/7** pure resolver, **300/300** Angular, **217/217** backend, **3/3** isolated handler HTTP cases in **3.1 s**, and **2/2** isolated preview HTTP cases first attempt in **1.274644 s**. The five new HTTP scenarios ran once each under the desktop project, with one worker and zero retries; they did not launch a browser or use the shared API/database. The first handler-fixture run failed because it marked public success responses no-store, suppressing Angular's transfer cache; the corrected run preserved all assertions and the same application build. The shared local API was activated at **15:52:56.928Z** with an empty trusted-proxy list. Exact reports and grouped changed-file mapping are in [SSR client identity](ssr-client-identity-plan.md).

The existing SSR regression scope then passed **20/20 project cases** first attempt in **22.9 s**, starting **15:58:00.425Z**: **10 unique scenarios × two projects**, comprising 16 actual Chrome cases (including two JavaScript-disabled contexts), two direct HTTP private-document cases and two isolated SSR-engine cases. This verifies the scoped rendering/hydration behavior on API217 and the same build; it is not a whole-commerce-suite rerun. See [the report](../artifacts/playwright-2026-09-17-ssr-api217/report/index.html) and [exact results](../artifacts/playwright-2026-09-17-ssr-api217/results.json).

See [SSR QA](ssr-qa.md) for measured behavior and test limits, and [performance audit](performance-audit.md) for Lighthouse results. Framework documentation consulted: [Angular 21 SSR](https://v21.angular.dev/guide/ssr) and [hydration](https://v21.angular.dev/guide/hydration).

## Deployment configuration

This change has not been deployed. Static-only hosting will not execute the public renderer. A production Node host must mount the exported `reqHandler` from `dist/3d-otaku/server/server.mjs`, serve the matching browser assets and proxy `/api` and `/uploads` to the backend. The handler itself does not open a public listener.

- `STORE_API_ORIGIN`: explicit internal HTTP(S) backend origin, without a path or credentials. The local default is `http://127.0.0.1:4000`.
- `STORE_PUBLIC_ORIGIN`: verified public origin, including HTTPS in production. This supplies canonical/social/WhatsApp URLs and transfer-cache origin mapping when TLS terminates before the Node server. Local verification falls back to the request origin.
- `STORE_TRUSTED_PROXY_ADDRESSES`: explicit literal IP/CIDR addresses of edges allowed to supply one sanitized `X-Forwarded-For` client IP to the Node renderer. Empty trusts no forwarding headers and uses the actual socket identity. Invalid configuration fails startup; malformed/repeated/chained header values fall back to the socket.
- `NG_ALLOWED_HOSTS`: verified hostnames permitted by Angular's SSR engine. Local build defaults allow `localhost` and `127.0.0.1`.
- Backend `TRUSTED_PROXY_ADDRESSES`: a separate literal address/CIDR allowlist for the actual edge/SSR egress connections to the API. Empty trusts no proxies. Remove legacy numeric `TRUST_PROXY_HOPS`; only absent, blank or trimmed exact `0` remains accepted for migration.

Incoming forwarded host/protocol/prefix headers are not trusted by the renderer. After resolving socket identity, the Node entry removes `Forwarded`, `X-Real-IP` and every `X-Forwarded-*` header before Angular handles the request; the context-free entry applies the same removal. Explicit removal also covers the framework's forwarded-prefix redirect behavior. Configure the reverse proxy and explicit public origin consistently, preserve the document's no-store policy, and apply a CSP compatible with generated hydration scripts. The loopback preview demonstrates compression and script hashing; deployed TLS, CSP, proxy host handling, cache behavior, geographic latency and process supervision still require testing in the actual hosting environment. Credentials are never sourced from document request headers for server API calls.

**Deployment check — per-client rate limits:** the application now carries verified Node request identity into public SSR reads and the backend supports explicit address-based proxy trust. Both allowlists must match the actual network path: restrict direct access to intended API/Node listeners, make the edge overwrite incoming XFF, and trust only its real socket/egress addresses. The SSR ingress accepts one sanitized client address; the backend separately follows its trusted proxy chain. Empty or mismatched configuration safely retains socket identity and can therefore pool proxied clients. No production addresses are supplied here, and the deployed topology remains unverified. Confirm independent client quotas and failed spoofing on the actual path before release. Production quotas are unchanged; no internal-route exemption is introduced.

See [SSR client identity](ssr-client-identity-plan.md) for the implemented socket/allowlist boundary, installed framework APIs, exact test scope and remaining verification. Local proof does not establish deployed TLS, proxy trust or persistent operational readiness.
