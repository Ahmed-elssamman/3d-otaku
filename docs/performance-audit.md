# Production performance audit

The complete **17 September 2026, 05:13:25.891–05:14:13.988 UTC** Lighthouse pass scored **89 / 90 / 92 on mobile** and **99 / 100 / 100 on desktop** for home, catalog and product. Accessibility, best practices and SEO scored **100 in all six samples**. Mobile LCP remains **3.49 / 3.21 / 3.22 seconds**. Font transfer is unchanged from the preceding complete pass. Timings are mixed: catalog mobile first paint, blocking time and speed index regressed, alongside other individual metrics below.

This is **one sample per route/device from one complete sequential pass**, not a median or selection of favorable runs. All six reports are retained without retakes. The build fixes inquiry recovery and an order-receipt race; it introduces no font or rendering-strategy change. The reviewed Noto metadata optimization and PrimeIcons subset remain in place. No Tajawal, content-visibility, letter-spacing, eager-image, extra-modulepreload or incremental-hydration experiment was adopted.

## Build and retained evidence

Production completed at **2026-09-17T05:09:50.721Z** in **10.283 seconds**. Every report identifies `main-P6YL7ZPA.js` and `styles-Y3PILGOW.css`. Initial browser bundle size is **483.50 kB raw / 129.61 kB estimated transfer**, versus **483.48 / 129.57 kB** in the baseline. This estimate differs from the main entry alone and full-page transfer.

| Artifact              |  Bytes | SHA-256                                                            |
| --------------------- | -----: | ------------------------------------------------------------------ |
| `main-P6YL7ZPA.js`    | 28,351 | `fca7f9986f6476059555e5b0851345e3cec7f748f868b4d86925f4a81936d0d7` |
| `styles-Y3PILGOW.css` | 72,714 | `c866f65cc52dd74f3f4cb780f14e4920c1e2972a6249546e6bd1034754fa7316` |
| `index.csr.html`      | 13,721 | `79501fbe21ca14b8f4e7548253636f582e3f408a3abeb2506c699119d692fe04` |
| `server/server.mjs`   | 10,029 | `76d13c875481a2ae8998f4d8809465bb1b858cad420e92937ea9d32641e25dfb` |

The 17-byte raw CSS increase is `.order-2{order:2}`, emitted because Tailwind detected a test-fixture ID. It is not an application styling intervention. Contact's compiled chunk remains `MXI7G4LM` from the verified 04:57 build.

Evidence remains under ignored [artifacts/performance/](../artifacts/performance/):

- **Current:** six JSON reports, six HTML reports and [summary.json](../artifacts/performance/summary.json), pinned by [current-0509-sha256.json](../artifacts/performance/current-0509-sha256.json). All **13 report hashes are verified**. Summary SHA-256: `396fbb1518694949288b47fd7424ccaa20a465319b9ab41a380a92f5fb22dced`.
- [current-0509-build-identity.json](../artifacts/performance/current-0509-build-identity.json) pins four build files verified before and after timing. [analysis-0509.json](../artifacts/performance/analysis-0509.json) retains every metric, delta, request, insight and setting. [verification-0509.json](../artifacts/performance/verification-0509.json) records the baseline and all build/asset/report checks. `0509` identifies the build; measurement occurred at **05:13–05:14 UTC**.
- **Primary baseline:** [baseline-2026-09-17-0423/](../artifacts/performance/baseline-2026-09-17-0423/), measured **04:23:53.790–04:24:41.703 UTC** on the 04:03 `main-R4RLZPZA.js` / `styles-IJQZ35G4.css` build. Its **13 report hashes, all 17 report/metadata copies and four original build files remain verified**. Summary SHA-256: `67d6ca6940ace70708711188605d2a613ea944a6c9d9c2a9a380483e7c78c363`.
- Earlier complete passes remain at [03:19](../artifacts/performance/baseline-2026-09-17-0319/), [02:13](../artifacts/performance/baseline-2026-09-17-0213/), [01:21](../artifacts/performance/baseline-2026-09-17-0121/), [00:46](../artifacts/performance/baseline-2026-09-17-0046/), [00:06](../artifacts/performance/baseline-2026-09-17-0006/), [16 September 23:11](../artifacts/performance/baseline-2026-09-16-2311/), [22:36](../artifacts/performance/baseline-2026-09-16-2236/), [22:00](../artifacts/performance/baseline-2026-09-16-2200/), [21:44](../artifacts/performance/baseline-2026-09-16-2144/) and [20:54](../artifacts/performance/baseline-2026-09-16-2054/). The 21:44 archive retains its actual CSP error. Older 19:42/20:19 sets remain archived; the concurrent provisional 20:16 set is excluded.

Earlier analyses and identities remain historical. No canonical measurement ran on intermediate 04:49/04:57 builds; their identities remain preserved, as do the older unmeasured 02:58/03:04 identities. Raw artifacts are local ignored evidence, not public deployment assets.

## Conditions and separate functional evidence

- Lighthouse **13.4.1**, **Headless Chrome 152**, Windows; production SSR/CSR preview at `http://127.0.0.1:4300`, isolated API at port 4000. Six sequential signed-out loads use fresh profiles and storage reset. Development port 4200 was stopped; no competing browser/build/test/API job ran during timing. Development restarted only afterward, at **05:15:59.319 UTC**.
- Mobile: simulated Slow 4G, **150 ms RTT, 1,638.4 Kbit/s, 4× CPU, 412×823 at DPR 1.75**. Playwright separately uses 390×844 at DPR 2. Desktop: simulated Dense 4G, **40 ms RTT, 10,240 Kbit/s, 1× CPU, 1350×940 at DPR 1**. Matching baseline settings were verified unchanged.
- Local HTTP/1.1, API/database/media access and Windows do not represent deployed HTTPS/CDN latency or Egyptian customer devices. Server/OS caches are not forcibly cleared. These are lab results, not field Core Web Vitals.
- Application behavior changed and disposable APIs were restored between checkpoints. This is **not an isolated A/B timing comparison**. These three public routes do not directly test contact recovery, interactive 3D, checkout or authenticated administration. No timing improvement is attributed to the functional fixes.

The final full Angular run passed **239/239 across 39 files in 6.38 seconds**, first attempt; its test bundle completed at **05:09:06.658 UTC** in 8.363 seconds. Backend passed **178/178**. Browser verification is scoped:

- The 04:49 affected desktop run passed **11/12**, exposing a real dual-alert contact defect. Corrected contact units passed **8/8**; 04:57 desktop contact passed **2/2 in 7.2 seconds**, and mobile affected checks passed **12/12 in 37.5 seconds**. All reports remain under `artifacts/playwright-2026-09-17-followup-{desktop,contact-desktop,mobile}/report`. [Contact recovery](contact-request-recovery.md) records scope and screenshots.
- A deliberately reproduced old-build failure proved that late tracking response A could replace newer receipt B. The corrected 05:09 build passed **six affected cart cases in 27.3 seconds**, three per device, in `artifacts/playwright-2026-09-17-tracking-race-final/report`. The failure remains at `artifacts/playwright-2026-09-17-tracking-race-reproduction-desktop/report`. The existing recovery scenario now includes a real second checkout: five POST attempts/two orders per device. Contact is unchanged by this race fix.

This is **not a new complete 70-case browser run**. Earlier 04:03 coverage of all 35 scenarios per device remains historical in [public-page QA](public-pages-qa.md). Final read-only preservation completed at **05:12:30.832 UTC** before timing. Functional checks do not establish performance scores.

## All current samples

| Route / device    | Fetch time, UTC | Performance | Accessibility | Best practices | SEO |
| ----------------- | --------------- | ----------: | ------------: | -------------: | --: |
| Home / mobile     | 05:13:25.891    |          89 |           100 |            100 | 100 |
| Home / desktop    | 05:13:35.524    |          99 |           100 |            100 | 100 |
| Catalog / mobile  | 05:13:45.350    |          90 |           100 |            100 | 100 |
| Catalog / desktop | 05:13:55.693    |         100 |           100 |            100 | 100 |
| Product / mobile  | 05:14:05.217    |          92 |           100 |            100 | 100 |
| Product / desktop | 05:14:13.988    |         100 |           100 |            100 | 100 |

| Route / device    | FCP, ms | LCP, ms | TBT, ms |      CLS | Speed index, ms |
| ----------------- | ------: | ------: | ------: | -------: | --------------: |
| Home / mobile     | 2,129.5 | 3,490.2 |    50.0 |        0 |         2,129.5 |
| Home / desktop    |   538.1 |   828.8 |       0 |        0 |           566.1 |
| Catalog / mobile  | 2,108.0 | 3,210.1 |   104.0 |        0 |         2,949.7 |
| Catalog / desktop |   468.4 |   739.3 |     3.0 |        0 |           471.3 |
| Product / mobile  | 1,932.1 | 3,216.4 |    57.0 |        0 |         1,932.1 |
| Product / desktop |   516.9 |   721.2 |       0 | 0.000034 |           516.9 |

FCP is first contentful paint, LCP largest contentful paint, TBT total blocking time and CLS cumulative layout shift. Values are rounded. Automated accessibility/SEO scores of 100 do not establish complete accessibility, indexing or purchase correctness.

All samples have zero `runWarnings`, no `runtimeError`, `errors-in-console` score 1 with no items, and **zero browser `/api/` requests**. Every recorded request returned 200; none is marked failed. This records the console-error audit, not every browser warning. SSR still fetches/transfers public data. Cache/image insights estimate **zero wasted bytes**; render-blocking lists are empty. Five LCP elements pass discovery/eager/high-priority checks; desktop catalog still selects a lazy secondary card image.

## Comparison with the complete 04:23 baseline

Positive deltas are regressions; negative values are lower times. All six comparisons are retained.

| Route / device    | Performance, baseline → current | FCP change, ms | LCP change, ms | TBT change, ms | Speed index change, ms |
| ----------------- | ------------------------------: | -------------: | -------------: | -------------: | ---------------------: |
| Home / mobile     |                         88 → 89 |          −19.9 |          −37.2 |          −12.0 |                 −931.0 |
| Home / desktop    |                         99 → 99 |           −1.3 |      **+19.7** |              0 |                  −28.7 |
| Catalog / mobile  |                         90 → 90 |     **+145.8** |         −143.5 |      **+52.0** |             **+987.4** |
| Catalog / desktop |                       100 → 100 |       **+3.8** |          −34.9 |       **+3.0** |                  −53.5 |
| Product / mobile  |                         91 → 92 |           −5.9 |      **+38.7** |          −69.0 |                   −5.9 |
| Product / desktop |                       100 → 100 |      **+20.4** |       **+2.8** |              0 |              **+15.8** |

Catalog mobile's unchanged rounded score conceals FCP **1,962.3→2,108.0 ms**, TBT **52→104 ms** and speed index **1,962.3→2,949.7 ms**. Product mobile's score rises while LCP worsens **3,177.6→3,216.4 ms**. Desktop home LCP, catalog FCP/TBT and product FCP/LCP/speed index also rise. No unfavorable sample was replaced. CLS is unchanged: five zeros and product desktop **0.00003358041533368969**, the existing delivery-note shift beside an icon.

## Full-page and font transfer

Transferred bytes include response overhead and match `total-byte-weight`; they differ from decoded sizes/bundle estimates. `Other` remains 4,976 bytes per page, including favicons.

| Route / device    | Current HTML | Current scripts | Current images | Full page, baseline → current | Change |
| ----------------- | -----------: | --------------: | -------------: | ----------------------------: | -----: |
| Home / mobile     |       21,967 |         162,345 |         54,643 |             362,625 → 362,626 |     +1 |
| Home / desktop    |       21,967 |         162,345 |         69,735 |             377,717 → 377,718 |     +1 |
| Catalog / mobile  |       25,180 |         158,868 |         63,034 |             370,752 → 370,753 |     +1 |
| Catalog / desktop |       25,180 |         158,868 |        102,023 |             409,741 → 409,742 |     +1 |
| Product / mobile  |       14,499 |         179,656 |         26,167 |             343,991 → 343,993 |     +2 |
| Product / desktop |       14,499 |         179,656 |         26,167 |             343,991 → 343,993 |     +2 |

Font transfer is unchanged at **104,527 bytes/page**. CSS transfer rises **14,166→14,168 (+2)**; raw CSS rises **72,697→72,714 (+17)**. Scripts transfer two fewer bytes per page; HTML one more on home/catalog and two more on product. Images are unchanged. These byte-level differences do not explain the timing changes.

Every sample requests each font once:

| Font                 | Body bytes | Transfer bytes |
| -------------------- | ---------: | -------------: |
| Noto Sans Arabic 400 |     45,492 |         46,408 |
| Noto Sans Arabic 700 |     46,720 |         47,636 |
| PrimeIcons subset    |      9,568 |         10,483 |

The subset remains **`/media/primeicons-subset-E2J67QVD.woff2`**, SHA-256 **`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`**. All six samples request only this PrimeIcons WOFF2, with no original WOFF2/EOT/WOFF/TTF/SVG fallback request. Original dependency/fallback files remain on disk.

Historically, subsetting saved **25,580 body bytes (72.78%)** versus the original 35,148-byte WOFF2. The 04:23 pass established a 25,581-byte transfer reduction against 03:19; there is **no additional font saving here**. All 54 required glyphs, outlines/metrics/hints and 22 name-record values remain preserved, though FontTools repacks name-table storage. `npm run icons:verify` runs before normal builds and checks coverage/dynamic bindings/hashes. Visual limits remain in [PrimeIcons maintenance](../scripts/primeicons.md). Noto's older 6,856-byte metadata saving and complete coverage remain documented in [storefront assets](../scripts/storefront-assets.md).

## HTTP cache verification after timing

At **05:14:49.491–05:14:49.532 UTC**, after Chrome closed, the subset returned **200**, `font/woff2`, exactly **9,568 bytes** and the expected hash, with `Cache-Control: public, max-age=31536000, immutable`. Its ETag request returned **304 with an empty body** and the same policy. The [new HTTP record](../artifacts/primeicons-http-verification-2026-09-17T05-14-49.491Z.json) is separate from timing; no verification requests ran during Lighthouse.

The [04:25 subset check](../artifacts/primeicons-http-verification-2026-09-17T04-25-19.059Z.json), [03:20 eight-URL Noto/hero/alias/original-font check](../artifacts/storefront-asset-cache-verification-2026-09-17T03-20-55-919Z.json) and [original record](../artifacts/storefront-asset-cache-verification.json) remain historical. Other URLs were not re-requested in this post-pass check. Current Noto/hero source/dist hashes were verified before and after timing. Local headers do not establish deployed CDN behavior or repeat-visit speed.

## Remaining bottlenecks and limits

Home mobile retains the slowest LCP, **3,490.2 ms**. The hero is discoverable, eager and high priority. Observed breakdown: **69.1 ms TTFB, 12.5 ms resource delay, 8.4 ms load, 285.6 ms render delay**; prior observed render delay was 1,260.9 ms. Main-thread style/layout is **468.7 ms**, script evaluation **312.0 ms**, versus 579.9/276.2 before. No source-level cause is established. Observed durations and simulated paint metrics use different models and must not be added or treated as identical measurements.

Catalog mobile records **548.9 ms style/layout**, **358.9 ms script evaluation** and **1,186.7 ms observed render delay**, with worse first paint/blocking/speed index despite improved simulated LCP. Desktop catalog selects a secondary lazy phone-stand image with automatic priority: observed discovery delay **174.9 ms**, versus 153.6 before. Earlier eager-loading trials did not establish a consistent benefit.

Product mobile records **339.7 ms style/layout**, **324.6 ms script evaluation** and **57 ms TBT**. Unattributed forced-reflow rows are 105.1 ms home mobile, 95.0 catalog desktop, 76.2 product mobile and 91.6 product desktop; the other two list none. Unused-JavaScript estimates range **27,803–29,291 bytes**. Font-display estimates are 5 ms home mobile, 10 catalog mobile, 5 catalog desktop and both product samples; home desktop lists none. Estimates are not additive or evidence of safe removal.

Prior modulepreload, containment, normal-letter-spacing and eager-image trials did not justify adoption; containment introduced incorrect scroll geometry. A larger same-version variable font was rejected. Evidence remains in [performance experiments](performance-experiments.md), [earlier speed-index investigation](performance-investigation-0006.md) and [scrollbar stability](storefront-scrollbars.md). Incremental hydration remains a source-reviewed idea requiring a separate controlled trial and interaction/SSR checks. It is not implemented or measured here. No diagnostic or retake followed this pass.

## Historical cold-font comparison — Tajawal not adopted

After 01:21, frozen `main-O65VYLKE.js` / `styles-DWJFAQFT.css` measured 24 mobile navigations using actual CDP throttling, four AB/BA/BA/AB pairs per route. These differ from simulated Lighthouse and later builds. Tajawal with Noto fallback reduced font transfer **135,754→54,640 bytes**, but home/catalog CLS increased in every pair: medians **0.018823→0.102797** and **0.019235→0.185849**. Timing was mixed, including worse home TBT. The treatment was rejected.

A proxy shutdown error interrupted after sample 21; only three unstarted samples continued against verified frozen bytes. Saved evidence confirmed **24 complete measured/post-check records**, correcting an earlier conservative estimate. Catalog pair 4 retains its **175.608-second interruption gap**. All measurements/errors/geometry limits remain in [cold-comparison-results.md](../artifacts/font-research-tajawal/cold-comparison-results.md).

## Reproduce a subsequent checkpoint

With the isolated API ready, build and start the preview. Normal builds run icon coverage verification first:

```powershell
npm run build
node scripts/serve-production.mjs
```

Use a separate shell after preview readiness. Release competing jobs, stop development and archive current reports/build identities before running the full pass once:

```powershell
node scripts/audit-performance.mjs
```

Defaults are preview port 4300 and API port 4000. Explicit local overrides are `STORE_AUDIT_BASE_URL`, `STORE_API_ORIGIN`, `STORE_PREVIEW_PORT` and `CHROME_PATH`. Routes are `/`, `/products` and `/products/templar-knight-phone-and-tablet-holder`. Retain all six report pairs and summary. On runtime interruption, preserve the sample and coordinate only unstarted samples; never silently replace failed/slower measurements.

Current derived verification is reproducible while this build/report set exists:

```powershell
node artifacts/performance/analyze-primeicons.mjs --baseline=baseline-2026-09-17-0423 --identity=current-0509-build-identity.json --checkpoint=0509
```

`--preflight` checks disk identities without writing reports. After timing only, `node artifacts/performance/verify-primeicons-http.mjs --verification=artifacts/performance/verification-0509.json` creates a timestamped HTTP record. Production conclusions require the actual HTTPS host, CDN/cache behavior, API latency and field data; this single local pass establishes neither a repeatable timing gain nor a performance target.
