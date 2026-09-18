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
  )
    throw new Error('Payment QA requires the local frontend and disposable API.');
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const apiBase = `${apiOrigin}/api`;
const summaryKeys = [
  'balanceDue',
  'credit',
  'recordedCollected',
  'recordedNet',
  'recordedRefunded',
  'shippingConfirmed',
  'state',
];

async function guardLocalWrites(context, webOrigin) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(request.url()).origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('A nonlocal write was blocked by the payment QA guard.');
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

async function createOrder(request, marker) {
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
        address: 'عنوان اختبار سجل الأموال المحلي فقط',
        country: 'EG',
      },
    }),
  });
  expect(created.status()).toBe(201);
  return (await created.json()).data;
}

async function openOrder(page, marker) {
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
  await page.locator('.operation-row').getByRole('button').click();
  await expect(page.locator('#operation-detail-title')).toBeFocused();
  await expect(paymentPanel(page)).toBeVisible();
}

function paymentPanel(page) {
  return page.locator('app-admin-order-payments');
}

async function reviewPayment(
  page,
  { amount, refund = false, bank = false, reference = '', note = '' },
) {
  const panel = paymentPanel(page);
  await panel
    .locator('#order-payment-kind')
    .selectOption({ label: refund ? 'رد مبلغ تم بالفعل' : 'تحصيل تم بالفعل' });
  await panel.locator('#order-payment-amount').fill(String(amount));
  await panel
    .locator('#order-payment-method')
    .selectOption({ label: bank ? 'تحويل بنكي' : 'نقدًا' });
  await panel.locator('#order-payment-reference').fill(reference);
  await panel.locator('#order-payment-note').fill(note);
  await panel.locator('#order-payment-completed').check();
  await panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }).click();
  await expect(panel.getByRole('group', { name: 'تأكيد تسجيل عملية مالية' })).toBeVisible();
}

async function confirmPayment(page, endpoint, { status = 201, correction = false } = {}) {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith(endpoint),
  );
  await paymentPanel(page)
    .getByRole('button', {
      name: correction ? 'تأكيد تصحيح القيد' : 'تأكيد تسجيل العملية',
      exact: true,
    })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(status);
  if (status === 201 || status === 200) {
    await expect(
      paymentPanel(page).getByRole('status').filter({ hasText: 'تم تسجيل العملية المؤكدة' }),
    ).toBeVisible();
  }
  return response;
}

async function recoverAttempt(page, endpoint, recorded) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && response.url().endsWith(`${endpoint}/attempt`),
  );
  await paymentPanel(page)
    .getByRole('button', { name: 'التحقق من المحاولة السابقة', exact: true })
    .click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.recorded).toBe(recorded);
  return data;
}

function paymentContext(order) {
  return {
    expectedPaymentRevision: order.paymentRevision,
    expectedShippingRevision: order.shippingRevision,
    expectedStatus: order.status,
    expectedTotal: order.total,
    expectedDeliveryFeeConfirmed: order.deliveryFeeConfirmed,
  };
}

function expectInvoicePreserved(original, updated) {
  for (const field of [
    'orderNumber',
    'currency',
    'paymentMethod',
    'createdAt',
    'items',
    'customer',
    'subtotal',
    'discount',
    'deliveryFee',
    'deliveryFeeConfirmed',
    'total',
    'status',
    'statusHistory',
  ]) {
    expect(updated[field], `${field} must not change when recording funds`).toEqual(
      original[field],
    );
  }
}

async function refreshReceipt(page, original, expected) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/orders/track/${original.orderNumber}`),
  );
  await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.paymentSummary).toMatchObject(expected);
  expect(Object.keys(data.paymentSummary).sort()).toEqual(summaryKeys);
  for (const field of [
    'paymentHistory',
    'paymentRevision',
    'requestKey',
    'requestFingerprint',
    'shippingHistory',
    'shippingRevision',
    'trackingToken',
  ]) {
    expect(Object.hasOwn(data, field), `Private field ${field} must not be in tracking`).toBe(
      false,
    );
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const receipt = JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt') || 'null');
        return {
          summary: receipt?.paymentSummary,
          hasToken:
            typeof receipt?.trackingToken === 'string' && receipt.trackingToken.length === 64,
        };
      }),
    )
    .toEqual({ summary: data.paymentSummary, hasToken: true });
  return data;
}

async function expectSummaryAmount(page, label, amount) {
  const row = page
    .locator('.receipt-card app-order-payment-summary dl > div')
    .filter({ has: page.getByText(label, { exact: true }) });
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  await expect(row.locator('dd')).toHaveText(`${formatted} ج.م`);
}

async function cancelSyntheticOrder(request, headers, original, marker) {
  if (!original) return;
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

test('recorded funds preserve invoices, recover a lost response after reload, and distinguish refunds from clerical correction', async ({
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
  const marker = `qa-payments-${Date.now()}-${testInfo.project.name}`;
  const guestContext = await browser.newContext({
    baseURL: webOrigin,
    viewport: testInfo.project.use.viewport,
    deviceScaleFactor: testInfo.project.use.deviceScaleFactor ?? 1,
    isMobile: testInfo.project.use.isMobile ?? false,
    hasTouch: testInfo.project.use.hasTouch ?? false,
  });
  await guardLocalWrites(guestContext, webOrigin);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let original = null;
  try {
    original = await createOrder(request, marker);
    expect(original.deliveryFeeConfirmed).toBe(false);
    const endpoint = `/api/admin/orders/${original.id}/payments`;
    const attempts = [];
    page.on('request', (outgoing) => {
      if (outgoing.method() === 'POST' && new URL(outgoing.url()).pathname.startsWith(endpoint)) {
        attempts.push({
          path: new URL(outgoing.url()).pathname,
          key: outgoing.headers()['idempotency-key'],
          body: outgoing.postDataJSON(),
        });
      }
    });
    const guestPage = await guestContext.newPage();
    guestPage.on('pageerror', (error) => pageErrors.push(error.message));
    await guestPage.addInitScript((receipt) => {
      if (!sessionStorage.getItem('3d-otaku-order-receipt'))
        sessionStorage.setItem('3d-otaku-order-receipt', JSON.stringify(receipt));
    }, original);
    await guestPage.goto('/cart');
    const publicSummary = guestPage.locator('.receipt-card app-order-payment-summary');
    await expect(publicSummary.locator('.summary-state')).toHaveText('لا توجد دفعات مسجلة');
    await expect(publicSummary.locator('dl')).toHaveCount(0);
    await openOrder(page, marker);
    const panel = paymentPanel(page);
    await expect(panel.locator('#order-payment-amount')).toHaveValue('');
    await expect(
      panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }),
    ).toBeDisabled();
    const privateReference = `qa-bank-${randomUUID()}`;
    const privateNote = 'ملاحظة تحصيل خاصة بالإدارة فقط';
    await reviewPayment(page, {
      amount: '75.25',
      bank: true,
      reference: privateReference,
      note: privateNote,
    });
    expect(attempts).toHaveLength(0);
    await expect(page.locator('app-admin-order-shipping #order-shipping-fee')).toBeDisabled();
    const firstResult = (await (await confirmPayment(page, endpoint)).json()).data;
    const first = firstResult.order;
    expect(firstResult.replayed).toBe(false);
    expect(first.paymentRevision).toBe(1);
    expect(first.paymentHistory).toHaveLength(1);
    expectInvoicePreserved(original, first);
    await refreshReceipt(guestPage, original, {
      state: 'shipping-unconfirmed',
      recordedNet: 75.25,
      balanceDue: null,
      credit: null,
    });
    await expectSummaryAmount(guestPage, 'صافي المبالغ المسجلة', 75.25);
    await expect(publicSummary.locator('.summary-state')).toHaveText(
      'الرصيد النهائي ينتظر تأكيد الشحن',
    );
    await expect(guestPage.locator('.receipt-card')).not.toContainText(privateReference);
    await expect(guestPage.locator('.receipt-card')).not.toContainText(privateNote);

    const shipping = page.locator('app-admin-order-shipping');
    await shipping.locator('#order-shipping-fee').fill('49.75');
    await shipping.locator('#order-shipping-agreement').check();
    await shipping.getByRole('button', { name: 'مراجعة رسوم الشحن', exact: true }).click();
    await expect(panel.locator('#order-payment-amount')).toBeDisabled();
    const shippingResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith(`/api/admin/orders/${original.id}/shipping`),
    );
    await shipping.getByRole('button', { name: 'تأكيد وحفظ الشحن', exact: true }).click();
    expect((await shippingResponse).status()).toBe(200);
    await expect(
      shipping.getByRole('status').filter({ hasText: 'تم حفظ رسوم الشحن المتفق عليها' }),
    ).toBeVisible();
    const shipped = await refreshReceipt(guestPage, original, {
      state: 'recorded-balance',
      recordedNet: 75.25,
      shippingConfirmed: true,
    });
    expect(shipped.total).toBe((Math.round(original.total * 100) + 4975) / 100);
    await expectSummaryAmount(
      guestPage,
      'المتبقي حسب السجل',
      Math.max((Math.round(shipped.total * 100) - 7525) / 100, 0),
    );

    let committedLostResponse = null;
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      committedLostResponse = (await response.json()).data;
      await route.abort('failed');
    });
    await reviewPayment(page, { amount: '25.10', note: 'تحصيل محلي مع فقدان الرد' });
    await panel.getByRole('button', { name: 'تأكيد تسجيل العملية', exact: true }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    expect(committedLostResponse?.order.paymentRevision).toBe(2);
    await expect(panel.locator('#order-payment-amount')).toBeDisabled();
    const attemptsAfterLoss = attempts.length;
    await page.unroute(`**${endpoint}`);
    await page.reload();
    await openOrder(page, marker);
    expect(attempts).toHaveLength(attemptsAfterLoss);
    await expect(panel.locator('#order-payment-amount')).toHaveValue('25.1');
    await expect(panel.locator('#order-payment-amount')).toBeDisabled();
    const recovered = await recoverAttempt(page, endpoint, true);
    expect(recovered.entryId).toBe(committedLostResponse.entryId);
    expect(recovered.order.paymentHistory).toHaveLength(2);
    expect(recovered.order.paymentSummary.recordedNet).toBe(100.35);
    await expect(
      panel.getByRole('status').filter({ hasText: 'تم العثور على المحاولة الأصلية' }),
    ).toBeVisible();
    expect(attempts).toHaveLength(attemptsAfterLoss);
    expect(
      await page.evaluate(
        (id) => sessionStorage.getItem(`3d-otaku-admin-payment-attempt:${id}`),
        original.id,
      ),
    ).toBeNull();

    await reviewPayment(page, {
      amount: '10.05',
      refund: true,
      note: 'رد مبلغ خارجي تم بالفعل للاختبار',
    });
    const refund = (await (await confirmPayment(page, endpoint)).json()).data.order;
    expect(refund.paymentSummary).toMatchObject({
      recordedCollected: 100.35,
      recordedRefunded: 10.05,
      recordedNet: 90.3,
    });
    expectInvoicePreserved(recovered.order, refund);
    const firstRow = panel.locator(`[data-entry-id="${firstResult.entryId}"]`);
    await firstRow.getByRole('button', { name: 'تصحيح هذا القيد', exact: true }).click();
    await panel
      .locator('#order-payment-correction-note')
      .fill('خطأ كتابي في مبلغ التحصيل الأول، دون حركة أموال جديدة');
    await panel.locator('#order-payment-correction-confirmed').check();
    await panel.locator('#order-payment-no-money-moved').check();
    const countBeforeCorrection = attempts.length;
    await panel.getByRole('button', { name: 'مراجعة تصحيح القيد', exact: true }).click();
    await expect(panel.getByRole('group', { name: 'تأكيد التصحيح الإداري' })).toBeVisible();
    expect(attempts).toHaveLength(countBeforeCorrection);
    const correction = (
      await (
        await confirmPayment(page, `${endpoint}/${firstResult.entryId}/correction`, {
          correction: true,
        })
      ).json()
    ).data.order;
    expect(correction.paymentHistory).toHaveLength(4);
    expect(correction.paymentHistory[0].isCorrected).toBe(true);
    expect(correction.paymentHistory[3]).toMatchObject({
      kind: 'correction',
      correctionOfEntryId: firstResult.entryId,
      amount: 75.25,
      noMoneyMovedConfirmed: true,
    });
    expect(correction.paymentSummary).toMatchObject({
      recordedCollected: 25.1,
      recordedRefunded: 10.05,
      recordedNet: 15.05,
    });
    expectInvoicePreserved(refund, correction);
    await reviewPayment(page, {
      amount: '70.25',
      bank: true,
      reference: privateReference,
      note: 'المبلغ الصحيح بعد توثيق التصحيح',
    });
    const rerecorded = (await (await confirmPayment(page, endpoint)).json()).data.order;
    expect(rerecorded.paymentHistory).toHaveLength(5);
    expect(rerecorded.paymentSummary).toMatchObject({
      recordedCollected: 95.35,
      recordedRefunded: 10.05,
      recordedNet: 85.3,
    });
    await refreshReceipt(guestPage, original, {
      state: 'recorded-balance',
      recordedNet: 85.3,
      recordedRefunded: 10.05,
    });
    await expectSummaryAmount(guestPage, 'المبالغ المستردة المسجلة', 10.05);
    await expectSummaryAmount(guestPage, 'صافي المبالغ المسجلة', 85.3);
    for (const target of [page, guestPage]) {
      expect(
        await target.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
    await mkdir('artifacts/browser', { recursive: true });
    await panel.screenshot({
      path: `artifacts/browser/order-payments-admin-${testInfo.project.name}.png`,
    });
    await guestPage.locator('.receipt-card').screenshot({
      path: `artifacts/browser/order-payments-receipt-${testInfo.project.name}.png`,
    });

    const cancelledResponse = await request.patch(`${apiBase}/admin/orders/${original.id}/status`, {
      headers,
      data: { status: 'cancelled', expectedStatus: 'pending' },
    });
    expect(cancelledResponse.status()).toBe(200);
    const cancelled = (await cancelledResponse.json()).data;
    await refreshReceipt(guestPage, original, {
      state: 'settlement-review',
      recordedNet: 85.3,
      balanceDue: null,
      credit: null,
    });
    await expect(publicSummary.locator('.summary-state')).toHaveText(
      'الطلب الملغى يحتاج مراجعة التسوية',
    );
    await expect(publicSummary.getByText('المتبقي حسب السجل', { exact: true })).toHaveCount(0);
    const finalRefundResponse = await request.post(
      `${apiBase}/admin/orders/${original.id}/payments`,
      {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: {
          ...paymentContext(cancelled),
          kind: 'refund',
          amount: 85.3,
          method: 'cash',
          transactionCompletedConfirmed: true,
        },
      },
    );
    expect(finalRefundResponse.status()).toBe(201);
    await refreshReceipt(guestPage, original, {
      state: 'settlement-review',
      recordedNet: 0,
      recordedRefunded: 95.35,
      balanceDue: null,
      credit: null,
    });
    expect((await request.get(`${apiBase}/orders/track/${original.orderNumber}`)).status()).toBe(
      404,
    );
    expect(pageErrors).toEqual([]);
  } finally {
    await guestContext.close();
    await cancelSyntheticOrder(request, headers, original, marker);
  }
});

test('a negative attempt read permits only the exact retry and a definite stale rejection requires a fresh review', async ({
  page,
  context,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  await guardLocalWrites(context, localOrigin(baseURL, [4200, 4300]));
  const headers = await signIn(page, request);
  const marker = `qa-payment-retry-${Date.now()}-${testInfo.project.name}`;
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let original = null;
  try {
    original = await createOrder(request, marker);
    const endpoint = `/api/admin/orders/${original.id}/payments`;
    const attempts = [];
    page.on('request', (outgoing) => {
      if (outgoing.method() === 'POST' && outgoing.url().endsWith(endpoint))
        attempts.push({
          key: outgoing.headers()['idempotency-key'],
          body: outgoing.postDataJSON(),
        });
    });
    await openOrder(page, marker);
    const panel = paymentPanel(page);
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.abort('failed');
    });
    await reviewPayment(page, { amount: '3.25', note: 'محاولة لم تصل قبل انقطاع الاتصال' });
    await panel.getByRole('button', { name: 'تأكيد تسجيل العملية', exact: true }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    const negative = await recoverAttempt(page, endpoint, false);
    expect(negative.order.paymentHistory).toHaveLength(0);
    await expect(panel.locator('#order-payment-amount')).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }),
    ).toBeDisabled();
    const retryResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith(endpoint),
    );
    await panel.getByRole('button', { name: 'إعادة نفس المحاولة المحفوظة', exact: true }).click();
    const response = await retryResponse;
    expect(response.status()).toBe(201);
    const retried = (await response.json()).data.order;
    await expect(
      panel.getByRole('status').filter({ hasText: 'تم تسجيل العملية المؤكدة' }),
    ).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    expect(retried.paymentHistory).toHaveLength(1);
    expect(retried.paymentSummary.recordedNet).toBe(3.25);

    await reviewPayment(page, {
      amount: '2.15',
      note: 'مسودة محفوظة بعد تعديل سجل الأموال من جلسة ثانية',
    });
    const concurrentResponse = await request.post(
      `${apiBase}/admin/orders/${original.id}/payments`,
      {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: {
          ...paymentContext(retried),
          kind: 'collection',
          amount: 1.1,
          method: 'cash',
          transactionCompletedConfirmed: true,
        },
      },
    );
    expect(concurrentResponse.status()).toBe(201);
    await confirmPayment(page, endpoint, { status: 409 });
    await expect(panel.getByRole('alert')).toBeVisible();
    const recovery = await recoverAttempt(page, endpoint, false);
    expect(recovery.order.paymentHistory).toHaveLength(2);
    await expect(panel.locator('#order-payment-amount')).toHaveValue('2.15');
    await expect(panel.locator('#order-payment-completed')).not.toBeChecked();
    await expect(
      panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }),
    ).toBeDisabled();
    await panel.locator('#order-payment-completed').check();
    await panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }).click();
    const fresh = (await (await confirmPayment(page, endpoint)).json()).data.order;
    expect(fresh.paymentHistory).toHaveLength(3);
    expect(fresh.paymentSummary.recordedNet).toBe(6.5);
    expect(attempts).toHaveLength(4);
    expect(attempts[3].key).not.toBe(attempts[2].key);
    expect(attempts[3].body.expectedPaymentRevision).toBe(2);
    expectInvoicePreserved(original, fresh);
    expect(pageErrors).toEqual([]);
  } finally {
    await cancelSyntheticOrder(request, headers, original, marker);
  }
});

test('an uncertain attempt overtaken by another collection recovers without a permanent lock or duplicate entry', async ({
  page,
  context,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  await guardLocalWrites(context, localOrigin(baseURL, [4200, 4300]));
  const headers = await signIn(page, request);
  const marker = `qa-payment-terminal-${Date.now()}-${testInfo.project.name}`;
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let original = null;
  try {
    original = await createOrder(request, marker);
    const endpoint = `/api/admin/orders/${original.id}/payments`;
    const attempts = [];
    page.on('request', (outgoing) => {
      if (outgoing.method() === 'POST' && outgoing.url().endsWith(endpoint))
        attempts.push({
          key: outgoing.headers()['idempotency-key'],
          body: outgoing.postDataJSON(),
        });
    });
    await openOrder(page, marker);
    const panel = paymentPanel(page);
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.abort('failed');
    });
    await reviewPayment(page, { amount: '7.35', note: 'محاولة معلقة قبل تحديث السجل' });
    await panel.getByRole('button', { name: 'تأكيد تسجيل العملية', exact: true }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    const negative = await recoverAttempt(page, endpoint, false);
    expect(negative.order.paymentHistory).toHaveLength(0);
    await expect(panel.locator('#order-payment-amount')).toBeDisabled();
    const concurrent = await request.post(`${apiBase}/admin/orders/${original.id}/payments`, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: {
        ...paymentContext(negative.order),
        kind: 'collection',
        amount: 2.4,
        method: 'cash',
        transactionCompletedConfirmed: true,
      },
    });
    expect(concurrent.status()).toBe(201);
    const responsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith(endpoint),
    );
    await panel.getByRole('button', { name: 'إعادة نفس المحاولة المحفوظة', exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(409);
    expect((await response.json()).errors.paymentNotRecorded.length).toBeGreaterThan(0);
    await expect(panel.getByRole('alert')).toContainText('لن تُسجّل لاحقًا بهذه البيانات');
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    await expect(
      panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole('button', { name: 'إعادة نفس المحاولة المحفوظة', exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await openOrder(page, marker);
    await expect(panel.getByRole('status')).toContainText('لم تُقبل محاولة التسجيل السابقة');
    const recovered = await recoverAttempt(page, endpoint, false);
    expect(recovered.order.paymentHistory).toHaveLength(1);
    expect(recovered.order.paymentSummary.recordedNet).toBe(2.4);
    await expect(
      panel.getByRole('status').filter({ hasText: 'لم تُسجّل المحاولة المرفوضة' }),
    ).toBeVisible();
    await expect(panel.locator('#order-payment-amount')).toHaveValue('7.35');
    await expect(panel.locator('#order-payment-completed')).not.toBeChecked();
    await expect(
      panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }),
    ).toBeDisabled();
    expect(attempts).toHaveLength(2);
    await panel.locator('#order-payment-completed').check();
    await panel.getByRole('button', { name: 'مراجعة تسجيل العملية', exact: true }).click();
    const recorded = (await (await confirmPayment(page, endpoint)).json()).data.order;
    expect(attempts).toHaveLength(3);
    expect(attempts[2].key).not.toBe(attempts[0].key);
    expect(attempts[2].body.expectedPaymentRevision).toBe(1);
    expect(recorded.paymentHistory).toHaveLength(2);
    expect(recorded.paymentSummary.recordedNet).toBe(9.75);
    expectInvoicePreserved(original, recorded);
    expect(pageErrors).toEqual([]);
  } finally {
    await cancelSyntheticOrder(request, headers, original, marker);
  }
});
