const { createHash } = require('node:crypto');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const path = require('node:path');

const catalogRoot = path.resolve(__dirname, '../public/assets/catalog');
function withinCatalog(relativePath) {
  const target = path.resolve(catalogRoot, relativePath);
  if (!target.startsWith(catalogRoot + path.sep))
    throw new Error('Asset path must stay inside the catalog.');
  return target;
}
function verify(content, record) {
  if (
    content.length !== record.bytes ||
    createHash('sha256').update(content).digest('hex') !== record.sha256
  ) {
    throw new Error('Catalog asset failed integrity verification: ' + record.file);
  }
}
async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(catalogRoot, 'catalog-manifest.json'), 'utf8'),
  );
  let verified = 0;
  for (const product of manifest.products) {
    const productDirectory = withinCatalog(product.slug);
    const provenance = JSON.parse(
      await readFile(path.join(productDirectory, 'provenance.json'), 'utf8'),
    );
    await mkdir(productDirectory, { recursive: true });
    for (const record of provenance.downloads) {
      const destination = withinCatalog(path.join(product.slug, record.file));
      let content;
      try {
        content = await readFile(destination);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const source = new URL(record.sourceUrl);
        if (source.protocol !== 'https:') throw new Error('Catalog downloads require HTTPS.');
        const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('Source download failed: HTTP ' + response.status);
        content = Buffer.from(await response.arrayBuffer());
        verify(content, record);
        await writeFile(destination, content, { flag: 'wx' });
      }
      verify(content, record);
      verified += 1;
    }
    for (const record of provenance.generatedFiles) {
      verify(await readFile(withinCatalog(path.join(product.slug, record.file))), record);
      verified += 1;
    }
  }
  process.stdout.write('Verified ' + verified + ' licensed catalog source and preview assets.\n');
}
main().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
