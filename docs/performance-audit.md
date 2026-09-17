# Production performance audit

The later **15:46:55.350 UTC** build adds verified SSR client identity. Its browser main script, stylesheet and CSR shell are byte-identical to the measured 07:31 build; the server entry changed. Initial browser size remains **488.14 kB / 131.20 kB estimated transfer**. [Build comparison](../artifacts/ssr-client-identity-build-identity.json) records those hashes. No new Lighthouse run was made for this server change: the scores below remain measurements of the earlier runtime. Before rebuilding, all 21 baseline payload files were copied and hash-verified in [the 07:31 archive](../artifacts/performance/baseline-2026-09-17-0731/archive-verification.json), with originals retained.

The complete **17 September 2026, 07:44:37.045–07:45:24.947 UTC** Lighthouse pass scored **87 / 90 / 91 on mobile** and **99 / 100 / 100 on desktop** for home, catalog and product. Accessibility, best practices and SEO scored **100 in all six samples**. Mobile LCP is **3.60 / 3.27 / 3.22 seconds**. Catalog and product mobile scores increased against the complete 06:41 baseline, but home mobile speed index regressed by **1,396.9 ms**; the other regressions remain below.

This is **one sample per route/device from one complete sequential pass**, not a median or selection of favorable runs. All six first samples are retained without retakes. The 07:31 build includes product edit/revision safety and actionable field bounds. It adopts no new font or rendering strategy. Historical rejected experiments remain separate from these canonical measurements.

## Build and retained evidence

Production completed at **2026-09-17T07:31:16.112Z** in **10.070 seconds**. Every report identifies `main-BOWHSGTL.js` and `styles-LJHQOUSH.css`. Initial browser bundle size is **488.14 kB raw / 131.20 kB estimated transfer**, versus **488.13 / 131.14 kB** in the 06:41 baseline: increases of **0.01 / 0.06 kB**. The stylesheet and server entry hashes are unchanged. Bundle estimates differ from the main entry alone and full-page transfer.

| Artifact              |  Bytes | SHA-256                                                            |
| --------------------- | -----: | ------------------------------------------------------------------ |
| `main-BOWHSGTL.js`    | 28,980 | `7148a6cfc786f63aad9ea1d4329cbcc76f21dd44e0f68f60b64c9f905f9f6e5b` |
| `styles-LJHQOUSH.css` | 72,756 | `a8148893427a7a303f64274445952cf50c847cde9cef29decd90c6b12442c842` |
| `index.csr.html`      | 13,721 | `c274b87d70919cbe705fb4dd908e392315f585041ea14940d404dc4288c5fed8` |
| `server/server.mjs`   | 10,029 | `76d13c875481a2ae8998f4d8809465bb1b858cad420e92937ea9d32641e25dfb` |

Evidence remains under ignored [artifacts/performance/](../artifacts/performance/):

- **Current:** six JSON reports, six HTML reports and [summary.json](../artifacts/performance/summary.json), pinned by [current-0731-sha256.json](../artifacts/performance/current-0731-sha256.json). All **13 report hashes are verified**. Summary is **12,707 bytes**, SHA-256 `2a1f0a2e0e899697699785eec61c214cd12e64bab8082525016ff3dc57603fb7`.
- [current-0731-build-identity.json](../artifacts/performance/current-0731-build-identity.json) pins four build files verified before and after timing. [analysis-0731.json](../artifacts/performance/analysis-0731.json) retains every metric, delta, request, insight and setting; [verification-0731.json](../artifacts/performance/verification-0731.json) records the checks. The [execution log](../artifacts/performance-canonical-0731.log) retains the complete pass. `0731` identifies the build; measurement occurred at **07:44–07:45 UTC**.
- **Primary baseline:** [baseline-2026-09-17-0641/](../artifacts/performance/baseline-2026-09-17-0641/), measured **06:45:35.192–06:46:19.952 UTC** on `main-XQERADW5.js` / `styles-LJHQOUSH.css`. Its **13 report hashes and all 21 archived entries remain verified**: 13 reports, four metadata files and four exact originals under `build-files/`. The originals are included in 21, not an additional four. Archive and build identities agree. Baseline summary SHA-256: `55a3623b6f4c9b09fec9feb132cab937917087193b640d4538aee8363fb0138b`.
- The [05:44 build archive](../artifacts/performance/baseline-2026-09-17-0544/), measured **06:01:53.594–06:02:44.386 UTC** on `main-NOO3XGHS.js` / `styles-LJHQOUSH.css`, remains historical. Its summary SHA-256 is `06c72e511e6fa64737bfbdcc8e73b1a5b696dc8ee90ed180a0fdbd5a3e9847b3`. Its complete comparison with 06:41 is preserved below.
- The preceding [05:13 pass](../artifacts/performance/baseline-2026-09-17-0513/), measured **05:13:25.891–05:14:13.988 UTC** on the 05:09 `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css` build, remains historical. Its summary SHA-256 is `396fbb1518694949288b47fd7424ccaa20a465319b9ab41a380a92f5fb22dced`; its comparison with 05:44 is also retained below.
- Earlier complete passes remain at [04:23](../artifacts/performance/baseline-2026-09-17-0423/), [03:19](../artifacts/performance/baseline-2026-09-17-0319/), [02:13](../artifacts/performance/baseline-2026-09-17-0213/), [01:21](../artifacts/performance/baseline-2026-09-17-0121/), [00:46](../artifacts/performance/baseline-2026-09-17-0046/), [00:06](../artifacts/performance/baseline-2026-09-17-0006/), [16 September 23:11](../artifacts/performance/baseline-2026-09-16-2311/), [22:36](../artifacts/performance/baseline-2026-09-16-2236/), [22:00](../artifacts/performance/baseline-2026-09-16-2200/), [21:44](../artifacts/performance/baseline-2026-09-16-2144/) and [20:54](../artifacts/performance/baseline-2026-09-16-2054/). The 21:44 archive retains its actual CSP error. Older 19:42/20:19 sets remain archived; the concurrent provisional 20:16 set is excluded.

Earlier analyses and identities remain historical, including the unmeasured intermediate 07:18 build and **06:34 build** retained under [checkout-storage-0634-build-files](../artifacts/checkout-storage-0634-build-files/), plus intermediate 05:38, 04:49/04:57 and 02:58/03:04 builds. Raw artifacts are local ignored evidence, not public deployment assets. The rejected hydration candidate's historical restoration record is [baseline-restoration-verification.json](../artifacts/home-hydration-diagnostic/baseline-restoration-verification.json): 352 source and 193 compiled files were checked at **06:00:59.462 UTC** before the earlier pass.

## Conditions and separate functional evidence

- Lighthouse **13.4.1**, **Headless Chrome 152**, Windows; production SSR/CSR preview at `http://127.0.0.1:4300`, isolated API at port 4000. Six sequential signed-out loads use fresh profiles and storage reset. Development port 4200 was stopped; no competing browser/build/test/API job ran during timing.
- Mobile: simulated Slow 4G, **150 ms RTT, 1,638.4 Kbit/s, 4× CPU, 412×823 at DPR 1.75**. Playwright separately uses 390×844 at DPR 2. Desktop: simulated Dense 4G, **40 ms RTT, 10,240 Kbit/s, 1× CPU, 1350×940 at DPR 1**. Baseline Lighthouse version and form factor, throttling method, emulated screen, throttling and user-agent settings match.
- Local HTTP/1.1, API/database/media access and Windows do not represent deployed HTTPS/CDN latency or Egyptian customer devices. Server/OS caches are not forcibly cleared. These are lab results, not field Core Web Vitals.
- Application behavior changed and disposable APIs were restored between checkpoints. This is **not an isolated A/B timing comparison**. These three public routes do not directly test private guest tracking, contact recovery, interactive 3D, checkout or authenticated administration. Neither improvements nor regressions are assigned to a single source change.

The full Angular suite passed **291/291 across 44 files in 6.21 seconds**, test build **07:30:14.358 UTC / 6.907 seconds**; backend passed **201/201**. The bounds-validation run passed first time. The preceding revision/save-lock suite passed 288 tests after two TS2345 interface/compiler errors were corrected; that first output remains retained. [Product edit safety](admin-product-edit-safety.md) records the exact tests, compiler failure and corrected contracts.

The corrected real-browser invocation passed **10/10 distinct device cases in 1.4 minutes** on this build and the actual API validated by 201 backend tests: five administrator/product/manufacturing scenarios on both devices. It includes real delayed-save locking, 31-gallery rejection, stale deletion confirmation, revision conflict review/merge and inactive manufacturing copies. The quota fixture respected a **13-second reset wait with 129 requests remaining**.

The initial invocation retained **one desktop fixture failure at 12.6 seconds and nine unrun cases**: DELETE returned 200 and the list was empty, but CDP no longer retained the list response body. The correction checks browser GET 200, the visible empty list and a fresh read-only filtered API result. No application change or performance-driven retake followed that failure. Reports remain [initial scope](../artifacts/playwright-2026-09-17-product-edit-safety/report/) and [corrected scope](../artifacts/playwright-2026-09-17-product-edit-corrected/report/). This is the affected ten-case administrator scope, not a complete storefront/project run. [Public-page QA](public-pages-qa.md) preserves earlier storage/skip-link/private-tracking evidence under its dated builds. Functional checks do not establish performance scores.

## All current samples

| Route / device    | Fetch time, UTC | Performance | Accessibility | Best practices | SEO |
| ----------------- | --------------- | ----------: | ------------: | -------------: | --: |
| Home / mobile     | 07:44:37.045    |          87 |           100 |            100 | 100 |
| Home / desktop    | 07:44:48.014    |          99 |           100 |            100 | 100 |
| Catalog / mobile  | 07:44:57.909    |          90 |           100 |            100 | 100 |
| Catalog / desktop | 07:45:07.150    |         100 |           100 |            100 | 100 |
| Product / mobile  | 07:45:16.546    |          91 |           100 |            100 | 100 |
| Product / desktop | 07:45:24.947    |         100 |           100 |            100 | 100 |

| Route / device    | FCP, ms | LCP, ms | TBT, ms |      CLS | Speed index, ms |
| ----------------- | ------: | ------: | ------: | -------: | --------------: |
| Home / mobile     | 2,142.8 | 3,598.5 |    64.5 |        0 |         3,554.8 |
| Home / desktop    |   548.1 |   854.0 |     0.5 |        0 |           676.0 |
| Catalog / mobile  | 2,029.4 | 3,269.9 |   107.0 |        0 |         2,029.4 |
| Catalog / desktop |   493.9 |   769.2 |       0 |        0 |           493.9 |
| Product / mobile  | 1,960.7 | 3,219.4 |    74.5 |        0 |         1,960.7 |
| Product / desktop |   508.1 |   721.0 |       0 | 0.000034 |           547.5 |

FCP is first contentful paint, LCP largest contentful paint, TBT total blocking time and CLS cumulative layout shift. Values are rounded. Automated accessibility/SEO scores of 100 do not establish complete accessibility, indexing or purchase correctness.

All samples have zero `runWarnings`, no `runtimeError`, `errors-in-console` score 1 with no items, and **zero browser /api/ requests**. Every recorded request returned 200; none is marked failed. This records the console-error audit, not every browser warning. SSR still fetches/transfers public data. Cache/image insights estimate **zero wasted bytes**; render-blocking lists are empty. Five LCP elements pass discovery/eager/high-priority checks; desktop catalog still selects a lazy secondary card image.

## Comparison with the complete 06:41 baseline

Positive time deltas are regressions; negative values are lower times. All six comparisons are retained.

| Route / device    | Performance, 06:41 → 07:31 | FCP change, ms | LCP change, ms | TBT change, ms | Speed index change, ms | CLS change |
| ----------------- | -------------------------: | -------------: | -------------: | -------------: | ---------------------: | ---------: |
| Home / mobile     |                    87 → 87 |          −15.1 |          −23.8 |          −64.5 |           **+1,396.9** |          0 |
| Home / desktop    |                    99 → 99 |      **+15.2** |       **+9.8** |       **+0.5** |             **+119.0** |          0 |
| Catalog / mobile  |                    89 → 90 |          −14.9 |         −139.4 |       **+9.5** |                  −14.9 |          0 |
| Catalog / desktop |                  100 → 100 |          −10.0 |           −8.7 |              0 |                  −52.1 |          0 |
| Product / mobile  |                    90 → 91 |         −159.7 |          −46.4 |       **+1.5** |                 −159.7 |          0 |
| Product / desktop |                  100 → 100 |           −6.3 |           −7.5 |              0 |              **+33.0** |          0 |

Home mobile's lower FCP/LCP/TBT coexist with speed index worsening **2,157.9→3,554.8 ms**, despite an unchanged rounded performance score. Home desktop worsens in all four timed metrics. Catalog and product mobile TBT rise **97.5→107.0 ms** and **73.0→74.5 ms**, despite higher scores. Product desktop speed index rises **514.5→547.5 ms**. CLS is unchanged: five zeros and product desktop **0.00003358041533368969**, matching the previously observed delivery-note shift beside an icon. No unfavorable sample was replaced. These observations do not isolate a source change or establish repeatability.

<a id="comparison-with-the-complete-0544-baseline"></a>

## Historical comparison: 06:41 build against the complete 05:44 baseline

This dated comparison covers the **06:45–06:46 measurements of the 06:41 build**, not the current 07:31 build. The complete historical [analysis-0641.json](../artifacts/performance/baseline-2026-09-17-0641/analysis-0641.json) preserves its settings, requests and deltas.

| Route / device    | Performance, 05:44 → 06:41 | FCP change, ms | LCP change, ms | TBT change, ms | Speed index change, ms |
| ----------------- | -------------------------: | -------------: | -------------: | -------------: | ---------------------: |
| Home / mobile     |                    86 → 87 |          −70.8 |          −64.6 |           −6.5 |                 −493.0 |
| Home / desktop    |                    99 → 99 |          −10.5 |      **+37.6** |              0 |                  −99.2 |
| Catalog / mobile  |                    89 → 89 |          −36.6 |      **+84.3** |           −1.5 |                 −883.0 |
| Catalog / desktop |                  100 → 100 |      **+28.9** |           −6.6 |           −0.5 |                  −20.8 |
| Product / mobile  |                    90 → 90 |     **+176.8** |          −42.4 |          −22.0 |                 −911.2 |
| Product / desktop |                  100 → 100 |      **+10.3** |          −14.9 |              0 |              **+10.3** |

Home mobile improves in all four timed metrics, but its LCP remains 3.62 seconds. Catalog mobile LCP rises **3,325.0→3,409.3 ms** despite lower FCP/TBT/speed index. Product mobile FCP rises **1,943.6→2,120.4 ms**, while LCP and blocking fall. Home desktop LCP, catalog desktop FCP and product desktop FCP/speed index also regress despite unchanged rounded scores. CLS is unchanged: five zeros and product desktop **0.00003358041533368969**, the existing delivery-note shift beside an icon. No unfavorable sample was replaced.

## Historical comparison: 05:44 build against the complete 05:13 pass

This dated comparison remains preserved from the previous audit; its “later” samples are the 06:01–06:02 measurements of the 05:44 build, not the current 07:31 build.

| Route / device    | Performance, 05:13 → 05:44 | FCP change, ms | LCP change, ms | TBT change, ms | Speed index change, ms |
| ----------------- | -------------------------: | -------------: | -------------: | -------------: | ---------------------: |
| Home / mobile     |                    89 → 86 |      **+99.2** |     **+196.6** |      **+85.5** |             **+521.4** |
| Home / desktop    |                    99 → 99 |       **+5.3** |          −22.2 |              0 |              **+90.1** |
| Catalog / mobile  |                    90 → 89 |          −27.1 |     **+114.9** |           −5.0 |                  −22.3 |
| Catalog / desktop |                  100 → 100 |       **+6.6** |      **+45.2** |           −2.5 |              **+95.4** |
| Product / mobile  |                    92 → 90 |      **+11.5** |      **+91.9** |      **+38.0** |           **+1,099.5** |
| Product / desktop |                  100 → 100 |          −12.7 |      **+22.2** |              0 |                  −12.7 |

In that earlier pass, home mobile regressed in all four timed metrics; TBT rose **50→135.5 ms**. Product mobile also regressed across them, including speed index **1,932.1→3,031.7 ms**. Catalog mobile improved first paint, blocking and speed index while LCP worsened **3,210.1→3,325.0 ms**. Unchanged desktop rounded scores concealed the listed FCP/LCP/speed-index regressions. No unfavorable sample was replaced; CLS was unchanged.

The preceding checkpoint was itself mixed: its archived [analysis-0509.json](../artifacts/performance/baseline-2026-09-17-0513/analysis-0509.json) retains all deltas against 04:23, including catalog mobile **+145.8 ms FCP / +52 ms TBT / +987.4 ms speed index**, product mobile **+38.7 ms LCP**, and desktop regressions. Historical regressions have not been replaced by the new baseline comparison.

## Full-page and font transfer

This section compares **07:31 with 06:41**. Transferred bytes include response overhead and match `total-byte-weight`; they differ from decoded sizes/bundle estimates. `Other` remains 4,976 bytes per page, including favicons.

| Route / device    | Current HTML | Current scripts | Current images | Full page, 06:41 → 07:31 | Change |
| ----------------- | -----------: | --------------: | -------------: | -----------------------: | -----: |
| Home / mobile     |       21,966 |         167,018 |         54,643 |        367,295 → 367,301 |     +6 |
| Home / desktop    |       21,966 |         167,018 |         69,735 |        382,387 → 382,393 |     +6 |
| Catalog / mobile  |       25,165 |         163,693 |         63,034 |        375,570 → 375,566 |     −4 |
| Catalog / desktop |       25,165 |         163,693 |        102,023 |        414,559 → 414,555 |     −4 |
| Product / mobile  |       14,332 |         184,318 |         26,167 |        348,494 → 348,491 |     −3 |
| Product / desktop |       14,332 |         184,318 |         26,167 |        348,494 → 348,491 |     −3 |

Scripts transfer **0 / 2 / 2 fewer bytes** on home/catalog/product respectively. HTML transfers **6 more / 2 fewer / 1 fewer bytes**. CSS remains **14,171 transferred / 72,756 decoded bytes**. Images, font bytes and other transfer are unchanged. These small measured byte differences do not establish the cause of the timing changes.

Historically, **06:41 versus 05:44** increased script transfer **3,194 / 3,353 / 3,189 bytes** and full-page transfer **3,189 / 3,346 / 3,024 bytes** on home/catalog/product. Its decoded scripts grew 3,353 bytes per route, with unchanged CSS/images/fonts. Those older increases remain in the archived 06:41 analysis; they are not current-pass deltas.

Every sample requests exactly the same three fonts once, totaling **104,527 transferred bytes/page**:

| Font                 | Body bytes | Transfer bytes |
| -------------------- | ---------: | -------------: |
| Noto Sans Arabic 400 |     45,492 |         46,408 |
| Noto Sans Arabic 700 |     46,720 |         47,636 |
| PrimeIcons subset    |      9,568 |         10,483 |

The subset remains **`/media/primeicons-subset-E2J67QVD.woff2`**, SHA-256 **`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`**. All six samples request only this PrimeIcons WOFF2, with no original WOFF2/EOT/WOFF/TTF/SVG fallback request. Original dependency/fallback files remain on disk. Current Noto/hero public and dist hashes, reviewed/emitted icon hashes, font body lengths, status 200 and exact request counts all passed verification.

Historically, subsetting saved **25,580 body bytes (72.78%)** versus the original 35,148-byte WOFF2. The 04:23 pass established a 25,581-byte transfer reduction against 03:19; there is **no additional font saving here**. All 54 required glyphs, outlines/metrics/hints and 22 name-record values remain preserved, though FontTools repacks name-table storage. `npm run icons:verify` checks coverage/dynamic bindings/hashes before normal builds. Visual limits remain in [PrimeIcons maintenance](../scripts/primeicons.md). Noto's older 6,856-byte metadata saving and complete coverage remain documented in [storefront assets](../scripts/storefront-assets.md).

## HTTP cache verification after timing

At **07:45:59.988–07:46:00.039 UTC**, after Chrome closed, the subset returned **200**, `font/woff2`, exactly **9,568 bytes** and the expected hash, with `Cache-Control: public, max-age=31536000, immutable`. Its ETag request returned **304 with an empty body** and the same policy. The [new HTTP record](../artifacts/primeicons-http-verification-2026-09-17T07-45-59.988Z.json) is separate from timing; no verification requests ran during Lighthouse.

The [06:46 subset check](../artifacts/primeicons-http-verification-2026-09-17T06-46-56.511Z.json), [06:03 subset check](../artifacts/primeicons-http-verification-2026-09-17T06-03-14.258Z.json), [05:14 subset check](../artifacts/primeicons-http-verification-2026-09-17T05-14-49.491Z.json), [04:25 subset check](../artifacts/primeicons-http-verification-2026-09-17T04-25-19.059Z.json), [03:20 eight-URL Noto/hero/alias/original-font check](../artifacts/storefront-asset-cache-verification-2026-09-17T03-20-55-919Z.json) and [original record](../artifacts/storefront-asset-cache-verification.json) remain historical. Other URLs were not re-requested in this post-pass check. Their current source/dist hashes were verified. Local headers do not establish deployed CDN behavior or repeat-visit speed.

## Remaining bottlenecks and limits

Home mobile has the slowest simulated LCP, **3,598.5 ms**, and its speed index regressed substantially. The hero remains discoverable, eager and high priority. Its observed LCP breakdown is **333.9 ms TTFB, 13.1 ms resource delay, 10.0 ms load and 1,292.5 ms render delay**, versus **62.2 / 13.7 / 13.5 / 264.8 ms** in the preceding sample. Main-thread style/layout is **530.4 ms** and script evaluation **280.2 ms**, versus **544.4 / 316.3 ms** before. The longer observed render interval does not, by itself, identify its source or explain a repeatable regression. Observed durations and simulated paints use different models and must not be added or treated as identical measurements.

Catalog mobile records **498.1 ms style/layout**, **367.6 ms script evaluation** and **183.5 ms observed render delay**, versus **452.0 / 340.2 / 177.6 ms** before. Product mobile records **411.5 / 341.5 / 189.4 ms**, versus **351.0 / 293.5 / 152.1 ms** before. Their simulated LCP improved while these observed durations increased. Desktop catalog still selects a secondary lazy phone-stand image with automatic priority; its observed resource delay is **133.5 ms**, versus 182.0 ms before. Earlier eager-loading trials did not establish a consistent benefit.

Unused-JavaScript estimates range **28,040–29,532 bytes**. Detailed forced-reflow and other insights remain in the current analysis. These estimates are not additive or proof of safe removal. No source-level cause is established by this one sample per device.

The historical home-card incremental-hydration experiment failed first purchase interaction in both candidate timed samples and the separate early click/Enter gates, with mixed cold timing. It was rejected and completely restored before the 05:44 baseline pass. It does not establish a universal Angular limitation. The baseline and candidate each passing the same unit suite did not supersede that browser failure. Exact diagnostic results, gate limitations and restoration evidence remain in [performance experiments](performance-experiments.md#home-card-incremental-hydration--rejected-17-september-05490552-utc).

Retained actual-throttling traces from that earlier control place the first module evaluation after hero LCP, while two large layouts precede it. They support investigating layout/font delivery, not attributing those particular paint delays to module evaluation. The prepared same-Noto inlining candidate was **not run**: offline calculation showed **93,366 extra Brotli HTML bytes on every repeat full-document load**, exceeding the chosen repeat-byte limit. This structural rejection establishes neither a measured timing gain nor a browser failure. [The complete reasoning](performance-experiments.md#same-noto-font-bytes-in-initial-html--rejected-before-browser-execution) preserves the calculation and trace limits.

Prior modulepreload, containment, normal-letter-spacing and eager-image trials did not justify adoption; containment introduced incorrect scroll geometry. A larger same-version variable font was rejected. Evidence remains in [performance experiments](performance-experiments.md), [earlier speed-index investigation](performance-investigation-0006.md) and [scrollbar stability](storefront-scrollbars.md). No diagnostic retake followed this complete canonical pass.

## Historical cold-font comparison — Tajawal not adopted

After 01:21, frozen `main-O65VYLKE.js` / `styles-DWJFAQFT.css` measured 24 mobile navigations using actual CDP throttling, four AB/BA/BA/AB pairs per route. These differ from simulated Lighthouse and later builds. Tajawal with Noto fallback reduced font transfer **135,754→54,640 bytes**, but home/catalog CLS increased in every pair: medians **0.018823→0.102797** and **0.019235→0.185849**. Timing was mixed, including worse home TBT. The treatment was rejected.

A proxy shutdown error interrupted after sample 21; only three unstarted samples continued against verified frozen bytes. Saved evidence confirmed **24 complete measured/post-check records**, correcting an earlier conservative estimate. Catalog pair 4 retains its **175.608-second interruption gap**. All measurements/errors/geometry limits remain in [cold-comparison-results.md](../artifacts/font-research-tajawal/cold-comparison-results.md).

## Reproduce a subsequent checkpoint

Build and start the preview with the isolated API ready. Normal builds run icon coverage verification first. Release competing jobs, stop development, and archive existing reports and build identities before a new full pass:

```powershell
npm run build
node scripts/serve-production.mjs
```

In a separate shell after readiness, run the standard six-sample pass once:

```powershell
node scripts/audit-performance.mjs
```

Defaults are preview port 4300 and API port 4000. Explicit local overrides are `STORE_AUDIT_BASE_URL`, `STORE_API_ORIGIN`, `STORE_PREVIEW_PORT` and `CHROME_PATH`. Routes are `/`, `/products` and `/products/templar-knight-phone-and-tablet-holder`. Retain all six report pairs and summary. On interruption, preserve the sample and coordinate only unstarted samples; never silently replace failed/slower measurements.

The current analyzer accepts the exact 21-entry archive format. Its read-only preflight can recheck this build without rewriting results:

```powershell
node artifacts/performance/analyze-guest-tracking.mjs --baseline=baseline-2026-09-17-0641 --identity=current-0731-build-identity.json --checkpoint=0731 --preflight
```

After a newly authorized complete pass, omit `--preflight` and supply that pass's approved identity/checkpoint. Analysis writes `analysis-HHMM.json`, `current-HHMM-sha256.json` and `verification-HHMM.json`; it refuses existing outputs to preserve history. It validates current/baseline identities, exact archive/report counts and hashes, canonical settings/version, summary timestamps, font counts/body sizes and total-byte consistency. After timing only, `node artifacts/performance/verify-primeicons-http.mjs --verification=artifacts/performance/verification-0731.json` produces a separately timestamped HTTP record.

Production conclusions require the actual HTTPS host, CDN/cache behavior, API latency and field data. This single local pass establishes neither a repeatable timing gain nor a performance target.
