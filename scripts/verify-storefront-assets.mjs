import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(
  await readFile(new URL('./storefront-assets.manifest.json', import.meta.url), 'utf8'),
);
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.algorithm, 'sha256');
assert.ok(Array.isArray(manifest.assets) && manifest.assets.length === 3);
const aliases = new Set();
let referenceCount = 0;

for (const asset of manifest.assets) {
  assert.match(
    asset.alias,
    /^\/assets\/(?:fonts\/noto-sans-arabic-(?:400|700)\.woff2|storefront\/knight-phone-holder\.webp)$/,
  );
  assert.ok(!aliases.has(asset.alias), 'Duplicate asset alias in integrity manifest.');
  aliases.add(asset.alias);
  assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(asset.bytes) && asset.bytes > 0);
  const extension = path.extname(asset.alias);
  assert.equal(
    asset.url,
    `${asset.alias.slice(0, -extension.length)}.${asset.sha256}${extension}`,
    'The immutable filename must contain its exact SHA-256.',
  );
  const bytes = await readFile(path.join(root, 'public', asset.url.slice(1)));
  assert.equal(bytes.length, asset.bytes, `Unexpected byte size: ${asset.url}`);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    asset.sha256,
    `Immutable asset bytes changed: ${asset.url}`,
  );
  const aliasBytes = await readFile(path.join(root, 'public', asset.alias.slice(1)));
  assert.ok(bytes.equals(aliasBytes), `Compatibility alias differs: ${asset.alias}`);
  assert.ok(Array.isArray(asset.references) && asset.references.length > 0);
  for (const reference of asset.references) {
    assert.match(reference, /^src\/[a-zA-Z0-9/._-]+$/);
    const filename = path.resolve(root, reference);
    assert.ok(filename.startsWith(path.join(root, 'src') + path.sep));
    const source = await readFile(filename, 'utf8');
    assert.ok(source.includes(asset.url.slice(1)), `Fingerprint reference missing: ${reference}`);
    assert.ok(
      !source.includes(asset.alias.slice(1)),
      `Live unhashed reference remains: ${reference}`,
    );
    referenceCount += 1;
  }
}

process.stdout.write(
  `Verified ${manifest.assets.length} fingerprinted storefront assets, identical compatibility aliases and ${referenceCount} source references.\n`,
);
