# Public server rendering

The Angular application uses its standard server renderer and route render modes. Home, catalog, product, about, contact and missing-page routes render from current API responses for each document request. Cart, orders, login, registration and administration use client rendering. No catalog snapshot is embedded during a build.

## Data and browser state

Angular 21 uses explicit `provideZonelessChangeDetection()` with no Zone.js browser polyfill. Signal updates, form-event bridges and framework pending-task tracking drive hydration and later UI updates. The complete 52-case production browser run verified SSR, authentication/cart restoration and administrative HTTP/form behavior on `main-ZIXSIPIB.js`; this remains local deployment evidence.

Only anonymous public product/category/settings GET responses enter Angular's HTTP transfer cache. The browser consumes those responses during hydration without repeating the initial API calls. The server uses a configured internal API origin; `HTTP_TRANSFER_CACHE_ORIGIN_MAP` maps its keys to the browser's public origin. Authentication, customer history, tracking tokens, contact submissions and admin requests are excluded.

The public endpoints do not receive browser authorization tokens. Token and cart services initialize empty on the server and during the first public browser render. Initial authentication restoration waits for the first router navigation and its render; cart restoration runs after its initial render. The client-rendered cart route can initialize saved quantities immediately, and a delayed account response fills only blank, pristine name/email fields. Private client-route guards can validate a session before navigation. Storage failures keep the current in-memory session usable.

Settings resolve before the public layout and page metadata, so server and client branding use the same response. Product state comes from the real API rather than persisted mock catalog data. Public API failures transfer only their anonymous error result, allowing the browser to hydrate the same 404/503 page; a subsequent user retry reaches the API. Missing routes/products return HTTP 404 with `noindex`; catalog outages return 503 rather than a successful empty catalog page.

Product JSON-LD and absolute canonical/social URLs are present before JavaScript. Structured JSON escapes `<` before serialization. Original media remains a fallback for legacy records or unavailable variants; cards, detail images and gallery thumbnails use native responsive image candidates derived by the backend.

## Local verification

```powershell
npm run build
npm run preview
```

The preview listens on loopback port 4300 and proxies the local backend on port 4000. It renders through the built `server.mjs`, compresses HTML and static assets, rejects unexpected hosts and applies script hashes to its generated inline hydration scripts. Its media/connect policy also allows the configured API port on `localhost` and `127.0.0.1`, so API-returned absolute upload URLs can load. Bracketed IPv6 literals are excluded from CSP sources because Chrome rejects them; the server's loopback input validation remains separate. Document/API responses use `no-store`; content-hashed static assets and generated WebP variants have immutable caching. Restart the preview after every production rebuild to replace the loaded server modules.

```powershell
$env:STORE_E2E_BASE_URL = 'http://127.0.0.1:4300'
npx playwright test e2e/ssr.spec.mjs
```

See [SSR QA](ssr-qa.md) for measured behavior and test limits, and [performance audit](performance-audit.md) for Lighthouse results. Framework documentation consulted: [Angular 21 SSR](https://v21.angular.dev/guide/ssr) and [hydration](https://v21.angular.dev/guide/hydration).

## Deployment configuration

This change has not been deployed. Static-only hosting will not execute the public renderer. A production Node host must mount the exported `reqHandler` from `dist/3d-otaku/server/server.mjs`, serve the matching browser assets and proxy `/api` and `/uploads` to the backend. The handler itself does not open a public listener.

- `STORE_API_ORIGIN`: explicit internal HTTP(S) backend origin, without a path or credentials. The local default is `http://127.0.0.1:4000`.
- `STORE_PUBLIC_ORIGIN`: verified public origin, including HTTPS in production. This supplies canonical/social/WhatsApp URLs and transfer-cache origin mapping when TLS terminates before the Node server. Local verification falls back to the request origin.
- `NG_ALLOWED_HOSTS`: verified hostnames permitted by Angular's SSR engine. Local build defaults allow `localhost` and `127.0.0.1`.

Incoming forwarded host/protocol headers are not trusted by the renderer. Configure the reverse proxy and explicit public origin consistently, preserve the document's no-store policy, and apply a CSP compatible with generated hydration scripts. The loopback preview demonstrates compression and script hashing; deployed TLS, CSP, proxy host handling, cache behavior, geographic latency and process supervision still require testing in the actual hosting environment. Credentials are never sourced from document request headers for server API calls.

**Remaining deployment check — per-client rate limits:** the documented same-origin proxy topology would pool clients behind each proxy into the backend's 300/minute API and 30/15-minute submission quotas if `TRUST_PROXY_HOPS` remains at its default `0`. No production proxy configuration is supplied here, so the deployed topology is unverified. Correct edge forwarding alone also leaves SSR reads pooled under the renderer's IP: `api-origin.interceptor.ts` changes only the request URL, and transfer cache is per document. Before deployment, restrict direct access to API/Node listeners, make the trusted edge overwrite untrusted client-IP headers, configure the exact trusted proxy chain, and propagate only its verified client address through server-only public API requests. A numeric one-hop setting is safe only for a fixed, restricted one-hop path; arbitrary incoming forwarding headers must not be trusted. Validate that two real client addresses receive independent quotas and spoofed headers cannot change their keys. Bounded caching of anonymous public responses can reduce SSR reads later, but does not repair client identity; larger limits or unauthenticated internal-route exemptions are not a substitute.
