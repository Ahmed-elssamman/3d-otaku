import { test, expect } from './local-api.fixture.mjs';

test.use({ trace: 'off' });

const pendingKey = '3d-otaku-pending-order';
const draftKey = '3d-otaku-delivery-draft';
const cartKey = '3d_otaku_cart_items';
const modeKey = 'checkout-storage-test-mode';
const supportKey = '3d-otaku:pending-submission:/contact-messages';

test.beforeEach(async ({ baseURL }) => {
  const url = new URL(baseURL || '');
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    ![4200, 4300].includes(Number(url.port))
  )
    throw new Error('Checkout storage tests require the disposable local storefront.');
});

function installStorageGate({ pendingKey, modeKey = '', denyWrite = false, denyRemove = false }) {
  const storage = window.sessionStorage;
  const prototype = Storage.prototype;
  const descriptors = {
    getItem: Object.getOwnPropertyDescriptor(prototype, 'getItem'),
    setItem: Object.getOwnPropertyDescriptor(prototype, 'setItem'),
    removeItem: Object.getOwnPropertyDescriptor(prototype, 'removeItem'),
  };
  const originalRead = descriptors.getItem.value;
  const gate = {
    denyRead: modeKey ? originalRead.call(storage, modeKey) === 'deny-read' : false,
    denyWrite,
    denyRemove,
    savedValue: () => originalRead.call(storage, pendingKey),
    restore: () => {
      for (const [name, descriptor] of Object.entries(descriptors))
        Object.defineProperty(prototype, name, descriptor);
      Reflect.deleteProperty(window, '__checkoutStorageGate');
    },
  };
  Object.defineProperty(window, '__checkoutStorageGate', { configurable: true, value: gate });
  Object.defineProperty(prototype, 'getItem', {
    ...descriptors.getItem,
    value(key) {
      if (this === storage && key === pendingKey && gate.denyRead)
        throw new DOMException('Checkout storage read denied for this test', 'SecurityError');
      return originalRead.call(this, key);
    },
  });
  Object.defineProperty(prototype, 'setItem', {
    ...descriptors.setItem,
    value(key, value) {
      if (this === storage && key === pendingKey && gate.denyWrite)
        throw new DOMException('Checkout storage write denied for this test', 'QuotaExceededError');
      return descriptors.setItem.value.call(this, key, value);
    },
  });
  Object.defineProperty(prototype, 'removeItem', {
    ...descriptors.removeItem,
    value(key) {
      if (this === storage && key === pendingKey && gate.denyRemove)
        throw new DOMException('Checkout storage cleanup denied for this test', 'SecurityError');
      return descriptors.removeItem.value.call(this, key);
    },
  });
}

function observeCheckout(page) {
  const observed = { orders: 0, quotes: 0, pageErrors: [], consoleErrors: [] };
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const path = new URL(request.url()).pathname;
    if (path === '/api/orders') observed.orders += 1;
    if (path === '/api/orders/quote') observed.quotes += 1;
  });
  page.on('pageerror', (error) => observed.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') observed.consoleErrors.push(message.text());
  });
  return observed;
}

async function openFilledCart(page, projectName) {
  await page.goto('/products/compact-phone-stand');
  await page.getByRole('button', { name: 'زيادة الكمية', exact: true }).click();
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: 'كمل الطلب', exact: true }).click();
  await expect(page.locator('.quantity-control output')).toHaveText('2');
  await page.locator('#checkout-name').fill(`عميل اختبار تخزين محلي ${projectName}`);
  await page.locator('#checkout-phone').fill('٠١٠١٢٣٤٥٦٧٨');
  await page.locator('#checkout-governorate').selectOption({ label: 'القاهرة' });
  await page.locator('#checkout-city').fill('مدينة نصر');
  await page
    .locator('#checkout-address')
    .fill('عنوان اختبار التخزين المحلي، شارع المثال، مبنى ١ شقة ٢');
  await page.locator('#checkout-notes').fill('بيانات محلية محفوظة أثناء اختبار التخزين');
}

async function snapshotDraft(page) {
  return page.evaluate(
    ({ draftKey, cartKey }) => ({
      draft: sessionStorage.getItem(draftKey),
      cart: localStorage.getItem(cartKey),
    }),
    { draftKey, cartKey },
  );
}

async function captureFeedback(page, testInfo, filename) {
  await page.locator('#checkout-storage-feedback').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const path = testInfo.outputPath(filename);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(filename, { path, contentType: 'image/png' });
}

async function restoreStorageGate(page) {
  if (page.isClosed()) return;
  await page.evaluate((modeKey) => {
    window.__checkoutStorageGate?.restore();
    sessionStorage.removeItem(modeKey);
  }, modeKey);
}

test('checkout requires durable storage before its only order POST and recovers confirmed cleanup without another submission', async ({
  page,
}, testInfo) => {
  const observed = observeCheckout(page);
  await openFilledCart(page, testInfo.project.name);
  const before = await snapshotDraft(page);
  const unrelatedSupport = JSON.stringify({
    key: 'local-unrelated-support-attempt',
    payload: JSON.stringify({ message: 'مسودة دعم منفصلة' }),
  });
  await page.evaluate(
    ({ supportKey, unrelatedSupport }) => sessionStorage.setItem(supportKey, unrelatedSupport),
    { supportKey, unrelatedSupport },
  );
  await page.evaluate(installStorageGate, { pendingKey, denyWrite: true, denyRemove: true });
  try {
    const quoteResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/orders/quote' &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
    const quote = await quoteResponse;
    expect(quote.status()).toBe(200);
    const quoteBody = await quote.json();
    expect(quoteBody.success).toBe(true);
    await expect(page.locator('#checkout-storage-feedback')).toContainText('فلم نرسل الطلب');
    await expect(page.locator('#checkout-storage-feedback')).toBeFocused();
    expect(observed.orders).toBe(0);
    expect(observed.quotes).toBe(1);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBeNull();
    expect(await snapshotDraft(page)).toEqual(before);
    await captureFeedback(page, testInfo, 'checkout-storage-write-blocked.png');

    await page.evaluate(() => {
      window.__checkoutStorageGate.denyWrite = false;
    });
    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toHaveCount(0);
    await expect(page.locator('#cart-title')).toBeFocused();
    expect(observed.orders).toBe(0);
    expect(observed.quotes).toBe(1);
    expect(await snapshotDraft(page)).toEqual(before);

    const savedResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/orders' &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
    const saved = await savedResponse;
    expect(saved.status()).toBe(201);
    const { data: order } = await saved.json();
    const sent = saved.request().postDataJSON();
    const key = (await saved.request().allHeaders())['idempotency-key'];
    expect(key).toMatch(/^[A-Za-z0-9-]{16,128}$/);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(2);
    expect(order.total).toBe(quoteBody.data.total);
    await expect(page.locator('#receipt-title')).toBeVisible();
    await expect(page.locator('#receipt-title')).toBeFocused();
    await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible();
    await expect(page.locator('#checkout-storage-feedback')).toContainText('وصل إيصال الطلب');
    const pending = await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)),
      pendingKey,
    );
    expect(pending.key).toBe(key);
    expect(JSON.parse(pending.payload)).toEqual(sent);
    expect(observed.orders).toBe(1);
    expect(observed.quotes).toBe(2);
    await captureFeedback(page, testInfo, 'checkout-storage-cleanup-required.png');

    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toContainText('وصل إيصال الطلب');
    expect(observed.orders).toBe(1);
    expect(
      await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)).key, pendingKey),
    ).toBe(key);
    await page.evaluate(() => {
      window.__checkoutStorageGate.denyRemove = false;
    });
    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toHaveCount(0);
    await expect(page.locator('#receipt-title')).toBeFocused();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBeNull();
    expect(
      await page.evaluate(
        () => JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt')).orderNumber,
      ),
    ).toBe(order.orderNumber);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), supportKey)).toBe(
      unrelatedSupport,
    );
    expect(observed.orders).toBe(1);
    expect(observed.quotes).toBe(2);
    expect(observed.pageErrors).toEqual([]);
    expect(observed.consoleErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await restoreStorageGate(page);
  }
});

test('reload keeps read-denied and corrupt pending checkout locked without changing its cart or delivery draft', async ({
  page,
}, testInfo) => {
  const observed = observeCheckout(page);
  await openFilledCart(page, testInfo.project.name);
  const before = await snapshotDraft(page);
  const saved = await page.evaluate(
    ({ pendingKey, cartKey, modeKey }) => {
      const cart = JSON.parse(localStorage.getItem(cartKey));
      const raw = JSON.stringify({
        key: crypto.randomUUID(),
        payload: JSON.stringify({
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customer: {
            fullName: 'عميل المحاولة السابقة',
            phone: '+201012345678',
            country: 'EG',
            city: 'القاهرة',
            address: 'عنوان المحاولة السابقة، محفوظ للاختبار فقط',
          },
          currency: 'EGP',
        }),
        state: 'uncertain',
      });
      sessionStorage.setItem(pendingKey, raw);
      sessionStorage.setItem(modeKey, 'deny-read');
      return raw;
    },
    { pendingKey, cartKey, modeKey },
  );
  await page.addInitScript(installStorageGate, { pendingKey, modeKey });
  try {
    await page.reload();
    await expect(page.locator('#checkout-storage-feedback')).toContainText('تعذّر التحقق');
    await expect(page.locator('.quantity-control output')).toHaveText('2');
    await expect(page.locator('#checkout-address')).toHaveValue(JSON.parse(before.draft).address);
    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toBeFocused();
    expect(await page.evaluate(() => window.__checkoutStorageGate.savedValue())).toBe(saved);
    expect(await snapshotDraft(page)).toEqual(before);
    expect(observed.orders).toBe(0);
    expect(observed.quotes).toBe(0);
    await captureFeedback(page, testInfo, 'checkout-storage-read-denied.png');

    await page.evaluate(() => {
      window.__checkoutStorageGate.denyRead = false;
    });
    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'إعادة محاولة الطلب السابق', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBe(saved);
    expect(await snapshotDraft(page)).toEqual(before);
    expect(observed.orders).toBe(0);
    expect(observed.quotes).toBe(0);

    const corrupt = '{invalid-private-checkout-record';
    await page.evaluate(
      ({ pendingKey, modeKey, corrupt }) => {
        sessionStorage.setItem(pendingKey, corrupt);
        sessionStorage.setItem(modeKey, 'allow');
      },
      { pendingKey, modeKey, corrupt },
    );
    await page.reload();
    await expect(page.locator('#checkout-storage-feedback')).toContainText('تعذّر التحقق');
    await expect(
      page.getByRole('button', { name: 'إعادة محاولة الطلب السابق', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'إعادة فحص التخزين', exact: true }).click();
    await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
    await expect(page.locator('#checkout-storage-feedback')).toBeFocused();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBe(corrupt);
    expect(await snapshotDraft(page)).toEqual(before);
    await expect(page.locator('body')).not.toContainText(corrupt);
    await captureFeedback(page, testInfo, 'checkout-storage-corrupt-record.png');
    expect(observed.orders).toBe(0);
    expect(observed.quotes).toBe(0);
    expect(observed.pageErrors).toEqual([]);
    expect(observed.consoleErrors).toEqual([]);
  } finally {
    await restoreStorageGate(page);
  }
});
