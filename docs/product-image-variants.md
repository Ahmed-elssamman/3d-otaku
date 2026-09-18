# Product image variants

Implemented locally on 2026-09-17. Backend dependency: Sharp 0.35.4 with native libvips 8.18.6, verified on Windows x64 / Node 24.18.0. The backend now declares Node >=20.9.0, as required by Sharp. Install the backend dependencies on the target operating system with optional native packages enabled; do not copy Windows `node_modules` to a Linux deployment. No root frontend dependencies were changed.

## Evidence and behavior

The saved mobile product Lighthouse report identifies five 400 px originals used in approximately 70 px gallery thumbnails and estimates 52,059 bytes of image waste. Local generation creates actual WebP files; changing an extension or declaring dimensions alone does not create an optimized image.

| Kind | Maximum box | Output |
| --- | --- | --- |
| `thumbnail` | 160 × 160 | Gallery thumbnail / small preview |
| `card` | 640 × 640 | Product card / medium preview |
| `detail` | 1280 × 1280 | Main product gallery |

Images fit inside each box without cropping or enlargement. For example, a 400 × 533 portrait produces a 120 × 160 thumbnail and 400 × 533 card/detail. Exact rounded dimensions come from the encoder. EXIF orientation is applied, ancillary metadata is stripped, alpha transparency is retained, and WebP quality is 80. Identical encoded results share one content-hashed filename. A small original can produce the same file for several kinds; clients should deduplicate URLs when building `srcset` and may retain an original if its byte size is more appropriate.

The original image bytes and URL remain unchanged. Static JPEG, PNG and WebP are accepted only after content inspection and complete decoding, with a 10 MB input and 40-megapixel decoding limit. Animated/multipage and damaged images return HTTP 422. No conversion is implied for a legacy record without generated metadata.

## API contract

The existing administrator-only `POST /api/admin/uploads/image` response keeps `url`, `fileName`, `size` and `mimeType` for the original. It adds:

```json
{
  "width": 480,
  "height": 320,
  "variants": [
    {
      "kind": "thumbnail",
      "url": "/uploads/images/variants/<sha256-of-file>.webp",
      "width": 160,
      "height": 107,
      "size": 1234,
      "mimeType": "image/webp"
    }
  ]
}
```

This is a shape example; `size` and URL in a real response are derived from the actual file. All three kinds are returned. `width`/`height` describe the original's displayed orientation; each variant includes its actual dimensions and byte size.

Public/admin product responses add `imageVariants`, an array of `{ sourceUrl, width, height, variants }`. Match `sourceUrl` exactly to `image`, a `gallery` entry, `posterImage` or `socialImage`. Existing string URL fields are unchanged. The array defaults to empty for legacy/missing/unprocessed sources. On new uploads, administrator product create/update derives metadata from verified local manifests; clients cannot provide trusted dimensions or fabricated variants in a product payload. Changing image fields rebuilds the metadata and removes stale source entries.

Variant URLs are root-relative under `/uploads/images/variants/`. SSR/frontend hosts must forward `/uploads` to the API or resolve these URLs against their configured public media origin. Files use SHA-256 names and receive `Cache-Control: public, max-age=31536000, immutable`; this policy is limited to generated variants. Existing original assets keep their previous cache policy. There is no arbitrary remote image proxy or URL fetch endpoint.

## Restricted local backfill

Run from `outako/backend-api`:

```powershell
npm run images:backfill
# Default: dry run; no writes without an explicit local database.
$env:NODE_ENV = 'development'
$env:IMAGE_VARIANT_MONGODB_URI = '<explicit loopback database URI ending in local, dev or test>'
npm run images:backfill
npm run images:backfill -- --apply
```

The tool rejects production environments, remote/SRV database addresses, authentication/query options, ambiguous database names and an uploads root redirected through a link. Its path scope is the repository's `src/uploads` directory and existing `local-snapshot/<24-hex>.(jpg|jpeg|png|webp)` inputs. Relative local snapshot URLs and direct loopback URLs can be processed. Remote URLs, arbitrary paths, encoded traversal and frontend `/assets` files are skipped; the tool never downloads an image. Resolved input/output paths are checked against the uploads root, and output files are content-addressed.

Only `imageVariants` metadata is updated. Original URLs, bytes, prices, publishing state, manufacturing/provenance data and descriptions are preserved. Updates compare `updatedAt` to avoid overwriting a concurrent edit; conflicts/failures are reported. Repeating the tool reuses verified sidecars/files and skips unchanged metadata. Sidecars and generated files stay beneath ignored uploads directories. The local API runner reloads verified cached metadata into its fresh disposable database on subsequent starts.

Applied to the local snapshot: 10 products updated, 6 skipped, 0 failures/conflicts. Skipped records were four inactive `/assets` drafts and two snapshot products with empty image/gallery fields. The five Templar product gallery originals totalled 55,874 bytes; generated thumbnails totalled 9,624 bytes, saving 46,250 bytes (82.8%) for that gallery. Browser/Lighthouse impact still depends on frontend selection and must be measured after integration.

After the coordinated API restart, all 44 image source records reloaded from verified manifests. A read-only local HTTP audit fetched and fully decoded all 70 distinct variant files, checking their dimensions, byte sizes, SHA-256 filenames, WebP content type and immutable cache headers. That verification made no upstream requests. The public catalog remained 12 products; the four inactive drafts were reimported and each still returned public 404.

## Verification

Eight new tests cover decoded formats/dimensions, aspect/no-upscale behavior, orientation, duplicate outputs, corrupt/oversized input rejection, administrator permissions, byte-identical originals, immutable variant caching, trusted product metadata, legacy fallback, local database/path restrictions, dry run/repeated backfill and stable catalog pagination. The full backend suite passes 52 tests; syntax checks pass and npm reports zero production dependency vulnerabilities. Public catalog ordering now includes `_id` as a stable tie-breaker for equal dates/prices, preserving the existing filters and pagination contract.
