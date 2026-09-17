# PrimeIcons subset provenance

The input is the unchanged `primeicons@7.0.0` package, distributed under the
MIT license, copyright 2018–2021 PrimeTek. The complete license is retained in
the generated CSS and in `public/assets/fonts/primeicons-license.txt`. No
PrimeIcons package file is modified.

`primeicons-subset.woff2` contains the 54 icon code points used by the audited
application and installed PrimeNG 21.1.10 runtime, plus the original non-private
control/space mappings. It is **9,568 bytes**, compared with **35,148 bytes** for
the package WOFF2, a reduction of **25,580 bytes (72.78%)**. Its SHA-256 is
`a101ac093ebe1739894ab8acaf846ccc381f5b7b9cd7667778480ec91618c8ef`.

The original WOFF2 SHA-256 is
`9eea6e0bcb974ec568fdcb1eec182d3b5383a3a23899a690140b2c0167886882`.
The manifest pins the CSS/font/license inputs, generated outputs, required
name-to-code-point mappings, reviewed dynamic bindings and generation options.

Required glyph IDs, outlines, contour flags, hints, bounds, advances and bearings
are preserved. Global metrics, all 22 name records and required GDEF class
assignments are preserved. The name table's binary storage is repacked by
FontTools; this is semantic preservation, not equality of every font table.
Unused glyphs are deliberately removed. Original glyph IDs are retained, so
some empty slots remain; 57 mapped code points remain from the original 317.

The generated CSS preserves all 314 upstream mappings, font-family, display,
helper, animation and reduced-motion declarations. Only font URLs and the
license header differ. Modern WOFF2 browsers receive the subset; the original
EOT/WOFF/TTF/SVG fallback sources remain available through the dependency.
Angular emits the imported font with its content hash; the existing immutable
media cache policy applies to that emitted URL.

See [the maintenance and verification instructions](../../../scripts/primeicons.md).
