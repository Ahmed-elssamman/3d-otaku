# PrimeIcons coverage and subset maintenance

The storefront continues to use PrimeIcons 7 CSS classes and PrimeNG's existing
inline SVG defaults. Only the WOFF2 input changes. The reviewed subset removes
25,580 bytes from the 35,148-byte original while retaining all 54 required icon
glyphs. This byte saving does not establish a rendering-time improvement.

## Verify and reproduce

Run the read-only guard before accepting icon changes:

```powershell
npm run icons:verify
```

`npm run build` invokes the same command through `prebuild`. Direct `ng build`
or `npm run watch` bypasses npm's build lifecycle; run the guard explicitly in
those workflows. The verifier requires no Python, network or browser. It pins
the installed PrimeIcons/PrimeNG versions, source and generated asset hashes,
all upstream CSS behavior, required glyph mappings and reviewed dynamic class
bindings. It scans application source and all 262 installed PrimeNG runtime
bundles, excluding the exported `PrimeIcons` constant catalogue. Application
use of that catalogue or a constructed icon-name prefix fails for review.
New uncovered literal icon names and changed dynamic bindings fail as well.

Reproduce the already reviewed bytes with the existing pinned tooling file:

```powershell
py -3.13 -m venv artifacts/font-optimizer-venv
& artifacts/font-optimizer-venv/Scripts/python.exe -m pip install -r scripts/font-optimizer-requirements.txt
& artifacts/font-optimizer-venv/Scripts/python.exe scripts/generate-primeicons.py
npm run icons:verify
```

Use a clean environment with FontTools 4.65.0 and Brotli 1.2.0. The generator
disables optional HarfBuzz repacking, verifies original inputs and checks every
output against its reviewed hash before writing. It does not rewrite the
dependency or silently approve a new subset. Ordinary builds consume committed
generated assets and do not install/run Python.

The narrow `.gitattributes` rules preserve generated CSS/license line endings
and binary font bytes across Windows and Unix checkouts, including workspaces
with `core.autocrlf=true`.

For a new icon or dependency update, review the finite icon sources and runtime
defaults, regenerate an artifact candidate with the required code points, verify
outline/metric/name/CSS parity, and repeat the relevant visual gate. Then update
the manifest and generated assets together. Do not merely add an allowlisted
name without adding and checking its glyph. The manifest and candidate hashes
are review records, not an automatic authorization to change icon coverage.

## Coverage boundaries

The inventory includes conditional header/viewer icons, shared dormant component
defaults, public category/footer data and admin navigation/dashboard controls.
Current API data cannot supply icon names: category presentation overwrites its
icon from finite local data, social settings supply URLs, and dashboard data
supplies numbers. All current dynamic bindings were reviewed to these finite
sources. PrimeNG's font fallback adds `pi-spinner`/`pi-spin`, already retained;
paginator, dialog, select, input-number and toast defaults use inline SVG icons.

A source scan is not a proof about arbitrary future API-provided strings. An
unchanged binding whose data flow later accepts unbounded icon names requires
review and runtime coverage checks. Keep dynamic icons limited to explicit
local data; do not interpret this guard as support for every upstream icon in
the subset. The full CSS mapping list is retained for compatibility, but unused
glyphs are intentionally absent from WOFF2. Original fallback font files remain
unchanged on disk; their preservation does not prove they are never downloaded.

## Recorded validation and limits

The artifact-only Chrome 152 gate used frozen production HTML/CSP from
`main-LACTZSO4.js` / `styles-TFH64YQR.css`, changing only the WOFF2 response body.
It covered home/catalog/product plus a 54-icon grid at 16/24/32 px on desktop
and mobile: 16 navigations, eight matched pairs. Geometry and actual platform
font use were equal for every pair; all grid glyphs rendered with `primeicons`.
There were no console, CSP or font loading errors. Each navigation retained
the observed favicon `ERR_ABORTED` separately from font results.

Fourteen of 18 initial screenshot pairs were byte-identical. Two FAQ captures
were invalid because capture preceded focus/scroll settling. They remain in the
evidence. A separately approved four-navigation FAQ repair reused the original
frozen HTML/CSP and produced six of six byte-identical screenshot pairs with
equal geometry, correct focus and the open FAQ. Its earlier pre-browser CSP
identity failure is retained too; no navigation ran in that failed attempt.

The remaining two initial screenshot differences are within one product photo
thumbnail (1,455/1,390 pixels, maximum channel difference 5/4), outside icon/text
regions. No unique rendering cause is established: that gate did not retain
the image response hash/currentSrc. It does not prove every screenshot byte
identical. The font name table also repacks storage offsets while retaining all
22 name-record values; the first overly strict name-table byte-check failure
is preserved before the corrected semantic check.

The synthetic route interception sometimes produced two identical selected
WOFF2 responses, so it is not a production transfer/timing measurement. No
paired performance trial was run. Integrated build/browser verification must
confirm the emitted hashed WOFF2 body and that a modern browser requests only
the subset, followed by the separately coordinated canonical performance pass.

Saved evidence is under ignored `artifacts/font-research-primeicons/`:
`inventory.json`, `subset-analysis.json`, `visual-analysis.json`,
`faq-repair-analysis.json` and both retained `visual-runs/` directories. The
production provenance and exact hashes are in
`src/assets/primeicons/source.md` and `src/assets/primeicons/manifest.json`.
