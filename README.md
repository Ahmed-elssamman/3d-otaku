# 3D Otaku

Egypt-focused storefront for physical 3D printed products. The current repository uses Angular 21 with zoneless change detection, Tailwind CSS 4 and PrimeNG 21; the Express/MongoDB backend is in `outako/backend-api`. Prices are in EGP.

PrimeNG 21.1.10 and the pinned PrimeIcons 7.0.0 use their MIT licenses. The storefront favicon derives from the existing box icon; its notice is retained in `public/assets/brand/primeicons-license.txt`.

This is an active implementation, not a production-ready release. Current evidence and remaining work are in [docs/implementation-progress.md](docs/implementation-progress.md).

## Local development

Install root dependencies with `npm ci`. In `outako/backend-api`, run `npm ci`, then `npm run dev:local`.

The backend creates an isolated temporary MongoDB and listens on port 4000. First startup downloads the MongoDB binary. It reads the existing public catalog and caches media locally; it does not change the remote store. Local orders/users are disposable and reset when that runner is restarted. Random local admin credentials are written to the ignored `outako/backend-api/.local/runtime.json`; do not commit or share this file.

From the repository root, run `npm start -- --host 127.0.0.1`. Open http://127.0.0.1:4200. Angular proxies `/api` and `/uploads` to the local backend.

The four licensed catalog candidates are stored as source assets and Arabic drafts. To add them to a chosen local development database, follow [docs/catalog-pricing.md](docs/catalog-pricing.md). They are inactive until manufacturing and pricing review; they are not included in the public catalog. The [manufacturing review panel](docs/manufacturing-review-frontend.md) records actual measurements and costs, requests server pricing at 2.50 EGP per consumed PLA/PLA+ gram, and requires explicit sample, rights and pricing attestations. Price changes and publication remain separate actions. The existing twelve products have a reviewed Arabic copy manifest and a guarded local application command in [docs/catalog-content-audit.md](docs/catalog-content-audit.md); repeat that command after restarting the disposable database.

An existing product can also enter manufacturing review through an explicit action after it is saved and unpublished. Enrollment preserves its specifications and starts with empty measurement/cost inputs; it requires review approval before later publication. Customer pages translate known specification labels and identify missing units without altering source values.

## Verification

- `npm test -- --watch=false`: Angular unit/component tests.
- `npm run test:server`: Node socket/proxy identity tests (native TypeScript loading requires Node 22.18+ or 24).
- `npm run test:e2e`: real Chrome desktop/mobile tests; requires the local frontend/backend and the built SSR preview on port 4300 for the SSR suite. Use the production-preview configuration below to run every case against port 4300. Set `CHROME_PATH` if Chrome is installed elsewhere.
- `npm run catalog:verify`: verify licensed catalog downloads and generated preview hashes.
- `npm run assets:verify`: verify fingerprinted storefront fonts/image, compatibility aliases and live references before building.
- In `outako/backend-api`, `npm test` and `npm run check`: backend HTTP/database tests and syntax checks.

Browser tests use local destinations only. Admin tests create uniquely named inactive products and clean them up; operations tests cancel their own requests and mark their own messages read. Account and storefront tests create local customers, guest orders and contact submissions. The viewer tests exercise actual WebGL context loss and recovery when supported. Never point these tests at a production database.

## Production-build preview

Run `npm run build`, then `npm run preview`. Open http://127.0.0.1:4300. This local-only Node server renders public routes with current API data and serves the optimized build with compression and security headers. Account, cart and admin routes render in the browser. Public API responses are transferred once for hydration; personal storage is restored in the browser. It is a verification tool, not a deployment.

Set both `$env:STORE_E2E_BASE_URL = 'http://127.0.0.1:4300'` and `$env:ADMIN_QA_BASE_URL = 'http://127.0.0.1:4300'` before `npm run test:e2e` to run every case against the production SSR preview. Restart the preview after rebuilding so the Node process loads the new server bundle.

Run `npm run audit:performance` for Lighthouse reports. Results and measurement limits are in [docs/performance-audit.md](docs/performance-audit.md).

The production frontend expects `/api` and `/uploads` on its own origin. Public SSR needs a Node host using the exported `reqHandler` from `dist/3d-otaku/server/server.mjs`; serving only the browser directory loses server rendering. Set `STORE_API_ORIGIN` to the internal backend origin, `STORE_PUBLIC_ORIGIN` to the verified public HTTPS origin, and `NG_ALLOWED_HOSTS` to verified public hostnames. The renderer ignores forwarded host headers; the explicit public origin keeps canonical URLs and transfer-cache keys correct behind a TLS reverse proxy. Configure persistent database and uploads storage, TLS, cache rules and secure backend environment before deployment. Store contact details must come from verified public settings; no guessed fallback number is used.

Client quotas require explicit proxy addresses at both boundaries: `STORE_TRUSTED_PROXY_ADDRESSES` for the renderer's sanitizing edge, and `TRUSTED_PROXY_ADDRESSES` for the backend's actual edge/renderer peers. Both default to trusting no proxy. The renderer accepts one verified client address and passes it only to anonymous public API reads; forwarded chains and malformed claims fall back to the socket. Nonzero legacy `TRUST_PROXY_HOPS` settings now fail startup with migration guidance. See [SSR identity and verification](docs/ssr-client-identity-plan.md) and [backend proxy trust](docs/backend-proxy-trust.md) before configuring the actual deployment path.

The backend uses one absolute `UPLOADS_ROOT` for writing and serving media. Its default is the module-relative `backend-api/src/uploads`; an explicit persistent mount can use `/data/uploads` on Linux. Deployment probes should use `/api/ready`, which checks MongoDB with a bounded ping and returns no-store 200/503 independently of shopper quotas. `/api/health` retains its process-liveness meaning. See [media and readiness verification](docs/backend-deployment-readiness.md).

The [backend container instructions](outako/CONTAINER.md) describe the production-only build context, port 5000 and persistent storage. Private local snapshots, credentials and existing uploads are excluded from image inputs. Static packaging checks have passed; an actual Docker build and deployment remain unverified in this workspace.

## Reference

- [Implementation progress and release requirements](docs/implementation-progress.md)
- [Backend audit and contracts](docs/backend-audit.md)
- [Frontend integration audit](docs/frontend-integration-audit.md)
- [Catalog source/license research](docs/catalog-research.md)
- [Existing catalog Arabic copy and evidence gaps](docs/catalog-content-audit.md)
- [Existing product prices and required costing evidence](docs/catalog-price-audit.md)
- [Responsive product images](docs/product-image-variants.md)
- [Costing and inactive draft import](docs/catalog-pricing.md)
- [Checkout retry identity and deployment compatibility](docs/checkout-idempotency.md)
- [Storefront asset integrity and caching](scripts/storefront-assets.md)
- [Manufacturing review workflow](docs/manufacturing-review-frontend.md)
- [Manufacturing review API](docs/manufacturing-review-api.md)
- [Admin browser QA](docs/admin-browser-qa.md)
- [Admin operations API](docs/admin-operations-backend.md)
- [Admin operations screens](docs/admin-operations-frontend.md)
- [Account and public page QA](docs/public-pages-qa.md)
- [Contact and 3D preview QA](docs/contact-and-viewer-qa.md)
- [Server rendering and deployment configuration](docs/ssr-rendering.md)
- [SSR browser and privacy QA](docs/ssr-qa.md)
- [Admin product/settings implementation](docs/admin-products-settings-frontend.md)
- [Performance measurements](docs/performance-audit.md)
