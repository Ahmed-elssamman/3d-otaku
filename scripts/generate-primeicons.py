"""Reproduce the reviewed PrimeIcons subset without modifying its dependency."""
import hashlib
import io
import json
from pathlib import Path

import brotli
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / 'src' / 'assets' / 'primeicons'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    manifest = json.loads((DIRECTORY / 'manifest.json').read_text(encoding='utf-8'))
    if fontTools.version != manifest['tooling']['fontTools'] or brotli.__version__ != manifest['tooling']['brotli']:
        raise SystemExit('Use scripts/font-optimizer-requirements.txt in a clean isolated environment.')
    for record in manifest['sources']:
        data = (ROOT / record['path']).read_bytes()
        if len(data) != record['bytes'] or digest(data) != record['sha256']:
            raise SystemExit(f"Upstream source changed: {record['path']}")
    source_bytes = (ROOT / 'node_modules/primeicons/fonts/primeicons.woff2').read_bytes()
    original = TTFont(io.BytesIO(source_bytes), recalcBBoxes=False, recalcTimestamp=False)
    original_cmap = original.getBestCmap()
    required = set(manifest['requiredMappings'].values())
    required.update(code for code in original_cmap if not 0xE000 <= code <= 0xF8FF)
    if required - original_cmap.keys():
        raise SystemExit('Required code point is absent from the original font.')
    options = subset.Options()
    for key, value in manifest['subsetOptions'].items():
        setattr(options, key, value)
    font = TTFont(io.BytesIO(source_bytes), recalcBBoxes=False, recalcTimestamp=False)
    font.cfg['fontTools.ttLib.tables.otBase:USE_HARFBUZZ_REPACKER'] = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(required))
    subsetter.subset(font)
    buffer = io.BytesIO()
    font.save(buffer, reorderTables=False)
    css = (ROOT / 'node_modules/primeicons/primeicons.css').read_bytes().decode('utf-8')
    generated_css = manifest['generatedCssHeader'] + css.replace('./fonts/primeicons.', '../../../node_modules/primeicons/fonts/primeicons.').replace('../../../node_modules/primeicons/fonts/primeicons.woff2', './primeicons-subset.woff2')
    outputs = {
        'src/assets/primeicons/primeicons-subset.woff2': buffer.getvalue(),
        'src/assets/primeicons/primeicons.css': generated_css.encode('utf-8'),
        'public/assets/fonts/primeicons-license.txt': (ROOT / 'node_modules/primeicons/LICENSE').read_bytes(),
    }
    for record in manifest['generated']:
        data = outputs[record['path']]
        if len(data) != record['bytes'] or digest(data) != record['sha256']:
            raise SystemExit(f"Output differs from the reviewed asset: {record['path']}")
    for filename, data in outputs.items():
        (ROOT / filename).write_bytes(data)
    original.close()
    font.close()
    print('Reproduced all reviewed icon assets with exact hashes; dependency files unchanged.')


if __name__ == '__main__':
    main()
