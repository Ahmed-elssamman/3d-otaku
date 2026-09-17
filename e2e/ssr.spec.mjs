import { test, expect } from './local-api.fixture.mjs';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';

const executeFile = promisify(execFile);
const workspace = fileURLToPath(new URL('../', import.meta.url));
const productSlug = 'templar-knight-phone-and-tablet-holder';
const productPath = `/products/${productSlug}`;
const variantPattern = /^\/uploads\/images\/variants\/[a-f0-9]{64}\.webp$/;

function localOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('SSR QA requires an explicit loopback HTTP origin.');
  }
  return url.origin;
}

const webOrigin = localOrigin(process.env.STORE_E2E_BASE_URL || 'http://127.0.0.1:4300');
const apiOrigin = localOrigin(process.env.STORE_API_ORIGIN || 'http://127.0.0.1:4000');
test.use({ baseURL: webOrigin, trace: 'off', screenshot: 'off' });

async function publicProduct(request) {
  const response = await request.get(`${webOrigin}/api/products/${productSlug}`);
  expect(response.status()).toBe(200);
  const product = (await response.json()).data;
  expect(product.name).toMatch(/[\u0600-\u06ff]/);
  expect(product.imageVariants.length).toBeGreaterThan(0);
  return product;
}

function salePrice(product) {
  return typeof product.discountPrice === 'number' &&
    product.discountPrice >= 0 &&
    product.discountPrice < product.price
    ? product.discountPrice
    : product.price;
}

function numericPrice(text) {
  const normalized = text
    .replace(/[٠-٩]/g, (character) => String(character.charCodeAt(0) - 0x660))
    .replace(/٬|,/g, '')
    .replace(/٫/g, '.');
  return Number(normalized.match(/\d+(?:\.\d+)?/)?.[0]);
}

function runtimeErrors(page, { strictConsole = false } = {}) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    const unexpectedError =
      message.type() === 'error' && (strictConsole || /NG05\d\d|hydration|mismatch/i.test(text));
    const securityWarning =
      strictConsole && message.type() === 'warning' && /Content[- ]Security[- ]Policy/i.test(text);
    if (unexpectedError || securityWarning) errors.push(message.text());
  });
  return errors;
}

function publicApiRequests(page) {
  const requests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      request.method() === 'GET' &&
      /^\/api\/(?:products(?:\/[^/]+)?|settings\/public)\/?$/.test(url.pathname)
    )
      requests.push(url.pathname + url.search);
  });
  return requests;
}

test('public document HTML contains Arabic catalog content, prices, responsive images and metadata before JavaScript', async ({
  browser,
  request,
}) => {
  const product = await publicProduct(request);
  const featuredResponse = await request.get(`${webOrigin}/api/products/featured?limit=6`);
  expect(featuredResponse.status()).toBe(200);
  const featured = (await featuredResponse.json()).data;
  expect(featured.length).toBeGreaterThan(0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const route of ['/', '/products', productPath]) {
      const response = await page.goto(webOrigin + route, { waitUntil: 'domcontentloaded' });
      expect(response.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('h1')).toContainText(/[\u0600-\u06ff]/);
      await expect(page.locator('head meta[name="description"]')).toHaveAttribute(
        'content',
        /[\u0600-\u06ff]/,
      );
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
        'href',
        webOrigin + route,
      );
      expect(await page.title()).toMatch(/[\u0600-\u06ff]/);
      if (route === productPath) {
        await expect(page.locator('h1')).toHaveText(product.name);
        expect(numericPrice(await page.locator('.price-block strong').textContent())).toBe(
          salePrice(product),
        );
        await expect(page.locator('.main-image img')).toHaveAttribute(
          'src',
          /\/uploads\/images\/variants\/.*\.webp$/,
        );
        await expect(page.locator('.main-image img')).toHaveAttribute('srcset', /\d+w/);
        const schema = JSON.parse(await page.locator('#product-structured-data').textContent());
        expect(schema['@type']).toBe('Product');
        expect(schema.name).toBe(product.name);
        expect(schema.offers.price).toBe(salePrice(product));
        expect(schema.offers.priceCurrency).toBe('EGP');
        expect(schema.offers.url).toBe(webOrigin + productPath);
        expect(schema.image.length).toBeGreaterThan(0);
      } else {
        const expected = route === '/' ? featured[0] : product;
        const card = page
          .locator('app-product-card')
          .filter({ has: page.locator('h3 a', { hasText: expected.name }) });
        await expect(card).toHaveCount(1);
        expect(numericPrice(await card.locator('.product-price > span').textContent())).toBe(
          salePrice(expected),
        );
        await expect(page.locator('app-product-card img[srcset]').first()).toHaveAttribute(
          'srcset',
          /\d+w/,
        );
      }
    }
  } finally {
    await context.close();
  }
});

test('private documents remain empty client shells and never serialize document credential canaries', async ({
  request,
}) => {
  const canary = `private-ssr-${randomUUID()}`;
  for (const route of ['/cart', '/orders', '/login', '/register', '/admin', '/admin/dashboard']) {
    const response = await request.get(webOrigin + route, {
      headers: { Cookie: `qa_private=${canary}`, Authorization: `Bearer ${canary}` },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html.includes(canary)).toBe(false);
    const root = html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
    expect(root).not.toBeNull();
    expect(root[1].replace(/<!--[\s\S]*?-->/g, '').trim()).toBe('');
    expect(html).not.toMatch(/"(?:trackingToken|refreshToken|accessToken|customer\.phone)"\s*:/);
    expect(html).not.toContain('product-structured-data');
  }
});

test('missing route and product documents return useful 404 HTML and hydrate without retry mismatches', async ({
  page,
  request,
}) => {
  const errors = runtimeErrors(page);
  const browserRequests = publicApiRequests(page);
  for (const route of ['/missing-ssr-qa-page', '/products/missing-ssr-qa-product']) {
    const response = await request.get(webOrigin + route);
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain('الصفحة غير موجودة');
    expect(html).toMatch(/name="robots"[^>]*content="noindex, follow"/);
    expect(html).not.toContain('product-structured-data');
    const navigation = await page.goto(route);
    expect(navigation.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة.' })).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  expect(browserRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('public hydration reuses transferred API responses and native gallery images decode', async ({
  page,
  request,
  isMobile,
}) => {
  const product = await publicProduct(request);
  const errors = runtimeErrors(page, { strictConsole: true });
  const browserRequests = publicApiRequests(page);
  const modelRequests = [];
  page.on('request', (request) => {
    if (/\.(?:glb|gltf|stl|obj|ply)(?:\?|$)/i.test(request.url()))
      modelRequests.push(request.url());
  });
  for (const route of ['/', '/products', productPath]) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  expect(browserRequests).toEqual([]);
  const gallery = page.locator('.gallery');
  await gallery.scrollIntoViewIfNeeded();
  const thumbnails = gallery.locator('button img');
  expect(await thumbnails.count()).toBeGreaterThan(1);
  await expect
    .poll(() =>
      thumbnails.evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
  const loaded = await thumbnails.evaluateAll((images) =>
    images.map((image) => ({
      currentSrc: new URL(image.currentSrc).pathname,
      srcset: image.srcset,
    })),
  );
  const thumbnailUrls = new Set(
    product.imageVariants.flatMap((record) =>
      record.variants
        .filter((variant) => variant.kind === 'thumbnail')
        .map((variant) => variant.url),
    ),
  );
  expect(
    loaded.every((image) => variantPattern.test(image.currentSrc) && /\d+w/.test(image.srcset)),
  ).toBe(true);
  expect(loaded.some((image) => thumbnailUrls.has(image.currentSrc))).toBe(true);
  if (isMobile) expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);

  // A non-main portrait avoids the larger main image already fetched by the preceding routes.
  const portrait = product.imageVariants.find(
    (record) =>
      record.sourceUrl !== product.image &&
      product.gallery.includes(record.sourceUrl) &&
      record.height > record.width,
  );
  expect(portrait, 'The gallery fixture must include a non-main portrait image.').toBeTruthy();
  const portraitThumbnail = portrait.variants.find((variant) => variant.kind === 'thumbnail');
  expect(portraitThumbnail, 'The portrait must have a generated thumbnail.').toBeTruthy();
  expect(portraitThumbnail.url).toMatch(variantPattern);
  expect(portrait.variants.some((variant) => variant.width > portraitThumbnail.width)).toBe(true);
  const portraitImage = gallery.locator(`button img[src="${portraitThumbnail.url}"]`);
  await expect(portraitImage).toHaveCount(1);
  await expect(portraitImage).toHaveAttribute('width', String(portraitThumbnail.width));
  await expect(portraitImage).toHaveAttribute('height', String(portraitThumbnail.height));
  await expect
    .poll(() => portraitImage.evaluate((image) => new URL(image.currentSrc).pathname))
    .toBe(portraitThumbnail.url);
  const mainImage = page.locator('.main-image img');
  const previousSource = await mainImage.getAttribute('src');
  await gallery.getByRole('button', { name: 'صورة المنتج 2', exact: true }).click();
  await expect(mainImage).not.toHaveAttribute('src', previousSource);
  await expect
    .poll(() => mainImage.evaluate((image) => image.complete && image.naturalWidth > 0))
    .toBe(true);
  expect(modelRequests).toEqual([]);
  const mediaPath = product.imageVariants[0].variants.find(
    (variant) => variant.kind === 'thumbnail',
  ).url;
  const localMediaUrls = ['localhost', '127.0.0.1'].map((hostname) => {
    const url = new URL(mediaPath, apiOrigin);
    url.hostname = hostname;
    return url.href;
  });
  const decodedUploads = await page.evaluate(
    async (urls) =>
      Promise.all(
        urls.map(async (url) => {
          const image = new Image();
          image.src = url;
          await image.decode();
          return { width: image.naturalWidth, height: image.naturalHeight };
        }),
      ),
    localMediaUrls,
  );
  expect(decodedUploads.every((image) => image.width > 0 && image.height > 0)).toBe(true);
  expect(errors).toEqual([]);
});

test('Arabic specifications distinguish missing units and omit unsupported size chips without changing catalog data', async ({
  page,
  request,
}) => {
  const sourceUrl = `${webOrigin}/api/products/ninja-pen-holder`;
  const sourceResponse = await request.get(sourceUrl);
  expect(sourceResponse.ok()).toBe(true);
  const source = (await sourceResponse.json()).data;
  expect(source.size).toBe('70');
  expect(source.weight).toBe('70');
  const errors = runtimeErrors(page, { strictConsole: true });
  await page.goto('/products/ninja-pen-holder');
  const specs = page.locator('.spec-grid > div');
  await expect(
    specs.filter({ has: page.getByText('المقاسات المذكورة', { exact: true }) }).locator('dd'),
  ).toHaveText('70 (الوحدة غير مذكورة)');
  await expect(
    specs.filter({ has: page.getByText('الوزن المذكور', { exact: true }) }).locator('dd'),
  ).toHaveText('70 (الوحدة غير مذكورة)');
  await expect(
    specs.filter({ has: page.getByText('التشطيب المذكور', { exact: true }) }).locator('dd'),
  ).toHaveText('مطفي');
  await expect(
    specs.filter({ has: page.getByText('الألوان المذكورة', { exact: true }) }).locator('dd'),
  ).toHaveText('أسود، أحمر، أزرق');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.goto('/products?search=ninja-pen-holder');
  const card = page.locator('.product-card:has(> a[href="/products/ninja-pen-holder"])');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.product-specs')).toContainText('PLA+');
  await expect(card.locator('.product-specs')).not.toContainText('70');
  const unchanged = await request.get(sourceUrl);
  expect((await unchanged.json()).data).toEqual(source);
  expect(errors).toEqual([]);
});

test('stored cart appears only after browser hydration and remains usable', async ({
  page,
  request,
}) => {
  const product = await publicProduct(request);
  const privateName = `قطعة خاصة للاختبار ${randomUUID()}`;
  const errors = runtimeErrors(page);
  await page.addInitScript(
    (items) => localStorage.setItem('3d_otaku_cart_items', JSON.stringify(items)),
    [{ product: { ...product, name: privateName }, quantity: 3 }],
  );
  const response = await page.goto(productPath);
  const html = await response.text();
  expect(html.includes(privateName)).toBe(false);
  expect(html).not.toMatch(/<span\b[^>]*class="cart-count"/);
  await expect(page.locator('.cart-count')).toHaveText('3');
  await page.locator('a.cart-link').click();
  await expect(page.getByRole('heading', { name: 'سلة المشتريات' })).toBeVisible();
  await expect(page.getByText(privateName, { exact: true })).toBeVisible();
  await expect(page.locator('.quantity-control output')).toHaveText('3');
  expect(errors).toEqual([]);
});

test('direct cart preserves an edited name and fills untouched email when a delayed session arrives', async ({
  page,
  request,
}) => {
  const product = await publicProduct(request);
  const canary = `delayed-cart-session-${randomUUID()}`;
  const user = {
    id: '600000000000000000000097',
    fullName: 'عميل الحساب المؤجل',
    email: 'ssr-delayed-cart@example.test',
    role: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const editedName = 'اسم مستلم الطلب المكتوب يدويًا';
  const errors = runtimeErrors(page);
  const mutations = [];
  let probes = 0;
  let sessionReleased = false;
  let releaseSession = () => {};
  const sessionGate = new Promise((resolve) => {
    releaseSession = resolve;
  });
  await page.addInitScript(
    ({ token, items }) => {
      localStorage.setItem('3d-otaku-access-token', token);
      localStorage.removeItem('3d-otaku-auth-user');
      localStorage.removeItem('3d-otaku-refresh-token');
      localStorage.setItem('3d_otaku_cart_items', JSON.stringify(items));
    },
    { token: canary, items: [{ product, quantity: 2 }] },
  );
  await page.route('**/api/**', async (route) => {
    const currentRequest = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(currentRequest.method())) {
      mutations.push(new URL(currentRequest.url()).pathname);
      await route.abort('blockedbyclient');
      return;
    }
    if (new URL(currentRequest.url()).pathname === '/api/auth/me') {
      probes += 1;
      expect(currentRequest.headers().authorization === `Bearer ${canary}`).toBe(true);
      await sessionGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: user }),
      });
      return;
    }
    await route.continue();
  });
  try {
    const response = await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html.includes(canary) || html.includes(user.email)).toBe(false);
    await expect(page.getByRole('heading', { name: 'سلة المشتريات' })).toBeVisible();
    await expect(page.locator('.cart-count')).toHaveText('2');
    await expect(page.locator('.quantity-control output')).toHaveText('2');
    await expect.poll(() => probes).toBe(1);
    expect(sessionReleased).toBe(false);
    const name = page.locator('#checkout-name');
    const email = page.locator('#checkout-email');
    await expect(name).toHaveValue('');
    await expect(email).toHaveValue('');
    await expect(email).toHaveClass(/ng-pristine/);
    await name.fill(editedName);
    await expect(name).toHaveClass(/ng-dirty/);
    sessionReleased = true;
    releaseSession();
    await expect(email).toHaveValue(user.email);
    await expect(email).toHaveClass(/ng-pristine/);
    await expect(name).toHaveValue(editedName);
    await expect(page.locator('.account-link')).toHaveAttribute('href', '/orders');
    await expect(page.locator('.quantity-control output')).toHaveText('2');
    expect(probes).toBe(1);
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    sessionReleased = true;
    releaseSession();
  }
});

test('a stored browser session starts from guest HTML and loads the user after hydration', async ({
  page,
}) => {
  const canary = `browser-session-${randomUUID()}`;
  const user = {
    id: '600000000000000000000099',
    fullName: `عميل خاص ${canary}`,
    email: 'ssr-browser@example.test',
    role: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const errors = runtimeErrors(page);
  let probes = 0;
  await page.addInitScript(
    ({ token, account }) => {
      localStorage.setItem('3d-otaku-access-token', token);
      localStorage.setItem('3d-otaku-auth-user', JSON.stringify(account));
    },
    { token: canary, account: user },
  );
  await page.route('**/api/auth/me', async (route) => {
    probes += 1;
    expect(route.request().headers().authorization === `Bearer ${canary}`).toBe(true);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: user }),
    });
  });
  const response = await page.goto('/');
  const html = await response.text();
  expect(html.includes(canary)).toBe(false);
  expect(html).toMatch(
    /href="\/login"[^>]*class="account-link"|class="account-link"[^>]*href="\/login"/,
  );
  await expect(page.locator('.account-link')).toHaveAttribute('href', '/orders');
  await expect.poll(() => probes).toBe(1);
  expect(errors).toEqual([]);
});

test('a slow lazy home route restores cached auth after hydration without duplicate public requests', async ({
  page,
}) => {
  const buildDirectory = new URL('../dist/3d-otaku/browser/', import.meta.url);
  const files = (await readdir(buildDirectory)).filter((file) => /^chunk-.*\.js$/.test(file));
  const chunks = await Promise.all(
    files.map(async (file) => ({
      file,
      source: await readFile(new URL(file, buildDirectory), 'utf8'),
    })),
  );
  const homeChunks = chunks.filter((chunk) => chunk.source.includes('app-home-page'));
  expect(homeChunks).toHaveLength(1);
  const canary = `slow-home-session-${randomUUID()}`;
  const user = {
    id: '600000000000000000000098',
    fullName: `عميل خاص ${canary}`,
    email: 'ssr-slow-home@example.test',
    role: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const errors = runtimeErrors(page);
  const publicRequests = publicApiRequests(page);
  const probes = [];
  let chunkRequested = false;
  let chunkReleased = false;
  let releaseChunk = () => {};
  const chunkGate = new Promise((resolve) => {
    releaseChunk = resolve;
  });
  await page.addInitScript(
    ({ token, account }) => {
      localStorage.setItem('3d-otaku-access-token', token);
      localStorage.setItem('3d-otaku-auth-user', JSON.stringify(account));
    },
    { token: canary, account: user },
  );
  await page.route(`**/${homeChunks[0].file}`, async (route) => {
    chunkRequested = true;
    await chunkGate;
    await route.continue();
  });
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/auth/me') {
      const releasedAtProbe = chunkReleased;
      const homeHydrated = await page.evaluate(() => {
        const home = document.querySelector('app-home-page');
        return Boolean(
          home && !home.hasAttribute('ngh') && home.querySelectorAll('app-product-card').length > 0,
        );
      });
      probes.push({ chunkReleased: releasedAtProbe, homeHydrated });
      expect(request.headers().authorization === `Bearer ${canary}`).toBe(true);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: user }),
      });
      return;
    }
    // A duplicate browser fetch cannot silently hide behind a healthy local API.
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Controlled browser-only API outage.' }),
    });
  });
  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html.includes(canary)).toBe(false);
    expect(html).toMatch(/<app-home-page\b[^>]*\bngh=/);
    await expect.poll(() => chunkRequested).toBe(true);
    expect(probes).toEqual([]);
    expect(publicRequests).toEqual([]);
    const renderedCards = await page.locator('app-home-page app-product-card').count();
    expect(renderedCards).toBeGreaterThan(0);
    chunkReleased = true;
    releaseChunk();
    await expect.poll(() => probes.length).toBe(1);
    expect(probes).toEqual([{ chunkReleased: true, homeHydrated: true }]);
    await expect(page.locator('.account-link')).toHaveAttribute('href', '/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-home-page app-product-card')).toHaveCount(renderedCards);
    expect(publicRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    chunkReleased = true;
    releaseChunk();
  }
});

test('the built SSR renderer isolates credentials, reads only public APIs and preserves upstream failures', async () => {
  const observations = [];
  let unavailableProduct = false;
  const observer = createServer(async (request, response) => {
    const url = new URL(request.url, apiOrigin);
    const isPublicRead =
      request.method === 'GET' &&
      /^\/api\/(?:products(?:\/[^/]+)?|settings\/public)\/?$/.test(url.pathname);
    observations.push({
      isPublicRead,
      authorization: Boolean(request.headers.authorization),
      cookie: Boolean(request.headers.cookie),
    });
    if (!isPublicRead) {
      response
        .writeHead(403, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ success: false }));
      return;
    }
    if (unavailableProduct && url.pathname === `/api/products/${productSlug}`) {
      response
        .writeHead(503, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ success: false, message: 'Controlled local API failure.' }));
      return;
    }
    try {
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      response
        .writeHead(upstream.status, { 'Content-Type': 'application/json' })
        .end(await upstream.text());
    } catch {
      response
        .writeHead(503, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ success: false }));
    }
  });
  await new Promise((resolve) => observer.listen(0, '127.0.0.1', resolve));
  try {
    const script = `
      import { renderStorefront } from './dist/3d-otaku/server/server.mjs';
      const canary = 'isolated-document-credential-canary';
      const response = await renderStorefront(new Request(process.env.SSR_QA_DOCUMENT_URL, { headers: { Cookie: 'qa=' + canary, Authorization: 'Bearer ' + canary } }));
      const html = response ? await response.text() : '';
      const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] || '';
      const stateJson = html.match(/<script[^>]+id="ng-state"[^>]*>([\\s\\S]*?)<\\/script>/)?.[1];
      const state = stateJson ? JSON.parse(stateJson) : {};
      const cacheEntries = Object.entries(state).filter(([, value]) => value && typeof value === 'object' && typeof value.u === 'string');
      process.stdout.write('SSR_QA:' + JSON.stringify({ status: response?.status || 0, leaked: html.includes(canary), renderedProduct: html.includes('product-structured-data'), renderedError: html.includes('تفاصيل المنتج مش متاحة دلوقتي'), canonical, cacheKeys: cacheEntries.map(([key]) => key), cacheUrls: cacheEntries.map(([, value]) => value.u) }) + '\\n');
      process.exit(0);
    `;
    const inspectRender = async (publicOrigin = '') => {
      let result;
      try {
        result = await executeFile(process.execPath, ['--input-type=module', '-e', script], {
          cwd: workspace,
          env: {
            ...process.env,
            STORE_API_ORIGIN: `http://127.0.0.1:${observer.address().port}`,
            STORE_PUBLIC_ORIGIN: publicOrigin,
            SSR_QA_DOCUMENT_URL: webOrigin + productPath,
            NG_ALLOWED_HOSTS: 'localhost,127.0.0.1',
          },
          timeout: 25000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        });
      } catch {
        throw new Error(
          'The isolated built SSR renderer did not complete; document headers and response contents are suppressed.',
        );
      }
      const marker = result.stdout.split('\n').find((line) => line.startsWith('SSR_QA:'));
      expect(Boolean(marker)).toBe(true);
      return JSON.parse(marker.slice('SSR_QA:'.length));
    };
    const initial = await inspectRender();
    expect(initial).toMatchObject({
      status: 200,
      leaked: false,
      renderedProduct: true,
      renderedError: false,
      canonical: webOrigin + productPath,
    });
    const publicOrigin = 'https://ssr-public.example.test';
    const configured = await inspectRender(publicOrigin);
    expect(configured).toMatchObject({
      status: 200,
      leaked: false,
      renderedProduct: true,
      canonical: publicOrigin + productPath,
    });
    expect(configured.cacheUrls.length).toBeGreaterThan(0);
    expect(configured.cacheUrls.every((url) => url.startsWith(publicOrigin + '/api/'))).toBe(true);
    expect(configured.cacheKeys).toHaveLength(initial.cacheKeys.length);
    expect(configured.cacheKeys.every((key) => !initial.cacheKeys.includes(key))).toBe(true);
    unavailableProduct = true;
    expect(await inspectRender()).toMatchObject({
      status: 503,
      leaked: false,
      renderedProduct: false,
      renderedError: true,
    });
    expect(observations.length).toBeGreaterThan(0);
    expect(
      observations.every(
        (observation) =>
          observation.isPublicRead && !observation.authorization && !observation.cookie,
      ),
    ).toBe(true);
  } finally {
    observer.closeAllConnections();
    await new Promise((resolve) => observer.close(resolve));
  }
});
