# Arabic catalog content audit

All twelve existing products were localized in the **local development snapshot only** on **2026-09-16 at 21:13:30 UTC**. The remote catalog was read for evidence and was not modified. This copy work does not approve these products for commercial release: original model rights, image rights and manufacturing evidence remain incomplete.

## Files and scope

- [`catalog-localization.json`](catalog-localization.json): the twelve approved Arabic names, short/full descriptions, image alternative text, care/safety notes, SEO text, retained English search terms, original copy, original specifications and per-product evidence gaps.
- [`localize-catalog.js`](../outako/backend-api/scripts/localize-catalog.js): guarded local-only dry run/application, full local-document backup and post-write preservation checks.
- [`catalog-localization.js`](../outako/backend-api/src/utils/catalog-localization.js): target/manifest validation, copy conflict detection, idempotent planning and explicit copy-field allowlist.
- [`catalog-localization.test.js`](../outako/backend-api/test/catalog-localization.test.js): six targeted tests covering local target boundaries, allowlisted writes, source conflicts, search preservation, repeat application and preservation of non-copy fields.

Only `name`, `shortDescription`, `description`, `imageAlt`, `safetyNote`, `metaTitle`, `metaDescription`, `tags` and `keywords` were changed. IDs, slugs, categories, prices, discounts, currency, manufacturing values, activation state, images, galleries, models, image variants, catalog provenance and timestamps stayed unchanged. The four separate licensed drafts stayed inactive and were not localized again.

## Evidence reviewed

The read-only [source catalog API](https://outako.modev.me/api/products?limit=100) was captured at **2026-09-16T21:02:46Z**. It supplied twelve product records but no original model author, canonical source link, applicable commercial license or image permission. Its public product endpoint is recorded for each item in the manifest. The manifest pins the source snapshot and each inspected primary image with SHA-256 and retains the original hosted image/model URLs. Hosted files are evidence of what was supplied, not proof of authorship or permission.

Ten primary product images were inspected directly. Four additional dual-name gallery files were inspected, including duplicate views; the BAMBU/LAB views support the two-word optical concept. No primary image, gallery image or model is supplied for the dragon or display sword. Their copy consequently uses the original product identity and stated display purpose without inventing pose, appearance, character affiliation or measured detail.

The current seed contains a plausible [Kunai MakerWorld candidate](https://makerworld.com/en/models/672914-kunai-fidget-spinner). The seed has a different slug, price and weight; no hash or author record connects it to this product's uploaded STL. A direct source request returned HTTP 403. It remains an **unverified candidate**, with no license conclusion. Additional search attempts returned irrelevant or inaccessible results and were discarded. No other original model source was established.

The raw local/remote snapshots and search attempts are retained in ignored `.local/` and `artifacts/catalog-localization/` files for this workspace. Durable per-item URLs, hashes, observations, original copy and missing evidence are in the repository manifest. No generated product photos were introduced, and no images were claimed to be photographs of this shop's own printed samples.

## Final names and product-specific gaps

Prices below are **unchanged stored EGP amounts**, not approved quotations. Weight/size text is reproduced exactly as evidence of data needing verification; bare numbers have no established unit.

| Stable slug | Final Arabic name | Stored price | Evidence and remaining product-specific gap |
| --- | --- | ---: | --- |
| `minion-phone-stand` | حامل موبايل بشكل مينيون | 300 | Yellow one-eyed character, oval base, sloped support and front lip visible. Stored colors say black/gray. Size `0`, weight `68`; device fit/load and character rights unverified. |
| `templar-knight-phone-and-tablet-holder` | حامل موبايل وتابلت بشكل فارس | 300 | Kneeling armored knight, shield, cape and front supports visible. No model URL. Size `0`, weight `45`; phone/tablet compatibility and load untested. |
| `compact-phone-stand` | حامل موبايل صغير بخطوط بارزة | 100 | Ribbed arch and front lip with portrait phone example visible. Size `0`, weight `15`; footprint, phone/case fit and angle unverified. No folding or charging feature claimed. |
| `samurai-sword-incense-holder` | مجسم ساموراي بحامل أعواد للديكور | 1000 | Armored samurai, raised arms and long base visible. Source copy advertised digital files/burning incense; physical copy now explicitly permits **unlit decorative display only**. Size `0`, weight `140`; no heat test/noncombustible insert. Source photo still shows smoke and requires replacement before commercial release. |
| `kunai-fidget-spinner-2` | سبينر بتصميم كوناي | 250 | Pointed faceted form, grip and ring visible. Size `0`, weight `20`; mechanism, assembly, moving parts and spin performance unverified. No official Naruto affiliation/license or weapon use claimed. |
| `ballerina-keychain` | ميدالية مفاتيح راقصة باليه | 70 | Flat ballerina silhouette and pictured ring/chain. Size `2 x 10 cm ` is unverified; weight `6`; print time `0.2` has no unit. Hardware inclusion and thin-part strength need confirmation. |
| `gymnast-keychain` | ميدالية مفاتيح لاعبة جمباز | 70 | Red gymnast silhouette in a floor pose, ring/chain pictured. Size `20`, weight `5`; dimensions, attachment strength and hardware inclusion unknown. |
| `moon-star-keychain` | ميدالية مفاتيح هلال ونجمة | 70 | Pale pink crescent, star with heart cutout and gold-colored hardware visible. Source's “soft filament” conflicts with stored PLA+; no flexibility claim retained. Size `10 cm` unverified, weight `5`, finish `Hand` ambiguous; metal type/inclusion unknown. |
| `dual-name-customize` | لوحة اسمين بتأثير بصري | 450 | Two words visible from different source-image angles. Size `20`, weight `45`; supported scripts, fonts, length limits, approval workflow and effect of customization on price/time need confirmation. No automatic support for arbitrary names or Arabic script claimed. |
| `ninja-pen-holder` | حامل قلم بشكل نينجا | 500 | Kneeling masked figure holding a horizontal pen visible. Size `70`, weight `70`; pen diameter compatibility and stability untested. Pen appears as an example, not a documented included accessory. |
| `tiny-dragon-statue` | مجسم تنين صغير | 24.5 | No visual/model evidence. Stored `Resin`, `12cm`, `120g`, green/smooth finish and `6 hours` are unverified. Resin is outside the owner's PLA/PLA+ costing premise. Actual sample photo/specification needed before purchase. |
| `sword-of-the-flame-hero` | سيف بطل اللهب للعرض | 89 | No visual/model evidence. Stored PLA, metallic finish, `95cm`, `850g` and `18 hours` are unverified. No blade sharpness, strength, specific anime identity, assembly or mounting claim. Display only. |

## Shared sale-readiness gaps

Every existing product lacks documented permission to sell printed copies of its source model and permission to reuse its source photography. Character designs require their own rights review; an STL being downloadable does not establish that permission. The verified licenses for the four separate inactive drafts do not cover these twelve products.

No approved physical sample, measured dimensions, consumed-filament report or repeatable cost sheet was supplied for these twelve records. Existing `weight` is not assumed to be consumed filament: supports, purge and failed prints may differ from the weight of the finished item. Existing `printTime` values are not used as dispatch/delivery promises. Descriptions do not claim popularity, official affiliation, certified safety, durability, universal device fit or guaranteed spinner behavior.

The owner's supplied **2.5 EGP per consumed gram of PLA/PLA+** must be combined with explicitly measured/allocated expenses and a chosen profit basis, excluding shipping; see [`catalog-pricing.md`](catalog-pricing.md). No guessed material amount, machine hours or margin was substituted. As a conditional sanity check, *if* the sword's `850g` were confirmed consumed PLA, material alone would be **2125 EGP**, above its stored **89 EGP** price. This demonstrates a price/measurement review gap; it does not verify that weight or authorize a new price.

The localized copy is ready for local UX review. The two records without images, the incense photo/use conflict, missing rights, unresolved hardware/customization details and unverified manufacturing/pricing should be resolved before treating the catalog as commercially approved. Existing active flags were preserved as instructed; this audit does not imply they passed a publication gate.

## Gallery and specification review — 16 September, 23:06 UTC

The verification below belongs to this dated display checkpoint. Newest integrated build, test and browser results are recorded in [implementation progress](implementation-progress.md) and [payment QA](order-payments-qa.md); those software checks do not resolve the catalog evidence gaps recorded here.

A local byte-hash comparison found nine redundant gallery entries across eight products: `minion-phone-stand`, `samurai-sword-incense-holder`, `kunai-fidget-spinner-2`, `ballerina-keychain`, `gymnast-keychain`, `moon-star-keychain` and `ninja-pen-holder` each repeat their primary image once; `dual-name-customize` repeats it twice. Different original URLs prevented the previous URL-only deduplication from removing these repeated views.

The product-details gallery retains the first original source when two records share the same generated **detail** image URL with a SHA-256 filename. It preserves different detail images even if their small thumbnails match, and does not infer identical content from ordinary URLs or missing metadata. This affects display only: original images, API records, provenance and the 44 source records/70 distinct variant files remain intact. Responsive thumbnail sizes and native dimensions are preserved. At this checkpoint, the full Angular suite passed **100/100 tests**, including all three focused deduplication regressions and seven new specification-display cases.

At this checkpoint, the production browser suite passed **56/56 project cases** (**28 unique scenarios × two device projects**) in **2.1 minutes**, using one worker, on `main-72MNKU5Z.js` built **2026-09-16 at 23:06:16 UTC**. Arabic specification labels, missing-unit details and product-card handling passed on desktop and mobile, as did the knight gallery's actual 120px portrait-thumbnail source selection; the mobile project uses DPR 2. That result superseded the earlier 52-case checkpoint; newer integrated results are linked above. It does not claim that all eight products with duplicate images were individually exercised or that the stored manufacturing values are verified.

The shared typed display helper now localizes known labels and explicitly identifies missing units. Product-card sizes and product-details specifications use computed values; no API values, provenance, prices or manufacturing facts change. Stored values remain evidence needing verification:

| Field | Exact stored values and affected records | Current display treatment |
| --- | --- | --- |
| Unitless size | `20`: gymnast and dual-name; `70`: ninja | Omitted from cards. Details show the number followed by `الوحدة غير مذكورة`, without adding cm/mm. |
| Unitless weight | Minion `68`; knight `45`; compact stand `15`; samurai `140`; kunai `20`; ballerina `6`; gymnast `5`; moon-star `5`; dual-name `45`; ninja `70` | Details identify the missing unit. These are not presented as measured or consumed grams. |
| Unitless print time | Ballerina `0.2` | Shown as `0.2 (الوحدة غير مذكورة)` under the recorded printing-time label; no hours/days or dispatch promise inferred. |
| Unitless layer height | Knight, gymnast and moon-star `0.2`; compact stand `0.4` | Details identify the missing unit without adding mm. |
| English finish | `matte` (seven products), `matte ` (ninja), `Glossy` (dual-name), `Smooth` (dragon), `Metallic` (sword) | Displayed as `مطفي`, `لامع`, `ناعم`, and `مظهر معدني`. The latter describes appearance, not blade material. |
| Ambiguous finish | Moon-star `Hand` | Displayed as `غير موضح`; neither handmade nor hand-finished is inferred. Original text remains stored. |

Stored color text remains unchanged: minion `Black , Gray `, knight/compact/samurai `black , gray `, kunai `black , gray ,red `, ballerina `black ,red`, gymnast/ninja `black , red , blue`, moon-star `pink , black, red`, dual-name `black , red`, dragon `Green` and sword `Red/Black`. Known color words now display in Arabic under **الألوان المذكورة**, with mixed comma/slash lists handled consistently. Custom Arabic and unrecognized names remain meaningful instead of being replaced by guesses. Translation does not confirm color availability; the yellow minion photo still differs from its stored black/gray values.

Explicit units are localized without converting quantities: for example, `2 x 10 cm` becomes `2 × 10 سم` and `850g` becomes `850 جم`. Empty values and the existing bare-zero sentinel are omitted. Cards show only sizes with recognized explicit length units. `Resin` displays as `راتنج (ريزن)` on cards and details, while standard material codes such as PLA+ remain intact. Known recorded print-time text is localized separately from preparation estimates. Complete made-to-order ranges display Arabic units, such as `2–4 أيام عمل` or `2–6 ساعات`, without changing their numeric ranges or promising shipping/delivery. Incomplete, unsupported or invalid preparation durations remain hidden. The product-display utility's seven cases (six preparation-duration cases and one discount case) also passed within this historical 100-test suite.

These label fixes cannot supply missing sample evidence. Dragon and sword still have no image or model. The samurai primary photo and repeated views visibly show lit incense/smoke, conflicting with the correctly restricted unlit decorative use; the remaining source view is not a verified safe-use sample. A genuine unlit sample image is needed. No replacement photo or manufacturing fact was invented.

For this historical local API restart, restoration was verified at **2026-09-16T23:07:32.641Z**. Port 4000's previous process was verified as `scripts/dev-local.js`; the replacement ran as PID **14152**, exec session **53424**, retaining `--snapshot-public-catalog`. The previous process did not have `--cache-models`, so that option was not added. The runner reused **53 cached media files with zero remote fallbacks**.

Four inactive drafts were inserted and twelve Arabic records restored, for sixteen total products. All **192 original specification/price field checks** matched the manifest; the localizer additionally verified all protected fields across the complete documents. The **44 image-source records and 70 distinct variant files** remain intact, with every file matching its recorded size and SHA-256 filename. All four public draft routes returned 404. Drafts remain pending with null measurements and no sample, rights or pricing approval; none of the twelve public products was enrolled in manufacturing review during restoration. The complete local backup is `.local/catalog-localization-backup-2026-09-16T23-06-47.432Z.json`; safe verification evidence is in [verification-2026-09-16-2306.json](../artifacts/catalog-restoration/verification-2026-09-16-2306.json). Runtime credentials were refreshed privately and never printed. This restart/restoration verification did not run browser or performance tests or write to the remote source.

## Local application and recovery evidence

Run from `outako/backend-api` in PowerShell only after the local runner reports readiness and creates a fresh `.local/runtime.json`. This restores the four inactive drafts before localizing the twelve existing products. It validates the exact loopback database and passes its URI privately to child processes, stopping at any failed command:

```powershell
@'
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { validateLocalizationTarget } from './src/utils/catalog-localization.js';
const runtime = JSON.parse(await readFile('.local/runtime.json', 'utf8'));
const uri = validateLocalizationTarget(runtime, 'development');
const env = { ...process.env, NODE_ENV: 'development', CATALOG_IMPORT_MONGODB_URI: uri };
for (const args of [
  ['scripts/import-catalog-drafts.js'],
  ['scripts/import-catalog-drafts.js', '--apply'],
  ['scripts/localize-catalog.js'],
  ['scripts/localize-catalog.js', '--apply'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error('Restoration stopped at ' + args[0]);
}
'@ | node --input-type=module
```

For a fresh snapshot, expect four created drafts/zero active insertions, followed by twelve localized records and `protectedFieldsUnchanged: true`. The runner normally reloads image metadata from existing verified sidecars, so routine restoration does not need image backfill. Confirm the public API returns twelve manifest-matching records, unchanged prices/specifications, 44 image-source records and 70 distinct variant URLs; verify the referenced files and four public draft 404 responses before resuming browser work. A changed snapshot, missing media or unexpected count requires review instead of relaxing these checks.

The script reads only the fixed ignored `.local/runtime.json` path. It accepts development/test and direct loopback MongoDB with an explicit port and exactly the `3dotaku-local` database, and requires a loopback HTTP runtime URL. It accepts no destination override. Missing/changed product identities, unexpected copy edits, extra public products, missing drafts, non-copy fields in the manifest or unrecognized CLI arguments cause rejection.

The first application wrote a complete sixteen-document backup to `.local/catalog-localization-backup-2026-09-16T21-13-30.571Z.json`. The backup contains product data, not runtime credentials. Copy updates use compare conditions on every original copy field, so a concurrent text edit cannot be silently overwritten. The operation is per document; a mid-run interruption can leave completed rows, and a repeat run recognizes those rows without overwriting them. Restoration should review the backup and restore copy fields only, preserving subsequent unrelated edits.

The MongoMemoryServer runner creates a fresh database on restart. Repeat the draft import and this local copy application after a restart; it never updates the remote source or silently changes the runner's remote snapshot source.

## Verification

At **2026-09-16T21:13:56Z**:

- Targeted command `node --test test/catalog-localization.test.js`: **6 passed**.
- Dry run: **12 ready**, four inactive drafts present.
- First application: **12 applied**, all twelve localized, all protected fields unchanged across sixteen documents.
- Repeat application: **0 applied / 12 already localized**, no new backup needed.
- Local public API: **12 products**, all expected Arabic names and original prices; **44 image source-variant records** retained.
- Public draft detail routes: **404 for all four** (`wavy-desk-bin`, `modular-desk-organizer`, `modular-chess-set`, `resorte-phone-stand`).

Search was checked against the real local API after application:

| Query | Result count | Meaning |
| --- | ---: | --- |
| `phone` | 3 | All three phone holders remain findable in English. |
| `Compact Phone Stand` | 3 | Existing Mongo text search uses token matching, so the other phone stands can also match. |
| `compact-phone-stand` | 3 | The slug is retained as an indexed tag; it does not turn text search into exact-slug lookup. |
| `موبايل` | 3 | All three phone holders are findable in Arabic. |
| `حامل` | 6 | Text in descriptions also matches; this is not a category filter. |
| `جمباز` | 1 | Gymnast keychain. |
| `dragon` | 1 | Dragon record remains findable in English. |

The Product text index covers `name`, `shortDescription`, `description` and `tags`; neither `slug` nor `keywords` is indexed for this search. Original English names, slugs and all existing tags were therefore retained in `tags`; existing keywords were retained separately. Search semantics/controllers were not changed.

The initial data/CLI verification above did not start a full Angular suite, production build or browser run. Subsequent display and browser verification is recorded in the dated review section. Browser assertions now use the Arabic product names, while routes, stored prices and catalog counts remain stable.
