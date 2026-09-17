import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = join(root, 'src/assets/primeicons');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = json(join(directory, 'manifest.json'));
const extensions = new Set(['.ts', '.html', '.css', '.scss', '.json']);
const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
  );
const iconToken = /(?<![\w-])pi-[a-z][a-z0-9-]*/g;
const dynamicBinding = /\[(?:class|ngClass|icon|loadingIcon|dropdownIcon)\]\s*=\s*"([^"]+)"/g;
const issues = [];

assert.equal(manifest.schemaVersion, 1);
assert.equal(
  json(join(root, 'node_modules/primeicons/package.json')).version,
  manifest.primeiconsVersion,
  'PrimeIcons changed; regenerate and review the subset.',
);
assert.equal(
  json(join(root, 'node_modules/primeng/package.json')).version,
  manifest.primengVersion,
  'PrimeNG changed; review default icon coverage.',
);
for (const record of [...manifest.sources, ...manifest.generated]) {
  const bytes = readFileSync(join(root, record.path));
  assert.equal(bytes.length, record.bytes, `Icon asset size changed: ${record.path}`);
  assert.equal(hash(bytes), record.sha256, `Icon asset integrity changed: ${record.path}`);
}
const upstreamCss = readFileSync(join(root, 'node_modules/primeicons/primeicons.css'), 'utf8');
const generatedCss = readFileSync(join(directory, 'primeicons.css'), 'utf8');
const expectedCss =
  manifest.generatedCssHeader +
  upstreamCss
    .replaceAll('./fonts/primeicons.', '../../../node_modules/primeicons/fonts/primeicons.')
    .replaceAll(
      '../../../node_modules/primeicons/fonts/primeicons.woff2',
      './primeicons-subset.woff2',
    );
assert.equal(
  generatedCss,
  expectedCss,
  'Icon CSS must preserve every upstream rule, changing only asset URLs and the license header.',
);
const mappings = {};
postcss.parse(upstreamCss).walkRules((rule) => {
  const classes = [...rule.selector.matchAll(/\.(pi-[a-z0-9-]+):before\b/g)].map(
    (match) => match[1],
  );
  if (classes.length === 0) return;
  const declarations = rule.nodes.filter((node) => node.type === 'decl' && node.prop === 'content');
  assert.equal(declarations.length, 1, `Unexpected icon content: ${rule.selector}`);
  const codepoint = declarations[0].value.match(/^['"]\\([a-f0-9]+)['"]$/i);
  assert.ok(codepoint, `Unrecognized icon content: ${rule.selector}`);
  for (const name of classes) mappings[name] = Number.parseInt(codepoint[1], 16);
});
for (const [name, codepoint] of Object.entries(manifest.requiredMappings))
  assert.equal(mappings[name], codepoint, `Upstream icon mapping changed: ${name}`);
const dynamicSites = [];
const referenced = new Set();
const applicationFiles = walk(join(root, 'src')).filter(
  (file) => extensions.has(extname(file)) && !file.startsWith(directory),
);
const runtimeFiles = walk(join(root, 'node_modules/primeng/fesm2022')).filter(
  (file) => file.endsWith('.mjs') && !file.endsWith('primeng-api.mjs'),
);
for (const [kind, files] of [
  ['application', applicationFiles],
  ['primeng-runtime', runtimeFiles],
]) {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const sourcePath = relative(root, file).replaceAll('\\', '/');
    for (const match of source.matchAll(iconToken)) {
      const name = match[0];
      if (manifest.helpers.includes(name)) continue;
      referenced.add(name);
      if (!(name in manifest.requiredMappings))
        issues.push(`Uncovered icon ${name}: ${sourcePath}`);
    }
    if (kind === 'application') {
      if (/(?<![\w-])pi-(?![a-z])/.test(source) || /\bPrimeIcons\b/.test(source))
        issues.push(`Constructed/constant icon source needs review: ${sourcePath}`);
      for (const match of source.matchAll(dynamicBinding))
        dynamicSites.push({ file: sourcePath, expression: match[1] });
    }
  }
}
if (JSON.stringify(dynamicSites) !== JSON.stringify(manifest.reviewedDynamicBindings))
  issues.push(
    'Dynamic class/icon bindings changed; review their finite icon sources and update the manifest deliberately.',
  );
const globalCss = readFileSync(join(root, 'src/styles.css'), 'utf8');
assert.ok(
  globalCss.includes("@import './assets/primeicons/primeicons.css';"),
  'Generated icon CSS is not imported.',
);
assert.ok(
  !globalCss.includes("@import 'primeicons/primeicons.css';"),
  'The full WOFF2 import would bypass the subset.',
);
assert.equal(issues.length, 0, issues.join('\n'));
process.stdout.write(
  `Verified ${referenced.size} referenced icon glyphs, ${runtimeFiles.length} PrimeNG runtime files, exact CSS mappings/behavior, subset hashes and reviewed dynamic bindings.\n`,
);
