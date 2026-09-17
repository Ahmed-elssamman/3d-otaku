# Explicit backend proxy trust

Verified source contract, 2026-09-17. The full 217-case backend suite passed. API217 was subsequently activated with every captured raw record/index and existing capability preserved; the local allowlist remains explicitly empty. Post-activation browser/preservation evidence is recorded separately below.

## Configuration and migration

`TRUSTED_PROXY_ADDRESSES` is a comma-separated list of literal IPv4/IPv6 addresses or CIDRs for the actual proxies permitted to forward client identity. Empty or unset means no trusted addresses. Loopback, private and link-local networks are never trusted automatically. No hostname lookup occurs, and Express aliases such as `loopback`, `linklocal` and `uniquelocal` are rejected.

Values are trimmed; exact duplicate entries, IPv6 letter case and decimal prefix padding are normalized without expanding the trusted range. Bracketed addresses, ports, IPv6 zone identifiers, empty list entries, dotted netmasks and malformed addresses/prefixes fail at configuration import. Prefix lengths are `/1`–`/32` for IPv4 and `/1`–`/128` for IPv6, matching the installed Express address compiler's accepted nonzero range. IPv4-mapped IPv6 literals are supported. Their explicit CIDRs retain IPv6 prefix lengths: for example, a mapped `/120` describes the final eight IPv4 bits, corresponding to the native IPv4 `/24`; the parser does not reinterpret it as `/24`.

The old `TRUST_PROXY_HOPS` variable should be removed. Blank/whitespace values behave as absent, and its trimmed exact value `0` remains compatible, including alongside a new explicit address list. Any other supplied value—nonzero, malformed, fractional or padded `00`—fails startup with migration guidance, even when `TRUSTED_PROXY_ADDRESSES` is valid. A deployment must never silently fall back to unsafe numeric-hop trust.

Configure only verified proxy socket/egress addresses. For SSR, the backend's list must include the actual renderer egress addresses as well as the intended browser edge when both contact the backend. Merely trusting an address does not sanitize headers: the edge must overwrite untrusted forwarding inputs, and listener/network access must match the intended topology. The separate renderer must verify its own ingress before forwarding a client identity.

## Request and quota behavior

The validated list goes directly into Express's existing `trust proxy` setting. No custom client-IP header parser or limiter key generator is introduced. Express starts with the socket peer, examines the forwarding chain from nearest to farthest, and stops at the first untrusted address. Claimed addresses farther away cannot replace that untrusted hop. When the socket itself is untrusted, all forwarded values are ignored for `req.ip`.

The existing limiter continues to use `req.ip`, including its existing IPv6 `/56` grouping and mapped/plain IPv4 equivalence. Quotas, windows, storage and failure responses are unchanged: the normal API quota is still **300 requests per minute**, with the existing narrower credential, submission and tracking quotas. Neither trusted proxies nor SSR receive a quota exemption. Dependency readiness retains its separately documented deployment-probe behavior.

## Verification

All nine new cases in `outako/backend-api/test/proxy-trust.test.js` passed in the first full-suite invocation:

- Valid/invalid configuration, duplicate entries, no implicit private/loopback trust, legacy migration and actual config-import rejection.
- Existing Express literal/CIDR boundaries and mapped IPv4 matching without another dependency or custom matching algorithm.
- Isolated HTTP apps using the unchanged production health route and real 300/minute limiter: two forwarded clients independently exhaust their own quota through an explicitly trusted socket.
- Both empty and nonmatching address lists: rotating forwarded values cannot escape the exhausted socket bucket.
- HTTP chains stop at an untrusted hop, including IPv4-mapped trusted proxies.
- Actual IPv6 subnet grouping and mapped/plain IPv4 quota equivalence remain intact.

Fixtures use separate child processes, ephemeral loopback HTTP ports and synthetic documentation-range client addresses. They do not connect to MongoDB or the shared API and never reduce/reset the limiter's production quotas. `npm run check` passed first from **15:43:31.270 to 15:43:38.404 UTC**, **7.127 seconds**. The full `npm test` passed **217/217** first from **15:43:53.616 to 15:44:33.685 UTC**, **39575.2065 ms** runner time / **40.066 seconds** wall, with zero failures, skips or cancellations. No fixes or reruns were needed. Outputs are preserved under `outako/backend-api/.local/proxy-trust-check-2026-09-17.log` and `.local/proxy-trust-full-test-2026-09-17.log`. A focused diagnosis, if later needed, is `node --test test/proxy-trust.test.js`.

Local tests cannot establish the production network path, ingress sanitization or renderer identity propagation; those remain deployment checks alongside the separate SSR implementation.

## Activation boundary

This change needs no MongoDB schema/index migration, catalog rewrite or signing-key rotation. Use the existing fresh complete snapshot, staged restore and exact raw/index/capability/media preservation procedure. Pin the intended proxy allowlist before importing backend configuration; an empty list preserves the current no-trust behavior. Begin from the latest preservation pointer, not a historical activation snapshot.

Before explicitly trusting a local preview/renderer address, its API proxy must strip or overwrite incoming `X-Forwarded-For` using the verified socket boundary. Copying browser headers unchanged would let callers choose a client bucket through that newly trusted proxy. A context-free `renderStorefront(Request)` call cannot establish a client address; only the separate verified request-context path can prove SSR forwarding. Validate both boundaries before claiming live per-client quota separation.

## Preserving activation and packaging

A fresh snapshot from the latest complete API208 preservation baseline was captured at **15:51:35.225 UTC**, after one authorized ordinary login replaced an expired access capability. Every prior raw record/options/index and all settings values/timestamps remained exact. Its one new refresh record is included: **39 products**, **35 orders**, **39 checkout decisions**, **14 contacts**, **4 custom requests**, **13 users**, **47 refresh records** and **1 settings record**. Originals remain 12 public products plus four inactive drafts, with all 44 source/70 variant metadata and 114 file hashes unchanged.

Stage verification passed at **15:51:51.014 UTC**. The old live database still matched the snapshot at **15:52:53.637 UTC**, and final activation passed at **15:52:56.928 UTC** as PID **13476** / session **30960**. Both staged and live helpers explicitly set `TRUSTED_PROXY_ADDRESSES=''` and remove legacy hop configuration before importing the app. Current authentication, the original guest receipt, readiness/liveness, media/Swagger delivery and private gates passed. No business POST, catalog seeding/import, cleanup or old-snapshot reset occurred.

Private activation evidence: `outako/backend-api/.local/proxy-trust-217-post-qa-snapshot-1789660295225.json`, `proxy-trust-217-preactivation-report.json`, `proxy-trust-217-staged-restore-report.json`, `proxy-trust-217-pre-stop-report.json` and `proxy-trust-217-activation-report.json`.

The refreshed pure static packaging check passed at **15:55:17.012 UTC**: **84 runtime JavaScript files**, **254 relative imports**, the new proxy configuration module included, **12 exclusion probes**, and production dependency/lockfile agreement. Both historical packaging reports remain SHA-verified. The repeatable checker/report are `artifacts/backend-packaging-static-check-217.mjs` and `artifacts/backend-packaging-static-check-217.json`. No Docker build, image installation, container startup or production topology check was performed.

The existing SSR browser scope passed **20/20** on its first invocation in **22.9 seconds** against the new preview/API217. Final read-only preservation then passed first at **15:59:18.826 UTC**. Every activation raw record, collection option/index, full settings document (including `updatedAt: 08:26:07.495 UTC`) and all 114 original media hashes remained exact. No new refresh records or business records were added; the activation counts above remain current. There are no active QA leftovers. Current authentication, the original guest receipt, readiness/liveness, four private draft lookups and the administrator authorization gate passed.

The new complete snapshot is `.local/proxy-trust-217-final-snapshot-1789660758827.json`, with report `.local/proxy-trust-217-final-preservation-1789660758827.json`. **Future restoration must start from `.local/proxy-trust-217-latest-preservation-pointer.json`**. The restore helper's latest-pointer guard blocks replay of the older activation snapshot. PID **13476** / session **30960** remains live; final verification performed no login, POST, restart, cleanup or database writes.
