import { randomBytes } from 'node:crypto';
import { test, expect } from './local-api.fixture.mjs';

test.use({ trace: 'off', screenshot: 'off' });

test('checkout identifies an unavailable saved item and reviews changed prices and specifications before creating one order', async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  const apiOrigin = 'http://127.0.0.1:4000';
  const webOrigin = new URL(baseURL).origin;
  const sourceResponse = await request.get(`${apiOrigin}/api/products/compact-phone-stand`);
  expect(sourceResponse.status()).toBe(200);
  const { data: source } = await sourceResponse.json();
  const actualPrice =
    typeof source.discountPrice === 'number' &&
    source.discountPrice >= 0 &&
    source.discountPrice < source.price
      ? source.discountPrice
      : source.price;
  expect(actualPrice).toBeGreaterThan(1);
  const previousPrice = actualPrice - 1;
  const marker = `qa-checkout-price-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const unavailableName = `قطعة اختبار غير متاحة ${marker}`;
  const unavailable = {
    ...source,
    id: randomBytes(12).toString('hex'),
    _id: null,
    slug: marker,
    name: unavailableName,
  };
  const stale = { ...source, price: previousPrice, discountPrice: null };
  const errors = [];
  const orderRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (outgoing) => {
    if (new URL(outgoing.url()).pathname === '/api/orders' && outgoing.method() === 'POST') {
      orderRequests.push({
        body: outgoing.postDataJSON(),
        key: outgoing.headers()['idempotency-key'],
      });
    }
  });
  await page.route('**/*', async (route) => {
    const outgoing = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(outgoing.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(outgoing.url()).origin)
    ) {
      throw new Error('Checkout pricing QA rejects nonlocal writes.');
    }
    await route.continue();
  });
  await page.goto('/cart');
  await page.evaluate(
    (items) => {
      localStorage.setItem('3d_otaku_cart_items', JSON.stringify(items));
    },
    [
      { product: stale, quantity: 1 },
      { product: unavailable, quantity: 1 },
    ],
  );
  await page.reload();
  await page.locator('#checkout-name').fill(`اختبار أسعار محلي ${marker}`);
  await page.locator('#checkout-phone').fill('01012345678');
  await page.locator('#checkout-governorate').selectOption({ label: 'القاهرة' });
  await page.locator('#checkout-city').fill('مدينة نصر');
  const address = 'عنوان اختبار محلي لمراجعة الأسعار، عمارة 1 شقة 2';
  await page.locator('#checkout-address').fill(address);
  const unavailableQuote = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/orders/quote' &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const rejected = await unavailableQuote;
  expect(rejected.status()).toBe(422);
  expect((await rejected.json()).errors['items[1].productId']).toHaveLength(1);
  const unavailableRow = page.locator('.cart-item').filter({ hasText: unavailableName });
  await expect(unavailableRow.locator('.cart-item-error')).toContainText('هذا المنتج غير متاح');
  await expect(page.locator('#checkout-address')).toHaveValue(address);
  expect(orderRequests).toHaveLength(0);
  expect(await page.evaluate(() => sessionStorage.getItem('3d-otaku-pending-order'))).toBeNull();
  await unavailableRow.getByRole('button', { name: 'إزالة', exact: true }).click();

  const currentQuote = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/orders/quote' &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const quoted = await currentQuote;
  expect(quoted.status()).toBe(200);
  const { data: quote } = await quoted.json();
  const review = page.getByRole('region', {
    name: 'راجع المواصفات والأسعار والشحن قبل تأكيد الطلب',
  });
  await expect(review).toBeVisible();
  await expect(review).toBeFocused();
  const money = (value) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  await expect(review.locator('.quote-review-item')).toContainText(`${money(previousPrice)} ج.م`);
  await expect(review.locator('.quote-review-item')).toContainText(`${money(actualPrice)} ج.م`);
  if (quote.deliveryFeeConfirmed) {
    await expect(review).toContainText('الإجمالي شامل الشحن');
  } else {
    await expect(review).toContainText('هذا الإجمالي لا يشمل الشحن');
  }
  expect(orderRequests).toHaveLength(0);
  await expect(page.locator('#checkout-address')).toHaveValue(address);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/checkout-price-review-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({
    path: `artifacts/browser/checkout-price-review-viewport-${testInfo.project.name}.png`,
  });
  await review.getByRole('button', { name: 'الرجوع لتعديل السلة', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cart-title')).toBeFocused();
  await expect(review).toHaveCount(0);
  const previousSize = '999';
  const previousName = 'نسخة محفوظة بتفاصيل قديمة للاختبار';
  await page.evaluate(
    (product) =>
      localStorage.setItem('3d_otaku_cart_items', JSON.stringify([{ product, quantity: 1 }])),
    { ...source, name: previousName, size: previousSize, configurationFingerprint: '0'.repeat(64) },
  );
  await page.reload();
  await expect(page.locator('#checkout-address')).toHaveValue(address);
  const savedSpecifications = page.locator('.cart-item app-order-item-configuration');
  await savedSpecifications.getByText('مواصفات القطعة في السلة', { exact: true }).click();
  await expect(savedSpecifications).toContainText('999 (الوحدة غير مذكورة)');
  const repeatedQuote = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/orders/quote',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const repeated = await repeatedQuote;
  expect(repeated.status()).toBe(200);
  const { data: reviewedQuote } = await repeated.json();
  expect(reviewedQuote.items[0].unitPrice).toBe(source.price);
  expect(reviewedQuote.items[0].configurationFingerprint).toBe(source.configurationFingerprint);
  await expect(review).toBeFocused();
  await expect(review.locator('table')).toContainText('999 (الوحدة غير مذكورة)');
  await expect(review).toContainText(previousName);
  await expect(review).toContainText(source.name);
  const productDetailsLink = review.getByRole('link', {
    name: 'راجع صور ومواصفات القطعة في صفحة جديدة',
  });
  await expect(productDetailsLink).toHaveAttribute('href', `/products/${source.slug}`);
  await expect(productDetailsLink).toHaveAttribute('target', '_blank');
  await expect(productDetailsLink).toHaveAttribute('rel', 'noopener noreferrer');
  expect(orderRequests).toHaveLength(0);
  const createdResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST',
  );
  await review.getByRole('button', { name: 'أوافق على التفاصيل وأؤكد الطلب', exact: true }).focus();
  await page.keyboard.press('Enter');
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const { data: order } = await created.json();
  expect(orderRequests).toHaveLength(1);
  expect(orderRequests[0].body.expectedQuoteFingerprint).toBe(reviewedQuote.quoteFingerprint);
  expect(orderRequests[0].body.expectedQuoteVersion).toBe(2);
  expect(orderRequests[0].key).toBeTruthy();
  expect(order.items).toHaveLength(1);
  expect(order.items[0].productId).toBe(source.id);
  expect(order.items[0].configuration).toEqual(reviewedQuote.items[0].configuration);
  expect(order.items[0].configurationFingerprint).toBe(
    reviewedQuote.items[0].configurationFingerprint,
  );
  expect(order.items[0]).not.toHaveProperty('manufacturingSnapshot');
  expect(order.total).toBe(quote.total);
  expect(order.deliveryFeeConfirmed).toBe(quote.deliveryFeeConfirmed);
  await expect(page.getByRole('heading', { name: 'شكرًا لاختيارك 3D Otaku' })).toBeVisible();
  await expect(page.locator('#receipt-title')).toBeFocused();
  const recordedSpecifications = page.locator('.receipt-lines app-order-item-configuration');
  await recordedSpecifications.locator('summary').click();
  await expect(recordedSpecifications).not.toContainText('999 (الوحدة غير مذكورة)');
  await expect(recordedSpecifications.locator('dl')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('3d_otaku_cart_items'))).toBe('[]');
  const after = await request.get(`${apiOrigin}/api/products/${source.slug}`);
  expect((await after.json()).data).toEqual(source);
  expect(errors).toEqual([]);
});

test('an unrecorded legacy attempt recovers durably, survives reload and requires fresh price review with a new key', async ({
  page,
  request,
  baseURL,
}) => {
  const apiOrigin = 'http://127.0.0.1:4000';
  const webOrigin = new URL(baseURL).origin;
  const response = await request.get(`${apiOrigin}/api/products/compact-phone-stand`);
  expect(response.status()).toBe(200);
  const { data: product } = await response.json();
  const key = `qa-legacy-checkout-${Date.now()}-${randomBytes(8).toString('hex')}`;
  const draft = {
    fullName: `اختبار استعادة محاولة قديمة ${key}`,
    whatsappNumber: '01012345678',
    email: '',
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    address: 'عنوان اختبار محلي لمراجعة محاولة قديمة، عمارة 1 شقة 2',
    notes: '',
  };
  const oldPayload = {
    items: [{ productId: product.id, quantity: 1 }],
    customer: {
      fullName: draft.fullName,
      phone: '+201012345678',
      whatsappNumber: '+201012345678',
      governorate: draft.governorate,
      city: draft.city,
      address: draft.address,
      country: 'EG',
    },
    currency: 'EGP',
  };
  const orderRequests = [];
  page.on('request', (outgoing) => {
    if (new URL(outgoing.url()).pathname === '/api/orders' && outgoing.method() === 'POST') {
      orderRequests.push({
        body: outgoing.postDataJSON(),
        key: outgoing.headers()['idempotency-key'],
      });
    }
  });
  await page.route('**/*', async (route) => {
    const outgoing = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(outgoing.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(outgoing.url()).origin)
    ) {
      throw new Error('Legacy checkout recovery QA rejects nonlocal writes.');
    }
    await route.continue();
  });
  await page.goto('/cart');
  await page.evaluate(
    ({ product, draft, oldPayload, key }) => {
      localStorage.setItem('3d_otaku_cart_items', JSON.stringify([{ product, quantity: 1 }]));
      sessionStorage.setItem('3d-otaku-delivery-draft', JSON.stringify(draft));
      sessionStorage.setItem(
        '3d-otaku-pending-order',
        JSON.stringify({ key, payload: JSON.stringify(oldPayload), state: 'uncertain' }),
      );
    },
    { product, draft, oldPayload, key },
  );
  await page.reload();
  const recoveryResponse = page.waitForResponse(
    (current) =>
      new URL(current.url()).pathname === '/api/orders' && current.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'إعادة محاولة الطلب السابق', exact: true }).click();
  const rejected = await recoveryResponse;
  expect(rejected.status()).toBe(409);
  const rejection = await rejected.json();
  expect(rejection.errors.checkoutNotRecorded).toHaveLength(1);
  expect(rejection).not.toHaveProperty('data');
  expect(orderRequests).toEqual([{ body: oldPayload, key }]);
  await expect(page.locator('.pending-checkout[role="status"]')).toContainText(
    'محاولة الطلب السابقة لم تُسجّل',
  );
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('3d-otaku-pending-order')),
  );
  expect(saved).toEqual({ key, payload: JSON.stringify(oldPayload), state: 'not_recorded' });
  await page.reload();
  await expect(page.locator('.pending-checkout[role="status"]')).toContainText(
    'محاولة الطلب السابقة لم تُسجّل',
  );
  await expect(page.locator('#checkout-address')).toHaveValue(draft.address);
  await expect(
    page.getByRole('button', { name: 'إعادة محاولة الطلب السابق', exact: true }),
  ).toHaveCount(0);

  const quoteResponse = page.waitForResponse(
    (current) => new URL(current.url()).pathname === '/api/orders/quote',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const quoted = await quoteResponse;
  expect(quoted.status()).toBe(200);
  const { data: quote } = await quoted.json();
  const review = page.getByRole('region', {
    name: 'راجع المواصفات والأسعار والشحن قبل تأكيد الطلب',
  });
  await expect(review).toBeVisible();
  await expect(review).toContainText('هذه مراجعة جديدة');
  expect(orderRequests).toHaveLength(1);
  const creationResponse = page.waitForResponse(
    (current) =>
      new URL(current.url()).pathname === '/api/orders' && current.request().method() === 'POST',
  );
  await review.getByRole('button', { name: 'أوافق على التفاصيل وأؤكد الطلب', exact: true }).click();
  const created = await creationResponse;
  expect(created.status()).toBe(201);
  const { data: order } = await created.json();
  expect(orderRequests).toHaveLength(2);
  expect(orderRequests[1].key).not.toBe(key);
  expect(orderRequests[1].body.expectedQuoteFingerprint).toBe(quote.quoteFingerprint);
  expect(orderRequests[1].body.expectedQuoteVersion).toBe(2);
  expect(order.total).toBe(quote.total);
  await expect(page.getByRole('heading', { name: 'شكرًا لاختيارك 3D Otaku' })).toBeVisible();

  const staleReplay = await request.post(`${apiOrigin}/api/orders`, {
    headers: { 'Idempotency-Key': key },
    data: oldPayload,
  });
  expect(staleReplay.status()).toBe(409);
  const stillRejected = await staleReplay.json();
  expect(stillRejected.errors.checkoutNotRecorded).toHaveLength(1);
  expect(stillRejected).not.toHaveProperty('data');
  const after = await request.get(`${apiOrigin}/api/products/${product.slug}`);
  expect((await after.json()).data).toEqual(product);
});
