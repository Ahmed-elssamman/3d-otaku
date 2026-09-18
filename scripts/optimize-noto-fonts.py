"""Reproduce the pinned Noto metadata optimization into an artifact directory."""

import argparse
import hashlib
import io
import json
from pathlib import Path

import brotli
import fontTools
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent.parent
FONT_DIRECTORY = ROOT / 'public' / 'assets' / 'fonts'
POST_FIELDS = (
    'italicAngle', 'underlinePosition', 'underlineThickness', 'isFixedPitch',
    'minMemType42', 'maxMemType42', 'minMemType1', 'maxMemType1',
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def font_table(font: TTFont, tag: str) -> bytes:
    data = font.getTableData(tag)
    if tag == 'head':
        return data[:8] + bytes(4) + data[12:]
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'artifacts' / 'noto-optimized')
    output = parser.parse_args().output_dir.resolve()
    provenance = json.loads((FONT_DIRECTORY / 'optimization.json').read_text(encoding='utf-8'))
    if fontTools.version != provenance['tooling']['fontTools'] or brotli.__version__ != provenance['tooling']['brotli']:
        raise SystemExit('Use the pinned scripts/font-optimizer-requirements.txt in an isolated environment.')
    for entry in provenance['fonts']:
        weight = entry['weight']
        source_name = f"noto-sans-arabic-{weight}.{entry['originalSha256']}.woff2"
        source_bytes = (FONT_DIRECTORY / source_name).read_bytes()
        if len(source_bytes) != entry['originalBytes'] or digest(source_bytes) != entry['originalSha256']:
            raise SystemExit(f'Original source integrity failed: {source_name}')
        source = TTFont(io.BytesIO(source_bytes), recalcBBoxes=False, recalcTimestamp=False)
        source.cfg['fontTools.ttLib.tables.otBase:USE_HARFBUZZ_REPACKER'] = False
        source.getGlyphOrder()
        source['post'].formatType = 3.0
        encoded = io.BytesIO()
        source.save(encoded, reorderTables=False)
        candidate_bytes = encoded.getvalue()
        if len(candidate_bytes) != entry['optimizedBytes'] or digest(candidate_bytes) != entry['optimizedSha256']:
            raise SystemExit(f'Candidate differs from the reviewed font: weight {weight}')
        original = TTFont(io.BytesIO(source_bytes), recalcBBoxes=False, recalcTimestamp=False)
        candidate = TTFont(io.BytesIO(candidate_bytes), recalcBBoxes=False, recalcTimestamp=False)
        if original.keys() != candidate.keys():
            raise SystemExit('Font table set changed unexpectedly.')
        for tag in original.keys():
            if tag not in ('GlyphOrder', 'post') and font_table(original, tag) != font_table(candidate, tag):
                raise SystemExit(f'Rendering table changed unexpectedly: {tag}')
        if any(getattr(original['post'], field) != getattr(candidate['post'], field) for field in POST_FIELDS):
            raise SystemExit('Post metrics changed unexpectedly.')
        output.mkdir(parents=True, exist_ok=True)
        target = output / f"noto-sans-arabic-{weight}.{entry['optimizedSha256']}.woff2"
        if target.exists() and target.read_bytes() != candidate_bytes:
            raise SystemExit(f'Refusing to overwrite different bytes at a fingerprinted path: {target.name}')
        target.write_bytes(candidate_bytes)
        source.close()
        original.close()
        candidate.close()
        print(f'{target.name}: {len(candidate_bytes)} bytes; reviewed hash and font tables verified.')


if __name__ == '__main__':
    main()
