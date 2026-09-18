# Fingerprinted storefront assets

`storefront-assets.manifest.json` pins the current Arabic 400/700 WOFF2 files
and fallback home image by byte length and SHA-256. The Noto static fonts now
total **92,212 bytes**, down from **99,068 bytes** after removing glyph-name
metadata; the hero remains unchanged at **5,786 bytes**. Font provenance and
SIL OFL remain in `public/assets/fonts/SOURCE.txt`, `optimization.json` and
`OFL.txt`. Fingerprinting the existing hero does not establish additional image
rights or product manufacturing evidence.

PrimeIcons now has a separate reviewed subset and manifest under
`src/assets/primeicons/`. Its WOFF2 body is **9,568 bytes**, down from **35,148**;
all 54 required icon glyphs retain their outlines/metrics. Angular fingerprints
the imported media URL. `npm run icons:verify` checks source/runtime coverage,
CSS behavior and hashes, and runs automatically through `prebuild`. The
three-asset `assets:verify` check below continues to cover Noto and the hero;
it is not the icon coverage check. Reproduction, licensing and visual limits
are documented in [primeicons.md](primeicons.md).

Live CSS, font preloads and the home fallback constant use a full SHA-256 before
the extension. The production preview gives only these selected fingerprinted
font/image paths a one-year immutable cache policy, in addition to its existing
Angular fingerprinted bundles/fonts. Unhashed aliases retain the one-hour policy
and remain available. Current aliases match the current manifest; all previous
fingerprinted font files retain their original bytes so cached documents can
still request them. The font-family, display, unicode-range and layout styles
are unchanged by this font update.

Run the read-only integrity check from the workspace root:

```powershell
npm run assets:verify
```

It checks all three filename hashes, bytes, compatibility aliases and the five
live source references. It does not start a server, download files or change
assets. Run it before building/deploying changes to these assets. Actual response
headers require separate verification after a new build and preview restart.

For future content changes, create a new hash-named file and update the manifest,
current alias and live references together. Never overwrite a deployed
fingerprinted URL with different bytes. Keep previous fingerprinted files and
unhashed compatibility URLs while older documents may still request them.
Cache lifetime alone does not reduce first-visit payload or prove a paint-time
improvement; its benefit concerns reuse on later visits.

## Reproduce the Noto metadata optimization

The source is `@fontsource/noto-sans-arabic@5.2.10`, font version 2.012, under
the unchanged SIL OFL 1.1. Both original fingerprinted files are retained as
reproducible inputs. `post` format 2 contains glyph-name indices and strings;
standard format 3 omits them while preserving the header's italic, underline,
fixed-pitch and memory fields. This is not glyph subsetting: all **1,340 glyphs**
and **1,226 mapped code points per weight** remain. The font-name/license table
is also unchanged; glyph names are distinct from the font family name.

Use a clean local Python environment, without optional HarfBuzz repacking:

```powershell
py -3.13 -m venv artifacts/font-optimizer-venv
& artifacts/font-optimizer-venv/Scripts/python.exe -m pip install -r scripts/font-optimizer-requirements.txt
& artifacts/font-optimizer-venv/Scripts/python.exe scripts/optimize-noto-fonts.py
```

The script pins fontTools **4.65.0** and Brotli **1.2.0**, disables HarfBuzz
repacking, and writes only to `artifacts/noto-optimized` by default. It verifies
the original and reviewed output sizes/hashes, every non-post table (normalizing
only `head.checkSumAdjustment`), and preserved post fields. It refuses a different
result or overwriting a fingerprinted output with different bytes. It does not
install or replace public assets automatically. Tooling and generated research
artifacts remain ignored; the script, requirements and provenance are tracked.

| Weight | Original bytes | Current bytes | Current SHA-256                                                    |
| ------ | -------------: | ------------: | ------------------------------------------------------------------ |
| 400    |         48,840 |        45,492 | `29eedd73b82f1a4e5cb000ddf880d574d717cf3077eb38609961ceb74436ef8f` |
| 700    |         50,228 |        46,720 | `5decb5a926d745a801dd107e032975730cb57ddbd0504e0530dd07da2f367b96` |

The **6,856-byte (6.92%)** reduction includes 176 bytes saved by unchanged
fontTools round-trip serialization; removing glyph-name storage saves another
6,680 bytes against that control. There is no claimed paint-time or Lighthouse
gain from these byte counts.

Static checks confirm complete cmap, shaping tables, glyph outlines, hinting,
advances/bearings and vertical metrics are preserved. Independent HarfBuzz WASM
14.4.0 comparisons matched **5,024** shaping cases across both weights, including
all mapped scalars, joining, marks, extended letters and numeric features.

A Chrome 152 visual gate completed **16 navigations** on frozen production
`main-GN52CWI4.js` / `styles-2XRGXKQX.css`, swapping only WOFF2 response bodies:
home/catalog/product/mixed-Arabic probe, desktop and mobile, original/candidate.
All eight pairs had identical measured geometry and platform font usage. Both
weights loaded with no font/CSP/console error, all keyboard/FAQ checks passed,
and **35 of 38 screenshot pairs were byte-identical**. The three retained
differences contain no identified font raster change: two show the same catalog
photograph region (maximum channel difference 7); the mobile FAQ capture differs
in two full-width device-pixel rows and 32 border-edge pixels above the FAQ text.
Image URLs/status/encoded byte lengths match, but image body hashes and final
fractional scroll positions were not captured, so a sole rendering cause is not
claimed. Every sample retains a canceled favicon request. The intercepted,
cache-disabled request counts are not production transfer measurements.

Full evidence and limitations remain in
[the font research record](../artifacts/font-research-noto/README.md), including
original screenshots and [pixel localization](../artifacts/font-research-noto/pixel-localization.json).
Source integration preserves all original font fingerprints and OFL. The frozen
visual gate is separate from the rebuilt-app verification below.

## Current integrated verification — 07:31 build

Production completed at **2026-09-17T07:31:16.112Z** in **10.070 seconds**,
producing `main-BOWHSGTL.js` / `styles-LJHQOUSH.css`, initial **488.14 kB raw /
131.20 kB estimated transfer**. The Noto, hero, icon subset and stylesheet bytes
are unchanged. No new font/rendering candidate was adopted.

Angular passed **291/291 tests across 44 files in 6.21 seconds**, test build
**07:30:14.358 UTC / 6.907 seconds**; backend passed **201/201**. The corrected
administrator browser scope passed **10/10 distinct device cases in 1.4 minutes**
on this build, with a real 13-second quota-reset wait. The first invocation's
one CDP response-body fixture failure and nine unrun cases remain retained.
[Product edit safety](../docs/admin-product-edit-safety.md) preserves that failure,
preceding compiler corrections, exact reports and the affected scope. This is
not a new complete storefront suite; earlier scopes remain dated below.

The first complete six-sample Lighthouse pass, with no retakes, ran at
**07:44:37.045–07:45:24.947 UTC** with development stopped and competing jobs idle.
It requested only **/media/primeicons-subset-E2J67QVD.woff2** for PrimeIcons,
once per page: **9,568-byte body / 10,483-byte transfer**. Both Noto weights were
requested once with unchanged **45,492 / 46,720-byte bodies**. The three fonts
totaled **104,527 transferred bytes per page**, unchanged from the 06:41 baseline.
No original WOFF2 or EOT/WOFF/TTF/SVG fallback was requested. CSS remained
**14,171 transferred / 72,756 decoded bytes**; image transfer was unchanged.
Full-page transfer changed **+6 / −4 / −3 bytes** on home/catalog/product.

Performance scored **87/90/91 mobile and 99/100/100 desktop**, with 100 in the
other categories. Regressions include home mobile speed index **+1,396.9 ms**,
all four home desktop timed metrics, catalog/product mobile TBT and product
desktop speed index. [The performance audit](../docs/performance-audit.md)
retains every metric and regression; unchanged fonts do not establish causation.

Preflight and post-pass analysis verified the four current build files, three
Noto/hero source/dist assets, reviewed/emitted icon subset hashes, all 13 current
report hashes, 13 baseline reports and all **21 entries** of the
[06:41 archive](../artifacts/performance/baseline-2026-09-17-0641/), including its
four exact original build files. Settings/version, resource totals and font
request/body counts match. Evidence: [verification-0731.json](../artifacts/performance/verification-0731.json)
and [analysis-0731.json](../artifacts/performance/analysis-0731.json). All six
reports have zero run warnings, runtime errors, console-error audit items,
failed requests or browser API calls; cache/image waste estimates are zero.

After Chrome closed, the read-only subset check at
**07:45:59.988–07:46:00.039 UTC** confirmed **200**, `font/woff2`, exactly
9,568 bytes and SHA-256
`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`, with
`Cache-Control: public, max-age=31536000, immutable`. Its conditional ETag
request returned **304 with an empty body** and the same policy. The
[HTTP record](../artifacts/primeicons-http-verification-2026-09-17T07-45-59.988Z.json)
is separate from timing. Other URLs were not re-requested by this post-pass
HTTP check; current source/dist identities and dated prior HTTP evidence are
separate checks. Local headers do not establish deployed CDN behavior or
repeat-visit speed.

<a id="current-integrated-verification--0641-build"></a>

## Historical integrated verification — 06:41 build

Production completed at **2026-09-17T06:41:26.504Z** in **9.331 seconds**,
producing `main-XQERADW5.js` / `styles-LJHQOUSH.css`, initial **488.13 kB raw /
131.14 kB estimated transfer**. The stylesheet, Noto, hero and icon subset bytes
are unchanged. The same-font inlining proposal was rejected before browser
execution because the retained home HTML gains **93,366 Brotli bytes**, downloaded
again on each full navigation;
the prepared diagnostic was not run. This is a structural decision, not a measured
font performance gain. [Performance experiments](../docs/performance-experiments.md)
retain the offline calculation and earlier rejected hydration evidence.

Angular passed **278/278 tests across 43 files in 5.70 seconds**, test build
**06:40:52.069 UTC / 6.010 seconds**; backend passed **192/192**. The preceding
277/278 unit result was a `SpyLocation` fixture mismatch, corrected without
removing path/query assertions. Browser evidence covers **24 distinct device
cases across two builds: 9 on 06:34 and 15 on final 06:41**. The initial scope
retained **9 passed / 1 failed / 10 not run in 32.6 seconds**, exposing a real
skip-link navigation defect. After correction, desktop **3/3 passed in 8.7 seconds**
and mobile **12/12 passed in 39.5 seconds**. This is not 24 cases on the final
build or a complete 37-scenario run. [Public-page QA](../docs/public-pages-qa.md)
preserves the exact reports and earlier failures; functional checks are separate
from font/performance measurements.

The complete six-sample Lighthouse pass at **06:45:35.192–06:46:19.952 UTC**
requested only **`/media/primeicons-subset-E2J67QVD.woff2`** for PrimeIcons, once
per page, with a **9,568-byte body / 10,483-byte transfer**. Both Noto weights
were requested once with unchanged **45,492 / 46,720-byte bodies**. Three fonts
totaled **104,527 transferred bytes per page**, unchanged from the 05:44 baseline.
No original WOFF2 or EOT/WOFF/TTF/SVG fallback was requested. Images and CSS transfer
were unchanged; scripts increased **3,194 / 3,353 / 3,189 bytes** and full-page
transfer increased **3,189 / 3,346 / 3,024 bytes** on home/catalog/product.
Performance scored **87/89/90 mobile and 99/100/100 desktop**, with 100 in the
other categories. Regressions include catalog mobile LCP **+84.3 ms**, product
mobile FCP **+176.8 ms** and the desktop timing regressions listed in the
[performance audit](../docs/performance-audit.md). No isolated font timing gain
is attributed to these unchanged assets.

Preflight and post-pass analysis verified the four current build files, three
Noto/hero source/dist assets, reviewed/emitted icon subset hashes, all 13 current
report hashes, and all **21 entries** in the primary
[05:44 archive](../artifacts/performance/baseline-2026-09-17-0544/): 13 reports,
four metadata files and four original build files. Exact settings, Lighthouse
version, timestamps, resource totals and font request/body counts passed.
Evidence is [verification-0641.json](../artifacts/performance/verification-0641.json)
and [analysis-0641.json](../artifacts/performance/analysis-0641.json). All six
reports have zero run warnings, runtime errors, console-error audit items,
failed requests or browser API calls; cache/image waste estimates are zero.

After Chrome closed, the read-only subset check at
**06:46:56.511–06:46:56.552 UTC** confirmed **200**, `font/woff2`, exactly
9,568 bytes and SHA-256
`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`, with
`Cache-Control: public, max-age=31536000, immutable`. The conditional ETag request
returned **304 with an empty body** and the same policy. The
[HTTP record](../artifacts/primeicons-http-verification-2026-09-17T06-46-56.511Z.json)
is separate from timing; no verification requests ran during Lighthouse.
Development restarted only afterward, completing at **06:47:04.533 UTC** in
6.293 seconds. Other font/image URLs were not re-requested in this post-pass
HTTP check; their current source/dist identities were verified and prior HTTP
evidence remains historical. Local headers do not establish deployed CDN behavior
or repeat-visit speed.

## Historical integrated verification — 05:44 build

Production completed at **2026-09-17T05:44:24.928Z** in **9.035 seconds**, producing
`main-NOO3XGHS.js` / `styles-LJHQOUSH.css`, initial **484.86 kB raw / 130.03 kB
estimated transfer**. No font or image asset changed in this checkpoint. The
home-card incremental-hydration candidate was rejected and the original source
and all 193 compiled baseline files were restored before the canonical pass.
Its diagnostic measurements are not adopted performance improvements.

The ordinary Angular suite passed **256/256 across 42 files in 5.83 seconds** after
one corrected amount-format assertion. Re-running those same tests for the rejected
candidate did not add unique test coverage. Browser evidence is **12 distinct device
cases** on the API previously verified by **183 backend tests**: related auth,
recovery and product/cart checks **10/10 in 24.4 seconds**, plus final private-link
checks **2/2 in 13.9 seconds**. An initial desktop private-link pass remains an
additional execution of the same case. These are not a new whole-suite 70-case run.
The backend subsequently passed **185/185** for a bounded validation fix and was
activated for Lighthouse; the earlier browser checks did not run on that API
revision. [Guest-tracking frontend](../docs/guest-tracking-frontend.md) and
[the performance report](../docs/performance-audit.md) retain the exact scopes.

The one complete six-sample Lighthouse pass at **06:01:53.594–06:02:44.386 UTC**
requested only **`/media/primeicons-subset-E2J67QVD.woff2`** for PrimeIcons, once per
page, with a **9,568-byte body / 10,483-byte transfer**. Each Noto weight was requested
once with its pinned body size. Exactly three fonts totaled **104,527 transferred
bytes per page**, unchanged from the archived complete 05:13 pass. No original
WOFF2 or EOT/WOFF/TTF/SVG fallback was requested; those source/dependency files remain
preserved on disk. Image transfer was unchanged. Script transfer increased by
**1,479 / 1,474 / 1,475 bytes** on home/catalog/product; full-page totals increased
by **1,480 / 1,471 / 1,477 bytes**. CSS transfer increased **14,168→14,171 bytes**
and raw CSS **72,714→72,756 bytes**. All timing regressions remain in the separate
report, including lower mobile performance scores **86/89/90** versus **89/90/92**;
unchanged font bytes do not establish a causal explanation.

Preflight and post-pass analysis verified four current build files, three Noto/hero
source/dist assets, reviewed/emitted subset hashes, 13 current report hashes,
and the baseline's exact **21 archived entries**: 13 reports, four metadata files
and four original build files. Those originals are included in 21. Settings,
Lighthouse version, report/build identity, font counts and body lengths also matched
the declared comparison. Evidence is [verification-0544.json](../artifacts/performance/verification-0544.json),
with historical [baseline-2026-09-17-0513/](../artifacts/performance/baseline-2026-09-17-0513/)
preserved. Current reports contain zero run warnings, runtime errors, console-error
audit items, failed requests or browser API calls; cache/image waste estimates are zero.

After Chrome closed, the read-only subset HTTP check at
**06:03:14.258–06:03:14.309 UTC** confirmed **200**, `font/woff2`, 9,568 bytes and
SHA-256 `a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`, with
`Cache-Control: public, max-age=31536000, immutable`. Conditional ETag returned
**304 with an empty body** and the same policy. The
[new HTTP record](../artifacts/primeicons-http-verification-2026-09-17T06-03-14.258Z.json)
preserves earlier observations. No verification requests ran during timing;
development port 4200 restarted afterward, completing at **06:03:52.496 UTC**.
Other Noto/hero/alias/original-font URLs were not re-requested in this post-pass
check; their earlier HTTP evidence below remains historical. Local headers do
not establish deployed CDN behavior or repeat-visit performance.

## Historical integrated verification — 05:09 build

The final production build completed at **2026-09-17T05:09:50.721Z** in **10.283 seconds**,
producing `main-P6YL7ZPA.js` / `styles-Y3PILGOW.css`, initial **483.50 kB raw /
129.61 kB estimated transfer**. No font assets changed in this checkpoint. Raw CSS
increased by 17 bytes from a Tailwind rule generated for the `order-2` test fixture;
this was not an application styling change. The normal icon guard passed before
building. Final Angular verification passed **239/239 tests across 39 files** in
6.38 seconds, first attempt; backend passed **178/178**.

Functional browser checks are scoped: the initial affected desktop run passed
11/12 and revealed a real contact dual-alert defect; corrected contact checks
passed 2/2 in 7.2 seconds on desktop and within mobile's 12/12 affected cases in
37.5 seconds. The separate order-receipt race was reproduced on the older build,
then all six affected cart cases passed in 27.3 seconds on the final build.
These are not a new complete 70-case browser run. [Contact recovery](../docs/contact-request-recovery.md)
and [the performance report](../docs/performance-audit.md) preserve the failure,
correction, report paths and exact scope. Contact's compiled chunk is unchanged
between its verified 04:57 build and this final checkpoint.

The one complete six-sample Lighthouse pass at **05:13:25.891–05:14:13.988 UTC**
requested only **`/media/primeicons-subset-E2J67QVD.woff2`** for PrimeIcons, once per
page, with a **9,568-byte body / 10,483-byte transfer**. Each Noto weight was also
requested once with its pinned body size. Total font transfer remains
**104,527 bytes per page**, unchanged from the complete 04:23 baseline. No original
WOFF2 or EOT/WOFF/TTF/SVG fallback was requested. Source/dependency fallback files
remain preserved on disk. Full-page transfer changed by only +1 byte on
home/catalog and +2 bytes on product; CSS transfer increased by 2 bytes. The
separate report records every timing regression and makes no causal speed claim.

Preflight and post-pass analysis verified all four current build files, three
Noto/hero source and dist assets, reviewed/emitted subset hashes, 13 current report
hashes, and the 04:23 archive's 13 reports, 17 report/metadata copies and four
original build files. These results are saved in
[verification-0509.json](../artifacts/performance/verification-0509.json).

After Chrome closed, the read-only subset HTTP check at
**05:14:49.491–05:14:49.532 UTC** confirmed 200, `font/woff2`, 9,568 bytes and SHA-256
`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`, with
`Cache-Control: public, max-age=31536000, immutable`. Conditional ETag returned
**304 with an empty body** and the same policy. The new
[HTTP record](../artifacts/primeicons-http-verification-2026-09-17T05-14-49.491Z.json)
does not overwrite earlier observations. No verification HTTP requests ran during
timing; development port 4200 restarted only afterward. Other Noto/hero/alias/original
font URLs were not re-requested in this post-pass check; their earlier HTTP evidence
below remains explicitly historical. Local cache headers do not establish deployed
CDN behavior or repeat-visit performance.

## Historical integrated subset verification — 04:03 build

The production build completed at **2026-09-17T04:03:02.471Z** in **10.031 seconds**,
producing `main-R4RLZPZA.js` / `styles-IJQZ35G4.css`, with initial **483.48 kB raw /
129.57 kB estimated transfer**. The icon coverage guard passed before building.
Preflight and post-pass analysis verified all four build files, the three current
Noto/hero source and dist assets, the subset source/emitted bytes, and the
preserved 03:19 baseline's 13 reports, 17 report/metadata files and four build files.

Angular passed **208/208 tests across 37 files** in **5.33 seconds** and backend
passed **169/169**. All 35 scenarios on each device are covered through scoped
browser invocations on this frozen build, with one worker and zero retries.
Desktop had two complete **34/35** runs (2.5 and 2.7 minutes), followed by shipping
**1/1 in 4.7 seconds** after fixture corrections. Mobile completed **34/35 in
2.7 minutes**, then administrator **1/1 in 10.1 seconds** after fixing delayed
response-body consumption. Application/backend/build files did not change
between these runs. This is coverage of 70 device cases, not two clean complete
device runs. Original failures remain preserved; [checkout pricing](../docs/checkout-pricing.md)
records the exact report paths and corrections.

The one complete six-sample Lighthouse pass at **04:23:53.790–04:24:41.703 UTC**
requested **only `/media/primeicons-subset-E2J67QVD.woff2` once per page** for
PrimeIcons. Each response was 200 with a **9,568-byte body / 10,483-byte transfer**.
No original WOFF2 or EOT/WOFF/TTF/SVG fallback font was requested by these modern
browser samples. Those original dependency/fallback files remain unchanged.
Each Noto weight was also requested once with its pinned body bytes. Total font
transfer is **104,527 bytes per page**, down **25,581** from the 03:19 baseline;
the body saving is 25,580 bytes, with the extra byte due to response overhead.

The emitted subset SHA-256 is
`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`.
After Chrome closed, the read-only HTTP check at **04:25:19.059–04:25:19.100 UTC**
confirmed 200, `font/woff2`, exact bytes/hash and
`Cache-Control: public, max-age=31536000, immutable`. Its ETag request returned
**304 with an empty body** and matching cache policy. Evidence is in
[primeicons-http-verification-2026-09-17T04-25-19.059Z.json](../artifacts/primeicons-http-verification-2026-09-17T04-25-19.059Z.json).
No HTTP checks ran during timing. Earlier Noto/hero/alias HTTP records below
remain historical; this current post-pass HTTP check targeted only the subset.

Full-page transfer fell by **23,110 bytes on home, 22,901 on catalog and 22,014
on product** after increased HTML/script/CSS transfer. CSS transfer itself rose
81 bytes. Performance scored **88/90/91 mobile and 99/100/100 desktop**, with
100 in the other three categories throughout. CLS is unchanged: five zero
samples and product desktop 0.0000335804. Home speed index, desktop catalog LCP
and product mobile TBT regressed. The exact six results and all regressions are
in [the performance audit](../docs/performance-audit.md). Byte savings and local
cache delivery do not establish an isolated timing gain or deployed CDN behavior.

## Historical Noto integration and cache verification — 03:07 build

The production browser/server build completed at **2026-09-17T03:07:27.817Z** in
**9.405 seconds**, producing `main-LACTZSO4.js` / `styles-TFH64YQR.css`.
`npm run assets:verify` passed for all three current fingerprints, exact current
aliases and five source references. The performance preflight and post-pass
analysis also verified the public and built copies of all three assets, four
current build files, and the four preserved baseline build files.

The final complete browser suites passed **35/35 desktop cases in 3.1 minutes**
and **35/35 mobile cases in 2.6 minutes** on that same build, with one worker,
zero retries and fresh restored APIs. These are 70 project cases across two
invocations, not one uninterrupted run. Earlier fixture failures are retained in
[checkout pricing](../docs/checkout-pricing.md). Angular passed **177 tests across
30 files** and the backend passed **155 tests**; these functional checks do not
establish font timing gains.

After the canonical Lighthouse pass closed, local HTTP verification ran at
**03:20:55.919–03:20:56.143 UTC** on 17 September. All eight URLs returned
**200 with the expected body bytes and SHA-256**:

| URL group                            | Count | Cache policy                          |
| ------------------------------------ | ----: | ------------------------------------- |
| Current font/image fingerprints      |     3 | `public, max-age=31536000, immutable` |
| Current unhashed aliases             |     3 | `public, max-age=3600`                |
| Preserved original font fingerprints |     2 | `public, max-age=31536000, immutable` |

All eight `If-None-Match` requests returned **304 with empty bodies** and the
matching cache policy. Original font URLs still return 48,840/50,228 bytes;
current font URLs and aliases return 45,492/46,720 bytes. The hero remains
5,786 bytes. Requests were sequential, used identity encoding and were made
only after Lighthouse, never during measurement. Evidence is in
[storefront-asset-cache-verification-2026-09-17T03-20-55-919Z.json](../artifacts/storefront-asset-cache-verification-2026-09-17T03-20-55-919Z.json);
the earlier cache artifact was hashed and confirmed unchanged.

The separate six-sample canonical pass measured **6,856 fewer font-transfer
bytes per page**, with each Noto font requested once, and **187 fewer CSS-transfer
bytes**. Full-page savings were 6,185 bytes on home, 6,140 on catalog and 6,161 on
product after script/HTML increases. Timing was mixed, including a catalog mobile
score regression. Complete scores, all timing regressions and conditions are in
[the performance audit](../docs/performance-audit.md). These local results do not
establish deployed CDN behavior or repeat-visit speed.

## Historical HTTP cache verification

Before the metadata optimization, HTTP delivery was verified on the local preview
at **2026-09-16T23:36:48.179Z**. All three fingerprinted URLs returned **200** with
the then-current manifest SHA-256 and `public, max-age=31536000, immutable`. All three
legacy aliases returned **200**, identical bytes and `public, max-age=3600`.
Conditional `If-None-Match` requests for all six URLs returned **304** with empty
bodies. Recorded URLs, byte counts, hashes, cache headers and statuses are in
[storefront-asset-cache-verification.json](../artifacts/storefront-asset-cache-verification.json).

These historical checks confirm the original URLs' cache behavior and
compatibility. They do not verify the newly optimized URLs or establish a
cold-load performance improvement.
