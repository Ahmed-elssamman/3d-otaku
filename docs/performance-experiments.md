# Follow-up performance experiments

These investigations follow the six-sample Lighthouse checkpoint in [performance-audit.md](performance-audit.md). Diagnostic timings are not substitute Lighthouse scores.

## Noto face deduplication — not adopted, 17 September 07:40–07:41 UTC

One cold baseline/candidate pair used frozen **06:41** output and the same actual mobile throttling as the optional-font diagnostic. The candidate removed exactly the two duplicate Noto declarations from full CSS, reducing it **72,756 → 71,990 bytes** while preserving initial critical declarations, `swap`, font files, preloads and all other styles. Separate raw-document and native navigation gates checked that each document retained the necessary initial faces. [The complete results](../artifacts/font-face-deduplication/RESULTS.md) retain all observations and verified hashes for **24 raw payload files**.

FCP improved **1,676 → 1,516 ms**, LCP **2,160 → 1,868 ms** and total layout **1,557.153 → 1,323.559 ms**, but long tasks increased **1,691 → 1,743 ms**. Most favorable layout differences occurred before full-CSS activation and cannot be credited to removing duplicate registration. The target persisted: both arms recorded **611 `Fonts changed` invalidations** after activation, and the following layout worsened **53.805 → 79.894 ms**. Both retained the same raw **0.018792** shift marked `hadRecentInput` before deliberate interactions. No stage 2 or source adoption followed this mixed pair.

Both samples and the planned cart click/Enter, return, native cart/login and JavaScript-disabled SSR gates passed. Font bytes, actual Noto glyphs and final geometry matched; the candidate ended with one Noto entry per weight. There were no timed API calls, network errors, business writes or console errors. Expected post-navigation cancelled public GETs and JavaScript-disabled CSP blocks were classified narrowly before execution and retained. This does not revise the earlier optional experiment's failed checks.

The face inventory also identified a byte-identical PrimeIcons declaration in critical and full CSS, leaving two PrimeIcons entries in both arms. Its presence before the global invalidation suggests a further isolated hypothesis, but does not prove the duplicate caused it: other full stylesheet rules activate simultaneously. The final **07:31** canonical Lighthouse pass was separate and kept application font delivery unchanged.

### Removing all three full-CSS faces — rejected before execution

Follow-up preparation found that the home SSR document contains all three initial faces, but frozen `index.csr.html` contains only the two Noto faces. The retained native cart/login results confirm one PrimeIcons entry supplied by full CSS. Removing all three full-CSS faces while leaving initial documents unchanged would remove the icon font from native CSR entries. The candidate therefore fails its document-preservation requirement structurally; no snapshot capture, preview, browser comparison or source change followed. The [rejected preparation record](../artifacts/all-font-face-deduplication/RESULTS.md) retains the native-versus-SSR evidence. Adding an initial face or serving route-specific styles would be a different treatment, and was not attempted.

## Complete optional-font policy — not adopted, 17 September 07:10–07:11 UTC

One cold mobile baseline/candidate pair used frozen **06:41** output, actual 4× CPU/network throttling and fresh browser contexts. The candidate changed only the two Noto `font-display` descriptors in both critical and full CSS, retaining the exact fonts and preloads. The earlier critical-only optional experiment did not isolate this policy. [Chrome's preload/optional explanation](https://web.dev/articles/preload-optional-fonts?hl=en) and [CSS Fonts 4](https://drafts.csswg.org/css-fonts-4/#font-display-desc) supported testing the complete policy, without guaranteeing font availability or a modern 100 ms timer.

FCP worsened **1,484 → 1,576 ms**, LCP improved **1,900 → 1,740 ms**, total observed layout worsened **1,397.462 → 1,503.262 ms**, and long tasks increased **1,539 → 1,682 ms**. The optional arm moved a large layout after its LCP; it did not remove that work. Both ended with identical Noto glyphs and geometry. Each raw observer retained a **0.018792** shift marked `hadRecentInput` before deliberate test interactions; reported CLS zero must not be interpreted as no late shift.

Both cart click/Enter and return assertions completed. The runner nevertheless exited 1 because strict post-timing request checks caught aborted public GETs during navigation in both arms. Timed font requests had no failures; no sample was retried or discarded. The result does not justify adoption or stage 2. [Full results](../artifacts/optional-font-diagnostic/RESULTS.md) retain both timings, screenshots, limitations and verified hashes for all twenty raw output files. Application font delivery remains unchanged.

Artifact analysis also found duplicate Noto declarations in the initial critical CSS and full stylesheet. Full-CSS activation precedes 611 font invalidations in both arms; this motivated the separate deduplication experiment above and cannot explain the baseline's earlier 277 ms layout. The canonical **06:41** pass was independently archived with **21 verified payload files** in [baseline-2026-09-17-0641](../artifacts/performance/baseline-2026-09-17-0641/archive-verification.json) before the subsequent admin build.

## Same Noto font bytes in initial HTML — rejected before browser execution

**Unconditional font inlining was rejected on its repeat-document transfer cost.** The proposed diagnostic was prepared and its four scripts passed syntax checks, but no build snapshot, candidate server, browser navigation or timing comparison was executed. This is a structural rejection, not a measured browser failure or performance improvement. Application font delivery remains unchanged.

The hypothesis came from the retained **05:44 build** control traces in `artifacts/home-hydration-diagnostic/runs/2026-09-17T05-49-23.063Z/`, not new measurements. Run 1 / run 4 spent **1126 / 1184 ms** in the first full-document layout. Once the existing Noto faces became usable at roughly **1653–1669 ms**, another layout dirtied **595 of 613 objects** and took **366 / 341 ms**. The hero image had finished downloading at **577 / 546 ms**, with final image LCP at **2127 / 2113 ms**. First Angular module evaluation began later, at **2908 / 2881 ms**. Thus script splitting cannot explain the pre-LCP layout work in these particular cold runs. These traces lack detailed glyph-shaping subevents: their layout durations are not measurements of pure Arabic shaping, and the font/layout ordering alone does not prove how much work early font availability would remove.

The actual SSR order already has both Noto font preloads before critical CSS, followed by the asynchronous full stylesheet. Both the critical CSS and full stylesheet contain the same two face definitions. The candidate would have put the **exact existing WOFF2 bytes** into the critical definitions, removed the two preload tags and duplicate full-CSS faces, given that derived stylesheet a distinct content-hash identity, and explicitly allowed font `data:` URLs in CSP. Family, weights, Unicode ranges, glyphs, content and geometry would remain the same. It was not a font replacement, extra preload or content-hiding proposal.

Offline calculation used the exact retained `baseline-ssr.html` and font files, verifying their SHA-256 filenames: **45,492 bytes regular + 46,720 bytes bold = 92,212 bytes**. Compression used the preview's Brotli quality 5 and gzip level 6. These are compressed **body sizes**, excluding response/request headers, not measured browser transfers.

| Offline payload                                                 | Existing delivery | Proposed inline delivery | Difference |
| --------------------------------------------------------------- | ----------------: | -----------------------: | ---------: |
| HTML, uncompressed bytes                                        |            117759 |                   240203 |    +122444 |
| HTML, Brotli bytes                                              |             20896 |                   114262 |     +93366 |
| HTML, gzip bytes                                                |             23812 |                   118181 |     +94369 |
| HTML + full stylesheet + two Noto fonts, cold Brotli body bytes |            126304 |                   127215 |       +911 |
| Same three resource groups, cold gzip body bytes                |            130087 |                   131983 |      +1896 |

Cold aggregate bytes are close because inlining moves the same font payload into HTML. However, HTML responses are **`no-store`**, while the existing separate font files are immutable and reusable. Every subsequent full-document request would carry approximately **93 KB extra Brotli HTML**, regardless of whether CPU/layout improved. This exceeds the proposed **10 KiB repeat-body regression limit** without needing the planned twelve timing navigations. It also moves those bytes ahead of body/image discovery. Ordinary client-side route transitions do not request another document, so this penalty is specifically for repeat full navigations, reloads and new document loads; no repeat LCP value was measured or inferred.

The unexecuted procedure and scripts remain under `artifacts/same-font-delivery/` for auditability. No favorable timing is assumed and no adoption is authorized. The preceding canonical pass was independently archived at **2026-09-17T06:32:25.994Z** in `artifacts/performance/baseline-2026-09-17-0544/`: **13 reports + 4 metadata files + 4 original compiled identity files**, all **21 payload files SHA-verified**, with originals retained and `archive-verification.json` recording the copy. Its build is `main-NOO3XGHS.js` / `styles-LJHQOUSH.css`, **2026-09-17T05:44:24.928Z**.

## Home card incremental hydration — rejected, 17 September 05:49–05:52 UTC

**The candidate was not adopted.** It showed inconsistent cold timing changes and failed the first purchase interaction in both timed candidate runs and the separate early-click/Enter checks. No retakes followed. The exact candidate source patch was reversed before the experiment; afterward the original 05:44 production output was restored from its verified snapshot and the normal preview restarted. These diagnostic results are not Lighthouse scores or a replacement canonical pass.

The control includes the guest-tracking feature: **`main-NOO3XGHS.js` / `styles-LJHQOUSH.css`**, built **`2026-09-17T05:44:24.928Z` in 9.035 seconds**, initial **484.86 kB raw / 130.03 kB estimated transfer**. The candidate is **`main-2CNDJRYV.js` / `styles-LJHQOUSH.css`**, built **`2026-09-17T05:48:40.402Z` in 10.476 seconds**, initial **492.14 / 132.68 kB**. Both passed 256 Angular tests; the candidate's 42-file suite passed in 6.90 seconds. The API remained frozen throughout. Snapshot verification covered all **193 control / 201 candidate compiled files**, matching static asset bytes and source differing only in the two intended files.

The candidate replaces `withEventReplay()` with the public Angular 21 `withIncrementalHydration()` provider and wraps each of the six home cards in `@defer (on immediate; hydrate on viewport; hydrate on interaction)`. Angular's provider includes replay; ordinary `on immediate` is suppressed for existing SSR blocks and supports CSR-created blocks. Hero, fonts, CSS, public data and card implementation were unchanged. The hypothesis concerned delayed card initialization, not removal of the first layout of server-rendered Arabic text.

The four actual timing navigations ran **control, candidate, candidate, control**, starting at **05:49:24.315, 05:49:35.931, 05:50:18.393 and 05:51:00.462 UTC**. Both arms used the unchanged copied preview server at the same loopback origin, equal SSR warm-up, fresh browser contexts, disabled browser cache, 390×844 mobile viewport, DPR 2, CPU slowdown 4× and real network throttling: 150 ms latency, 1638.4 × 1024 / 8 download bytes/s and 675 × 1024 / 8 upload bytes/s. No document/body substitution or instant fulfilled resource was used. Cold metrics were captured before interaction; all four raw traces, network records and initial screenshots remain retained.

| Actual cold metric                              | Pair 1 control | Pair 1 candidate | Difference | Pair 2 control | Pair 2 candidate | Difference |
| ----------------------------------------------- | -------------: | ---------------: | ---------: | -------------: | ---------------: | ---------: |
| FCP, ms                                         |           1664 |             1776 |       +112 |           1664 |             1592 |        −72 |
| LCP, ms                                         |           2128 |             2260 |       +132 |           2116 |             2060 |        −56 |
| Long-task duration, ms                          |           2208 |             2399 |       +191 |           2308 |             2214 |        −94 |
| Observed long-task excess over 50 ms, summed ms |           1908 |             2099 |       +191 |           2008 |             1914 |        −94 |
| Resource Timing transfer bytes                  |         287477 |           285858 |      −1619 |         287477 |           285858 |      −1619 |
| CLS                                             |              0 |                0 |          0 |              0 |                0 |          0 |

The long-task figures are observed browser measurements, **not Lighthouse simulated TBT**. Cold transfer decreased by 1619 bytes while the estimated initial build increased by 7.28 kB raw / 2.65 kB compressed; neither figure establishes a user-visible benefit. Initial geometry matched, all six candidate cards remained unhydrated below the viewport, and the cold windows had no browser API reads, console/hydration errors or attempted writes. The two pairs are not a median or evidence that the favorable second pair outweighs the first pair's regressions.

The unmodified scroll-to-last-card/click check acknowledged one added item in **303.5 ms and 297.9 ms** on the control. Both candidates instead exceeded the **30-second cart-acknowledgement timeout**. Separate gates withheld the real component request, activated a button once, then continued the original request: candidate click and Enter each remained at **quantity 0 rather than 1** after five seconds. The corresponding control gates added exactly once before reaching a later unrelated request-classification failure. These failures justify rejecting this exact candidate; this experiment does not establish the underlying Angular/runtime cause or a universal limitation of incremental hydration.

Fourteen separate correctness gates ran after the cold samples. Both arms passed saved-cart quantity 99, the pre-listener image-error fallback, and native product-link Enter before hydration. The 96 + 2 details assertions reached the expected 98 and truthful feedback on both arms before a later request-classification failure. JavaScript-disabled SSR text, six cards, complete styles and geometry matched, but those gates were marked failed because Chromium reported intentionally disabled module-preload requests with reason `csp`; no console CSP error accompanied them. Later click/Enter/details return gates retained aborted featured/categories GETs (and one control detail GET), despite rendered results. The runner did not instrument response completion sufficiently to distinguish teardown/cancellation from a functional problem. Therefore it does **not** claim every CSR, settled-geometry or network gate passed; zero recorded extra blank frames alone does not establish a clean return-path result. Any future diagnostic would first need that bounded harness classification/settling repair, rather than weakening business assertions or rerunning for better timings.

All evidence is in `artifacts/home-hydration-diagnostic/runs/2026-09-17T05-49-23.063Z/`; `analysis.json` completed at **05:52:59.726 UTC**. The artifact `PLAN.md` retains the procedure, API evidence, known harness limits and rejection. Browser/owned port 4390 were closed; the runner attempted no writes and did not restart the API. The earlier complete 05:13–05:14 canonical pass is preserved independently in `artifacts/performance/baseline-2026-09-17-0513/`: **13 reports plus metadata/four exact build files, 21 copied files hash-verified**, originals retained. No candidate score or complete functional pass is claimed.

## Additional module preloads: not adopted

On 16 September 2026 at 22:11 UTC, three alternating mobile pairs compared the same SSR home document with and without three additional build-derived static-import preload hints. Both arms used identical document interception, original CSP/content/cache keys, fresh browser contexts, disabled cache, 412×823 viewport, DPR 1.75, CPU slowdown 4× and network limits of 150 ms / 1638.4 Kbps download. Source and production artifacts were unchanged.

| Median                            | Baseline | Additional hints |
| --------------------------------- | -------: | ---------------: |
| FCP                               |  1576 ms |          1624 ms |
| LCP                               |  1944 ms |          2040 ms |
| Sum of long-task time above 50 ms |   610 ms |           631 ms |

The missing imports started around 68 ms instead of 2238 ms, but paint did not consistently improve. Paired LCP differences were −52, +32 and +204 ms. No hint implementation was adopted on this evidence. Long-task excess here is not Lighthouse TBT; interactive readiness was not measured.

All six runs retained the six product cards and guest account link, with no browser API requests or console/CSP errors. Every run recorded the same canceled favicon request; the broad raw validation flag is preserved and explained rather than deleting those samples. Full raw pairs, network/paint entries and analysis are in ignored `artifacts/modulepreload-diagnostic/`.

## Zoneless bootstrap: verified in the local production build

The repository uses Angular 21.2.23. [Angular 21's zoneless guide](https://v21.angular.dev/guide/zoneless) identifies this as the default mode and documents signal/listener notifications, reactive-form bridges and SSR pending-task requirements. The explicit Zone.js override was replaced with `provideZonelessChangeDetection()`, the Zone.js polyfill entry removed and the dependency uninstalled. The dependency audit reported zero known vulnerabilities.

Source review found signal-based asynchronous UI updates and form-event bridges in the active storefront/admin components. No application subscription relies on `NgZone.onStable` or related stability events. Viewer `NgZone.run` calls remain compatible. Angular HTTP/router tasks use pending-task tracking; installed PrimeNG 21.1.10 uses signals or explicit change notifications in the examined controls, dialogs and toast paths.

The production build passed at 22:32:35 UTC (`main-ZIXSIPIB.js`). Initial browser payload fell from 518.61 to 479.89 KB raw and from 139.68 to 127.75 KB estimated transfer. All 83 Angular tests across 22 files passed; asynchronous manufacturing form/HTTP tests await Angular stability without forcing post-action change detection. All 52 Chrome desktop/mobile project cases passed together in 2.0 minutes, including initial SSR content, transfer-cache reuse, slow-route hydration, session restoration, direct-cart edits, checkout, contact submissions and administrator operations.

The subsequent complete six-sample Lighthouse pass measured home/catalog/product performance at 86/90/89 mobile and 99/100/100 desktop; other categories scored 100 throughout. These are individual laboratory samples, not proof that the entire timing difference was caused by removing Zone.js. Exact metrics and comparison with the preserved 22:00 baseline are in [performance-audit.md](performance-audit.md).

## Portrait gallery source sizing: verified at DPR 2

The prior mobile image audit found a 400×533 image used for content rendered around 53×70 pixels. The gallery's fixed `sizes="80px"` overestimated the contained portrait width and selected a larger source at elevated device density. Gallery views now calculate the contained width from the image aspect ratio and the existing 4.5rem thumbnail button, and expose accurate native width/height metadata.

The mobile browser project now uses DPR 2. The existing SSR gallery scenario checks the actual selected portrait thumbnail against API variant metadata instead of asserting the old size string. It passed on desktop and mobile in the full 52-case production-preview run, including native dimensions, successful decoding, no unexpected hydration/security errors and transferred API reuse. The prior audit estimated no LCP savings for this thumbnail, so it is not presented as a solution to mobile LCP.

The subsequent product-mobile Lighthouse sample reported no image-delivery waste, compared with 16,225 bytes in the preserved baseline. Its measured image transfer fell from 52,711 to 26,167 bytes, including response overhead. This verifies the resource-selection improvement; it does not establish a causal LCP gain from the thumbnail change.

Gallery display also omits aliases with the same generated detail-image content hash, preserving the first source and every original catalog/media record. Three unit cases cover identical detail content, distinct detail images with equal thumbnails, and missing/ordinary metadata. They passed in the full 83-test suite; browser coverage does not claim to inspect every affected product.

## Home card containment: rejected after geometry checks

A cold mobile trace on unchanged `main-ZIXSIPIB.js` attributed most home layout work to initial text shaping and later font updates, before Angular hydration. Under actual CPU slowdown 4×, its first full-document layout took 1167 ms; the post-hydration layout took about 1.4 ms. This identifies distant card text as work worth investigating, but does not establish a safe implementation.

The final bounded trial used two matched pairs, alternating baseline/treatment order. Both arms received the same SSR document snapshot, original CSP/cache headers and transfer-cache payload, with identical document interception, fresh contexts and disabled HTTP cache. Mobile settings were 412×823, DPR 1.75, CPU 4× and actual network limits of 150 ms latency / 1638.4 Kbps download / 675 Kbps upload. The development server was stopped; no competing browser, build or test job ran. These are diagnostic timings, not Lighthouse scores or field measurements.

Only the treatment received these temporary rules:

```css
.home-sections app-product-card {
  height: auto;
  display: flex;
  content-visibility: auto;
  contain-intrinsic-size: auto 560px;
}
.home-sections app-product-card > .product-card {
  height: auto;
  flex: 1;
}
.home-sections > section:not(:first-child) {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
```

The targets were six card hosts, their direct articles and the category/custom/FAQ sections. Articles retained their existing column flex layout. The intrinsic dimensions were experimental estimates, not a validated responsive sizing policy.

| Pair / order            | FCP baseline → treatment | LCP baseline → treatment | Layout baseline → treatment |
| ----------------------- | -----------------------: | -----------------------: | --------------------------: |
| 1: baseline → treatment |           1268 → 1072 ms |           1636 → 1324 ms |               1225 → 990 ms |
| 2: treatment → baseline |           1248 → 1080 ms |           1548 → 1312 ms |               1212 → 940 ms |

Paint savings repeated, but both treatments retained the same transient geometry defect as the earlier containment attempt. Initial document height grew from **7355 to 8130 px**; the featured section grew from **3557.64 to 4276.52 px**. After jumping to and opening the FAQ, that section was still **4096.89 px**, 539.25 px too tall. Once the cards had been visited, geometry settled to the baseline: featured height 3557.64 px, document height 7424 px with the FAQ open, and mobile card/article heights 560.06 px. This is a temporary reservation/scroll-position problem, not permanently oversized cards.

Changing the host/article from `height:100%` to auto height with flex did not eliminate the defect. The trials therefore do **not** establish `height:100%` as its sole cause. Initial CLS remained 0–0.00000356, but that small score does not negate the observed page-height changes as content becomes rendered.

All four contexts retained six cards and passed FAQ opening, hero-link keyboard focus and last-card purchase using Enter, with the header cart count updating to one. No API writes, duplicate browser API reads, horizontal overflow or page/console/CSP errors occurred. After resizing the same loaded pages to 1440 px and visiting the cards, both arms had identical 565.06 px card/article heights in two equal-height rows, featured height 1263.02 px and document height 4013 px. This was a resize/geometry check, not a cold desktop performance sample.

**The tested rules were rejected and production CSS remains unchanged.** The measured opportunity does not justify shipping incorrect intrinsic reservation. No additional containment experiment followed these two pairs. All samples, including canceled favicon requests, are retained in ignored `artifacts/home-layout-diagnostic/cards-flex.results.json`, the four associated traces/screenshots and `cards-flex-readme.md`; earlier trials remain preserved separately. The browser was closed and released before integrated frontend verification resumed.

## Normal Arabic letter-spacing: no consistent performance benefit

Exactly two matched pairs ran in baseline/treatment then treatment/baseline order on **16 September 2026, 23:22:14–23:22:46 UTC**, against unchanged `main-72MNKU5Z.js` / `styles-3U6TAYQR.css`. Both arms received the same SSR snapshot, original CSP/cache headers and transfer-cache payload through equivalent document interception. Chrome 152 used fresh contexts, cleared/disabled HTTP cache, blocked service workers, 412×823 at DPR 1.75, actual CPU slowdown 4× and actual network latency 150 ms with throughput 1638.4×1024/8 bytes/s down and 675×1024/8 bytes/s up. Development port 4200 was stopped and no competing browser/build/test job ran. OS caches and ordinary timing variation remain uncontrolled; detailed tracing adds overhead.

The temporary treatment changed only these spacing rules:

```css
html:lang(ar) body,
html:lang(ar) :is(h1, h2, h3, h4, h5, h6),
html:lang(ar) .hero-copy h1 {
  letter-spacing: normal !important;
}
```

Computed styles confirmed the treatment remained effective after hydration: sampled Arabic body text and every heading resolved to `normal`. Baseline hero/body/card-heading spacing was −1.624/−0.16/−0.4896 px. Explicit Latin header/footer marks and the English caption retained their original spacing, fonts and dimensions. Font files, weights, font-display policy and containment were unchanged.

| Pair / order         | FCP baseline → normal | LCP baseline → normal |  Total layout, ms | Text shaping, ms |
| -------------------- | --------------------: | --------------------: | ----------------: | ---------------: |
| 1: baseline → normal |        1308 → 1244 ms |        1608 → 1544 ms | 1204.73 → 1195.42 |  763.51 → 788.95 |
| 2: normal → baseline |        1308 → 1304 ms |        1608 → 1656 ms | 1231.45 → 1274.39 |  799.18 → 851.88 |

The first large layout became slightly shorter in both pairs, but total shaping increased in both. Pair 2's LCP worsened by 48 ms and total layout increased by 42.94 ms. All four traces contain 547 `InlineNode::ShapeTextIncludingFirstLine` events. Home hydration completion improved from 3199 to 3151 ms in pair 1 but worsened from 3222 to 3268 ms in pair 2. These actual diagnostic timings are not Lighthouse scores, simulated TBT or a statistical benchmark. They do **not** establish nonzero letter-spacing as the cause of the expensive shaping.

Geometry and functional checks passed in all four contexts. Document height remained 7355 px initially, after opening/closing the FAQ and after visiting every card; section positions/heights remained stable. All six mobile cards stayed 560.06 px high. Resizing the same loaded pages to 1440 px produced a 3971 px document, two equal-height rows of 565.06 px cards and 44 px purchase buttons in both arms. This is a resize check, not a cold desktop performance sample.

Sampled text, wrapping, text-block heights, weights and platform-font observations matched. The featured heading widened from 271.75 to 274.73 px without wrapping. Noto Sans Arabic retained the same 30 hero, 111 body and 32 card-title glyphs. Reviewed paired hero/card and FAQ/desktop screenshots showed connected Arabic, readable diacritics and no missing-glyph boxes or clipping. Keyboard Enter opened/closed the FAQ, the hero link received focus, and Enter on the last card added one item to the local cart. All hydration markers were consumed, with no API reads/writes, horizontal overflow or page/console/CSP errors. Initial CLS was zero in three runs and 0.00000397 in the second treatment. Every run retains one canceled `favicon.ico` request (`net::ERR_ABORTED`), disclosed separately from those successful checks.

**No letter-spacing change was adopted as a performance fix.** The browser was closed after the four authorized navigations; no further trial followed. All four raw traces, 16 screenshots, results, analysis and the procedure remain in ignored [artifacts/arabic-letter-spacing-diagnostic/](../artifacts/arabic-letter-spacing-diagnostic/). The complete six-sample Lighthouse pass at 23:11 remains unchanged.
