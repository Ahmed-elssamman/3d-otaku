# Investigation following the 00:06 performance pass

No application change was adopted. The catalog experiment consistently made two visible desktop images arrive earlier, but FCP/LCP gains were inconsistent and two of three mobile pairs regressed. The six Lighthouse scores remain **87/87/90 mobile and 99/100/100 desktop**, with the full results in [performance-audit.md](performance-audit.md).

## Preserved checkpoint and source findings

Before the experiment, the complete 00:06 pass was copied to [baseline-2026-09-17-0006/](../artifacts/performance/baseline-2026-09-17-0006/). All 13 source report hashes and all 18 copied report/metadata files were verified; originals remain untouched. `archive-verification.json` records the copies. The build is `main-XUOZCJNX.js` / `styles-LJPYLT3M.css`. The separately copied `corrected-delivery-identity.json` describes an older corrective checkpoint and is not current server evidence.

**Home mobile's speed-index increase includes an observed paint delay, not an identified slow download.** Against 23:11, simulated speed index rises from 2,222.6 to 3,189.8 ms (+967.2), while observed first paint/FCP/LCP move from 333 to 1,389 ms. Observed speed index moves from 337 to 1,386 ms. The current filmstrip is still blank at 1,125 ms and shows content at 1,500 ms; the baseline shows content at 375 ms. Frames extracted from the retained reports are in [diagnostic-0006/](../artifacts/performance/diagnostic-0006/).

The current hero response ends around 99 ms, the Arabic fonts around 95 ms, CSS around 115 ms, PrimeIcons around 259 ms and the last home route scripts around 310 ms. Reported main-thread work rises only 100.5 ms (1,020.3→1,120.8 ms), including +41.5 ms style/layout and +15.3 ms script evaluation. Those report values include Lighthouse CPU scaling and are not a continuous raw event timeline. The gap does not support assigning the additional second to the font-file rename, a network request or a specific application function. Home source has no new visibility/opacity gate or page animation; its hero already has native dimensions and high priority.

**Catalog mobile's additional work is mostly attributed to shared framework execution.** Main-thread work rises 960.3→1,101.6 ms; script evaluation rises 308.8→405.4 ms (+96.6), while style/layout rises 405.9→432.7 ms (+26.8). The boot-up audit attributes 296.0→391.7 ms of scripting to the same `chunk-NAAECZDF.js`, whose name and byte size are unchanged. Application work called through that shared runtime cannot be separated from this URL-level report. Observed first paint actually moves 241→227 ms while simulated TBT rises 51.5→127 ms. Neither the public API chain nor a new slow image response explains this: browser API requests remain zero, and the mobile LCP image's observed load delay/duration are about 10/9 ms.

The audit script saves reports, not raw Chrome traces or CPU profiles. Its long-task audit uses simulated task timings here; those start times cannot be overlaid on observed network timings to invent a call-stack diagnosis. A future raw scheduling/CPU trace would be needed before proposing a home or catalog blocking-time source fix.

**The desktop image-loading gap has a concrete source.** `products-page.component.html` gives `priority` only to `$first`; `product-card.component.ts` uses that same flag for both eager loading and high priority. At desktop's three-column width, the second and third visible cards remain lazy. The 00:06 desktop catalog sample selects the third/samurai image as LCP; its request starts at 284.7 ms compared with 97.1 ms for the first image. This motivated the bounded experiment below.

The current description fallback does not explain excessive text shaping in these products. Stored catalog SSR contains **12 nonempty short descriptions, 83–103 characters each, 1,097 characters total**. Home requests a six-product subset of the same catalog. The potential `shortDescription || description` fallback is real source behavior, but these measured records do not exercise a long full-description fallback. Exact rendered text/counts remain in [ssr-description-lengths.json](../artifacts/performance/diagnostic-0006/ssr-description-lengths.json).

## Matched catalog experiment

Twelve navigations started between **2026-09-17T00:22:34.068Z and 00:24:16.061Z**, three pairs each on desktop and mobile, using unchanged production artifacts. Pair order was control/treatment, treatment/control, control/treatment for each device. The browser was closed after the final observation and its exclusive execution slot was released.

Both arms receive the **same saved SSR response through document interception**, preserving content, CSP and resource URLs. Response content-encoding/length are removed identically because the saved body is decoded. Treatment changes exactly two attributes: `loading="lazy"` becomes `loading="eager"` on card images two and three. Only the first card keeps `fetchpriority="high"`; the others keep `auto`. No API writes or authentication occurs.

Chrome 152 uses a fresh context with cleared/disabled HTTP cache per navigation, blocked service workers and the same browser process. Desktop is 1350×940/DPR 1, CPU 1×, 40 ms latency and 10,240 Kbit/s. Mobile is 412×823/DPR 1.75, CPU 4×, 150 ms latency, 1,638.4 Kbit/s down and 675 Kbit/s up. These are actual CDP network/CPU constraints, not Lighthouse simulation. Each run waits for route hydration, fonts, first-three image completion and at least eight seconds from navigation start. OS/process warm-up is uncontrolled; the first control run is retained.

One limitation matters: Angular's unchanged bindings restore images two and three to `loading="lazy"` during hydration. Their treatment requests have already started, so this experiment tests **early parser discovery**, not a permanently changed binding. It also reuses an intercepted document and therefore does not measure the real SSR response latency. No result should be substituted for a Lighthouse score.

| Device / pair | FCP control → eager, ms | FCP delta | LCP control → eager, ms | LCP delta | Long-task duration control → eager, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop / 1 | 400 → 304 | −96 | 400 → 304 | −96 | 0 → 0 |
| Desktop / 2 | 288 → 304 | +16 | 288 → 304 | +16 | 0 → 0 |
| Desktop / 3 | 292 → 296 | +4 | 292 → 296 | +4 | 0 → 0 |
| Mobile / 1 | 992 → 1,056 | +64 | 1,224 → 1,276 | +52 | 404 → 324 |
| Mobile / 2 | 1,148 → 1,088 | −60 | 1,496 → 1,304 | −192 | 385 → 430 |
| Mobile / 3 | 1,072 → 1,344 | +272 | 1,356 → 1,644 | +288 | 414 → 510 |

Desktop arm medians are **292→304 ms for both FCP and LCP**. Mobile medians are **1,072→1,088 ms FCP** and **1,356→1,304 ms LCP**, but mobile matched LCP deltas are **+52/−192/+288 ms**: the median matched delta is +52 ms. The favorable difference between mobile arm medians is not consistent paired improvement. Long-task duration sums all observed tasks over 50 ms during the fixed observation window; it is not Lighthouse TBT. Mobile median task duration rises 404→430 ms.

| Desktop pair | Third image request start, control → eager, ms | Third image response end, control → eager, ms |
| --- | ---: | ---: |
| 1 | 317.4 → 14.5 | 420.4 → 132.4 |
| 2 | 258.9 → 14.4 | 371.1 → 118.7 |
| 3 | 261.0 → 14.7 | 376.0 → 126.8 |

The third desktop image therefore finishes **249.2–288.0 ms earlier** in all three pairs. The second image also starts earlier in every pair. This is a consistent resource-discovery opportunity, but the **first card remains LCP in all twelve diagnostic loads**: the third-card LCP selection from the original Lighthouse sample does not reproduce. Desktop FCP/LCP worsen in two pairs despite earlier secondary images.

Final document/card geometry and the first-three selected image URLs match exactly within **all six pairs**, with no horizontal overflow. Desktop CLS is the same 0.000254329 in both arms; mobile CLS is 0–0.000003966. All twelve runs record **zero runtime/console errors, failed requests or browser API requests**, and no duplicate image URL request. Per-device resource transfer sums are identical between arms: 365,860 desktop and 319,430 mobile bytes. These Resource Timing sums exclude the intercepted HTML and differ from full Lighthouse page-byte totals. Native lazy-loading under these actual network conditions fetches eight images on desktop and three on mobile; it should not be equated with the original simulated audit's request set.

## Decision and evidence

**Do not adopt all-device eager loading from this result.** The mobile regressions and inconsistent desktop paint timings outweigh using a favorable isolated pair or arm median as proof. A future desktop-only responsive preload could target the demonstrated earlier availability of visible secondary images without adding mobile competition, but this experiment does not establish a consistent LCP benefit or justify another immediate run. Shipping functionality work proceeds with source and production image-loading policy unchanged.

All twelve raw JSON runs, twelve screenshots, both HTML arms, original CSP/conditions, analysis and the executable diagnostic remain under [catalog-priority/](../artifacts/performance/diagnostic-0006/catalog-priority/); the script is [catalog-priority.mjs](../artifacts/performance/diagnostic-0006/catalog-priority.mjs). No run, regression or failure was discarded. The earlier rejected modulepreload, containment, letter-spacing and variable-font trials were not repeated.
