# Storefront scrollbar stability

The shared stylesheet now uses the browser's native scrollbar geometry with the storefront's green/off-white colors. It no longer replaces the native scrollbar with an 8-pixel red/black WebKit scrollbar after the asynchronous stylesheet arrives. Browser and operating-system accessibility settings retain control of scrollbar size.

## Reproduced cause

On the production `main-GN52CWI4.js` / `styles-2XRGXKQX.css` checkpoint, delaying the global CSS response by 1,400 ms reproduced the previously unattributed desktop layout shift. At a 1,350-pixel viewport, the usable document width changed from **1,335 to 1,342 pixels** as the stylesheet replaced the native 15-pixel scrollbar with an 8-pixel scrollbar. Home, catalog and product each recorded the same wrapper shift of **0.005216095380029807**. This matches the wrapper shift retained in the 02:13 Lighthouse reports.

The browser's default hidden-scrollbar Playwright launch did not reproduce the width change. The diagnostic explicitly removed `--hide-scrollbars`, then reproduced it on all three desktop routes. The shared Playwright configuration now also preserves visible native scrollbars so future desktop layout checks exercise this geometry.

## Isolated candidate check

Six baseline navigations and six candidate navigations used the same production build: home/catalog/product at desktop 1,350×940 and mobile 390×844/DPR 2. Only the candidate's intercepted global CSS response removed the four old scrollbar rules and added the native color declaration. The document, scripts, fonts, products and API were unchanged. Each navigation used a fresh context and the same deliberate 1,400-ms CSS delay. This is a controlled layout diagnostic, not a performance benchmark.

All three candidate desktop routes retained a constant **1,335-pixel** document width, with no wrapper shift. Mobile remained **390 pixels** in both arms, with no wrapper shift. All twelve navigations had no page/console errors or failed requests; keyboard PageDown scrolled the desktop pages. Baseline and candidate home screenshots were visually inspected. The native green scrollbar matches the storefront palette and remains visibly usable.

The smaller header shift had a separate reproducible cause: the account/search icon boxes widened when PrimeIcons loaded. A two-navigation desktop diagnostic delayed only the icon font by 650 ms. The baseline moved the header search/account elements and recorded **0.00011397929463497256** CLS; reserving one font-relative unit for header icons eliminated that shift. The header stylesheet now reserves that space while preserving each icon's existing font size. The diagnostic and both screenshots remain in `header-icons.json` / `header-*.png`. These results are separate from the native-scrollbar comparison and integrated measurements below.

Raw reports, screenshots and the diagnostic runner are retained under ignored `artifacts/scrollbar-diagnostic/`. The runner supports `baseline`, `candidate` and `source`; the first two were measured before rebuilding, while `source` checks the actual rebuilt application without modifying its stylesheet. It retains all measured width samples and layout-shift sources.

## Integrated verification

The final `main-LACTZSO4.js` / `styles-TFH64YQR.css` build completed at **03:07:27.817 UTC on 17 September**. Complete desktop 35/mobile 35 browser suites passed on that same build. After the separate canonical Lighthouse pass, `node artifacts/scrollbar-diagnostic/compare.mjs source` ran six fresh navigations at **03:21:56.122–03:22:14.930 UTC**, preserving visible native scrollbars and the deliberate 1,400-ms stylesheet delay. The served stylesheet SHA-256 matched the unmodified built file in every sample: `be3ba80b7b19cf0c2a7620a5f37601fcd07834f203f90a8bca4a978798d5331d`.

Desktop width remained **1,335 pixels** on all three routes; mobile remained **390 pixels**. No wrapper or header shift recurred. All six had no page/console errors or failed requests, and PageDown scrolled each page. Five samples recorded no layout shift; desktop product retained **0.00003358041533368969**, from its delivery-note content as the icon font loaded. That smaller remaining shift is outside the corrected header/scrollbar rules. Final home-desktop and product-mobile screenshots were visually inspected for readable Arabic, image layout and the native scrollbar. Raw evidence is in `source.json` and `source-*.png`.

The independent **03:19–03:20 UTC** canonical Lighthouse pass likewise reported zero CLS in five samples and the same small product-desktop shift. Its performance scores were **87/89/90 mobile** and **99/100/100 desktop**, with all other categories 100. Layout stability does not establish faster rendering: catalog mobile performance fell 90→89, with higher FCP/LCP/TBT than the preceding pass. See [all performance results and limitations](performance-audit.md). These are six diagnostics plus six Lighthouse samples, not a claim of zero CLS on every device or route.

## Stylesheet input scope

Tailwind now scans the `src` directory explicitly through `source('./')` in `src/styles.css`. Documentation and browser-test prose no longer add unrelated utility selectors to the production stylesheet. Existing application HTML, TypeScript/control files and the document entry remain inside the source scope. A separate PostCSS comparison removed 14 selector entries (including responsive container entries), reducing that isolated CSS output by 1,190 raw bytes and 136 Brotli bytes. These are stylesheet experiment results, not an attributed page-load improvement or final production bundle sizes. The comparison is retained under `artifacts/tailwind-scope/`.
