import { test, expect, withCheckoutQuote } from './local-api.fixture.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

test.use({ trace: 'off', screenshot: 'off' });

const runtime = JSON.parse(
  await readFile(new URL('../outako/backend-api/.local/runtime.json', import.meta.url), 'utf8'),
);

function localOrigin(value, ports) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !ports.includes(Number(url.port)) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Shipping QA requires the local frontend and disposable API.');
  }
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const apiBase = `${apiOrigin}/api`;

async function guardLocalWrites(context, webOrigin) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(request.url()).origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('A nonlocal write was blocked by the shipping QA guard.');
    }
    await route.continue();
  });
}

async function signIn(page, request) {
  const response = await request.post(`${apiBase}/auth/login`, {
    data: { email: runtime.email, password: runtime.password },
  });
  if (!response.ok()) throw new Error('Local admin sign-in failed; credentials suppressed.');
  const { data: session } = await response.json();
  await page.addInitScript((auth) => {
    localStorage.setItem('3d-otaku-access-token', auth.accessToken);
    localStorage.setItem('3d-otaku-refresh-token', auth.refreshToken);
    localStorage.setItem('3d-otaku-auth-user', JSON.stringify(auth.user));
  }, session);
  return { Authorization: `Bearer ${session.accessToken}` };
}

function shippingPanel(page) {
  return page.locator('app-admin-order-shipping');
}

async function reviewShipping(page, fee, note) {
  const panel = shippingPanel(page);
  await panel.locator('#order-shipping-fee').fill(fee);
  await panel.locator('#order-shipping-note').fill(note);
  await panel.locator('#order-shipping-agreement').check();
  await panel.getByRole('button', { name: 'مراجعة رسوم الشحن', exact: true }).click();
  await expect(panel.getByRole('group', { name: 'تأكيد رسوم الشحن' })).toBeVisible();
}

async function confirmShipping(page, endpoint, expectedStatus = 200) {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && response.url().endsWith(endpoint),
  );
  await shippingPanel(page).getByRole('button', { name: 'تأكيد وحفظ الشحن', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(expectedStatus);
  return response;
}

async function reloadShipping(page, orderId) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith(`/api/admin/orders/${orderId}`),
  );
  const panel = shippingPanel(page);
  await panel.getByRole('button', { name: 'تحميل أحدث تفاصيل الطلب', exact: true }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(
    panel.getByRole('status').filter({ hasText: 'تم تحميل أحدث بيانات الطلب' }),
  ).toBeVisible();
}

function invoiceTotal(order, deliveryFee) {
  return (
    (Math.round(order.subtotal * 100) -
      Math.round(order.discount * 100) +
      Math.round(deliveryFee * 100)) /
    100
  );
}

function expectPreservedInvoice(original, updated, expectedManufacturingSnapshots = null) {
  const items =
    expectedManufacturingSnapshots === null
      ? updated.items
      : updated.items.map(({ manufacturingSnapshot, ...item }) => item);
  expect(items).toEqual(original.items);
  if (expectedManufacturingSnapshots !== null) {
    expect(updated.items.map((item) => item.manufacturingSnapshot)).toEqual(
      expectedManufacturingSnapshots,
    );
  }
  expect(updated.customer).toEqual(original.customer);
  expect(updated.subtotal).toBe(original.subtotal);
  expect(updated.discount).toBe(original.discount);
  expect(updated.statusHistory).toEqual(original.statusHistory);
}

async function refreshGuestReceipt(page, original, deliveryFee) {
  const trackedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/orders/track/${original.orderNumber}`),
  );
  await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
  const response = await trackedResponse;
  expect(response.status()).toBe(200);
  const { data: tracked } = await response.json();
  expect(tracked.deliveryFeeConfirmed).toBe(true);
  expect(tracked.deliveryFee).toBe(deliveryFee);
  expect(tracked.total).toBe(invoiceTotal(original, deliveryFee));
  for (const field of [
    'shippingHistory',
    'shippingRevision',
    'idempotencyKey',
    'requestFingerprint',
    'trackingToken',
  ]) {
    expect(Object.hasOwn(tracked, field), `Private field ${field} must not be in tracking`).toBe(
      false,
    );
  }
  const deliveryRow = page
    .locator('.receipt-card > dl > div')
    .filter({ has: page.getByText('الشحن داخل مصر', { exact: true }) });
  await expect(deliveryRow.locator('dd')).toHaveText(`${deliveryFee} ج.م`);
  await expect(page.locator('.receipt-card > dl')).toContainText('إجمالي الطلب');
  const totalRow = page
    .locator('.receipt-card > dl > div')
    .filter({ has: page.getByText('إجمالي الطلب', { exact: true }) });
  const formattedTotal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
    tracked.total,
  );
  await expect(totalRow.locator('dd')).toHaveText(`${formattedTotal} ج.م`);
  await expect(page.locator('.receipt-card .notice')).not.toContainText('هنعرض عليك تكلفة الشحن');
  expect(
    await page.evaluate(() => {
      const receipt = JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt') || 'null');
      return {
        hasToken: typeof receipt?.trackingToken === 'string' && receipt.trackingToken.length === 64,
        total: receipt?.total,
      };
    }),
  ).toEqual({ hasToken: true, total: tracked.total });
  return tracked;
}

test('admin confirms shipping with invoice preservation, stale-draft recovery and private guest tracking', async ({
  page,
  context,
  browser,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  await guardLocalWrites(context, webOrigin);
  const headers = await signIn(page, request);
  const marker = `qa-shipping-${Date.now()}-${testInfo.project.name}`;
  const guestContext = await browser.newContext({
    baseURL: webOrigin,
    viewport: testInfo.project.use.viewport,
    deviceScaleFactor: testInfo.project.use.deviceScaleFactor ?? 1,
    isMobile: testInfo.project.use.isMobile ?? false,
    hasTouch: testInfo.project.use.hasTouch ?? false,
  });
  await guardLocalWrites(guestContext, webOrigin);
  let original = null;
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    const catalog = await request.get(`${apiBase}/products?limit=1`);
    expect(catalog.status()).toBe(200);
    const { data: products } = await catalog.json();
    expect(products.length).toBeGreaterThan(0);
    const created = await request.post(`${apiBase}/orders`, {
      headers: { 'Idempotency-Key': randomUUID() },
      data: await withCheckoutQuote(request, apiOrigin, {
        items: [{ productId: products[0].id, quantity: 1 }],
        customer: {
          fullName: marker,
          phone: '01012345678',
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          address: 'عنوان اختبار الشحن المحلي فقط',
          country: 'EG',
        },
      }),
    });
    expect(created.status()).toBe(201);
    original = (await created.json()).data;
    expect(original.deliveryFeeConfirmed).toBe(false);
    const guestPage = await guestContext.newPage();
    guestPage.on('pageerror', (error) => pageErrors.push(error.message));
    await guestPage.addInitScript((receipt) => {
      if (!sessionStorage.getItem('3d-otaku-order-receipt')) {
        sessionStorage.setItem('3d-otaku-order-receipt', JSON.stringify(receipt));
      }
    }, original);
    await guestPage.goto('/cart');
    await expect(guestPage.locator('.receipt-card > dl')).toContainText('الإجمالي قبل الشحن');

    await page.goto('/admin/orders');
    await page.locator('#operation-search').fill(marker);
    const searched = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'GET' &&
        url.pathname === '/api/admin/orders' &&
        url.searchParams.get('search') === marker
      );
    });
    await page.getByRole('button', { name: 'تطبيق البحث', exact: true }).click();
    expect((await searched).status()).toBe(200);
    await expect(page.locator('.operation-row')).toHaveCount(1);
    const initialDetailResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/admin/orders/${original.id}`,
    );
    await page.locator('.operation-row').getByRole('button').click();
    const initialDetail = (await (await initialDetailResponse).json()).data;
    const manufacturingSnapshots = initialDetail.items.map((item) => item.manufacturingSnapshot);
    expect(manufacturingSnapshots).toHaveLength(original.items.length);
    for (const snapshot of manufacturingSnapshots) expect(snapshot.version).toBe(1);
    await expect(page.locator('#operation-detail-title')).toBeFocused();
    const panel = shippingPanel(page);
    await expect(panel.locator('#order-shipping-fee')).toHaveValue('');
    await expect(
      panel.getByRole('button', { name: 'مراجعة رسوم الشحن', exact: true }),
    ).toBeDisabled();

    const endpoint = `/api/admin/orders/${original.id}/shipping`;
    const writes = [];
    page.on('request', (outgoing) => {
      if (outgoing.method() === 'PATCH' && outgoing.url().endsWith(endpoint)) {
        writes.push(new URL(outgoing.url()).pathname);
      }
    });
    await reviewShipping(page, '49.75', 'ملاحظة إدارية خاصة لا تظهر للعميل');
    expect(writes).toHaveLength(0);
    const firstResponse = await confirmShipping(page, endpoint);
    const first = (await firstResponse.json()).data;
    expect(firstResponse.request().postDataJSON()).toMatchObject({
      deliveryFee: 49.75,
      expectedShippingRevision: 0,
      expectedStatus: 'pending',
      customerAgreementConfirmed: true,
    });
    expect(first.shippingRevision).toBe(1);
    expect(first.shippingHistory).toHaveLength(1);
    expect(first.total).toBe(invoiceTotal(original, 49.75));
    expectPreservedInvoice(original, first);
    expect(writes).toHaveLength(1);
    await refreshGuestReceipt(guestPage, original, 49.75);
    await expect(guestPage.locator('.receipt-card')).not.toContainText('ملاحظة إدارية خاصة');

    await reviewShipping(page, '65.25', 'مسودة اختبار التعارض محفوظة');
    const concurrent = await request.patch(`${apiBase}/admin/orders/${original.id}/shipping`, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: {
        deliveryFee: 70.1,
        expectedShippingRevision: 1,
        expectedStatus: 'pending',
        customerAgreementConfirmed: true,
        note: 'تعديل من جلسة الاختبار الثانية',
      },
    });
    expect(concurrent.status()).toBe(200);
    await confirmShipping(page, endpoint, 409);
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel.locator('#order-shipping-fee')).toHaveValue('65.25');
    await expect(panel.locator('#order-shipping-note')).toHaveValue('مسودة اختبار التعارض محفوظة');
    await reloadShipping(page, original.id);
    await expect(panel.locator('#order-shipping-fee')).toHaveValue('65.25');
    await expect(panel.locator('#order-shipping-agreement')).not.toBeChecked();
    await reviewShipping(page, '65.25', 'مسودة اختبار التعارض محفوظة');
    const recovered = (await (await confirmShipping(page, endpoint)).json()).data;
    expect(recovered.shippingRevision).toBe(3);
    expect(recovered.shippingHistory).toHaveLength(3);
    expectPreservedInvoice(original, recovered);

    let committedLostResponse = null;
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      committedLostResponse = (await response.json()).data;
      await route.abort('failed');
    });
    await reviewShipping(page, '0', 'شحن بلا رسوم لهذا الطلب التجريبي');
    await panel.getByRole('button', { name: 'تأكيد وحفظ الشحن', exact: true }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    expect(committedLostResponse?.shippingRevision).toBe(4);
    expect(committedLostResponse?.deliveryFeeConfirmed).toBe(true);
    await expect(panel.locator('#order-shipping-fee')).toHaveValue('0');
    const writeCountAfterLoss = writes.length;
    await page.unroute(`**${endpoint}`);
    await reloadShipping(page, original.id);
    await expect(panel.locator('#order-shipping-agreement')).not.toBeChecked();
    await expect(panel.locator('.field-error')).toHaveCount(0);
    expect(writes).toHaveLength(writeCountAfterLoss);
    const latest = await request.get(`${apiBase}/admin/orders/${original.id}`, { headers });
    expect(latest.status()).toBe(200);
    const { data: current } = await latest.json();
    expect(current.shippingRevision).toBe(4);
    expect(current.shippingHistory).toHaveLength(4);
    expect(current.deliveryFee).toBe(0);
    expect(current.total).toBe(invoiceTotal(original, 0));
    expectPreservedInvoice(original, current, manufacturingSnapshots);
    await refreshGuestReceipt(guestPage, original, 0);
    expect((await request.get(`${apiBase}/orders/track/${original.orderNumber}`)).status()).toBe(
      404,
    );
    for (const target of [page, guestPage]) {
      expect(
        await target.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
    await mkdir('artifacts/browser', { recursive: true });
    await panel.screenshot({
      path: `artifacts/browser/order-shipping-admin-${testInfo.project.name}.png`,
    });
    await guestPage.locator('.receipt-card').screenshot({
      path: `artifacts/browser/order-shipping-receipt-${testInfo.project.name}.png`,
    });

    const publicFollowupNote = 'تم إلغاء الطلب التجريبي؛ تواصل معنا لو محتاج توضيحًا.';
    const cancelled = await request.patch(`${apiBase}/admin/orders/${original.id}/status`, {
      headers,
      data: { status: 'cancelled', expectedStatus: 'pending', publicNote: publicFollowupNote },
    });
    expect(cancelled.status()).toBe(200);
    await refreshGuestReceipt(guestPage, original, 0);
    await expect(guestPage.getByRole('list', { name: 'تحديثات حالة الطلب' })).toContainText(
      publicFollowupNote,
    );
    await expect(guestPage.getByRole('list', { name: 'تحديثات حالة الطلب' })).toContainText('ملغي');
    await expect(guestPage.locator('.receipt-card')).not.toContainText(
      'شحن بلا رسوم لهذا الطلب التجريبي',
    );
    const terminalWrite = await request.patch(`${apiBase}/admin/orders/${original.id}/shipping`, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: {
        deliveryFee: 15,
        expectedShippingRevision: 4,
        expectedStatus: 'cancelled',
        customerAgreementConfirmed: true,
      },
    });
    expect(terminalWrite.status()).toBe(409);
    await page.reload();
    await page.locator('#operation-search').fill(marker);
    await page.getByRole('button', { name: 'تطبيق البحث', exact: true }).click();
    await expect(page.locator('.operation-row')).toHaveCount(1);
    await page.locator('.operation-row').getByRole('button').click();
    await expect(page.locator('.detail-reference')).toContainText('ملغي');
    await expect(panel.locator('#order-shipping-fee')).toBeDisabled();
    expect(pageErrors).toEqual([]);
  } finally {
    await guestContext.close();
    if (original) {
      const response = await request.get(`${apiBase}/admin/orders/${original.id}`, { headers });
      expect(response.status()).toBe(200);
      const { data: record } = await response.json();
      expect(record.customer.fullName).toBe(marker);
      if (record.allowedNextStatuses.includes('cancelled')) {
        const cancelled = await request.patch(`${apiBase}/admin/orders/${original.id}/status`, {
          headers,
          data: { status: 'cancelled', expectedStatus: record.status },
        });
        expect(cancelled.status()).toBe(200);
      }
    }
  }
});
