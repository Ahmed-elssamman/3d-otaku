import { test, expect, withCheckoutQuote } from './local-api.fixture.mjs';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';

test.use({ trace: 'off', screenshot: 'off' });

const runtime = JSON.parse(
  await readFile(new URL('../outako/backend-api/.local/runtime.json', import.meta.url), 'utf8'),
);

function localOrigin(value, ports) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !ports.includes(Number(url.port))
  ) {
    throw new Error('Operations QA can run only against the local frontend and API.');
  }
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const apiBase = `${apiOrigin}/api`;

test.beforeEach(async ({ page, baseURL }) => {
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(request.url()).origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('A nonlocal write was blocked by the operations QA guard.');
    }
    await route.continue();
  });
});

async function signIn(page, request) {
  const response = await request.post(`${apiBase}/auth/login`, {
    data: { email: runtime.email, password: runtime.password },
  });
  if (!response.ok()) throw new Error('Local admin sign-in failed; credential details suppressed.');
  const { data: session } = await response.json();
  await installSession(page, session);
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function installSession(page, session) {
  await page.addInitScript((auth) => {
    localStorage.setItem('3d-otaku-access-token', auth.accessToken);
    localStorage.setItem('3d-otaku-refresh-token', auth.refreshToken);
    localStorage.setItem('3d-otaku-auth-user', JSON.stringify(auth.user));
  }, session);
}

async function createFixture(request, endpoint, payload) {
  const data =
    endpoint === 'orders' ? await withCheckoutQuote(request, apiOrigin, payload) : payload;
  const response = await request.post(`${apiBase}/${endpoint}`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data,
  });
  expect(response.status(), `Create local ${endpoint} fixture`).toBe(201);
  return (await response.json()).data;
}

async function searchRecords(page, marker) {
  await page.locator('#operation-search').fill(marker);
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname.includes('/api/admin/') &&
      url.searchParams.get('search') === marker
    );
  });
  await page.getByRole('button', { name: 'تطبيق البحث', exact: true }).click();
  expect((await responsePromise).ok()).toBe(true);
}

async function openFirstRecord(page) {
  await page.locator('.operation-row').first().getByRole('button').click();
  await expect(page.locator('.detail-reference')).toBeVisible();
  await expect(page.locator('#operation-detail-title')).toBeFocused();
}

async function changeStatus(page, label, endpoint, expectedStatus, note = '') {
  await page.locator('#operation-next-status').selectOption({ label });
  if (note) await page.locator('#operation-note').fill(note);
  let writes = 0;
  const countWrites = (request) => {
    if (request.method() === 'PATCH' && request.url().endsWith(endpoint)) writes += 1;
  };
  page.on('request', countWrites);
  try {
    await page.getByRole('button', { name: 'مراجعة التغيير', exact: true }).click();
    await expect(page.getByRole('group', { name: 'تأكيد تغيير الحالة' })).toBeVisible();
    expect(writes, 'Reviewing a change must not mutate its status').toBe(0);
    const responsePromise = page
      .waitForResponse(
        (response) => response.request().method() === 'PATCH' && response.url().endsWith(endpoint),
      )
      .then(async (response) => ({ response, data: (await response.json()).data }));
    await page.getByRole('button', { name: 'تأكيد وحفظ الحالة', exact: true }).click();
    const { response, data } = await responsePromise;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON().expectedStatus).toBe(expectedStatus);
    await expect(
      page.getByText('تم حفظ الحالة وتحديث سجل المتابعة.', { exact: true }),
    ).toBeVisible();
    expect(writes).toBe(1);
    return data;
  } finally {
    page.off('request', countWrites);
  }
}

async function finishFixture(request, headers, kind, id, marker, status) {
  if (!id) return;
  const endpoint = `${apiBase}/admin/${kind}/${id}`;
  const response = await request.get(endpoint, { headers });
  expect(response.ok()).toBe(true);
  const { data: record } = await response.json();
  expect(kind === 'orders' ? record.customer.fullName : record.fullName).toBe(marker);
  if (record.status === status || !record.allowedNextStatuses.includes(status)) return;
  const updated = await request.patch(`${endpoint}/status`, {
    headers,
    data: { status, expectedStatus: record.status },
  });
  expect(updated.ok()).toBe(true);
}

test('admin manages real orders, custom requests and contact messages with paging and conflict recovery', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(120000);
  const marker = `qa-ops-${Date.now()}-${testInfo.project.name}`;
  const headers = await signIn(page, request);
  const fixtures = { order: null, custom: null, messages: [] };
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    const catalog = await request.get(`${apiBase}/products?limit=1`);
    expect(catalog.ok()).toBe(true);
    const { data: products } = await catalog.json();
    expect(products.length).toBeGreaterThan(0);
    fixtures.order = await createFixture(request, 'orders', {
      items: [{ productId: products[0].id, quantity: 1 }],
      customer: {
        fullName: marker,
        phone: '01012345678',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        address: 'عنوان اختبار محلي فقط',
        country: 'EG',
      },
    });
    fixtures.custom = await createFixture(request, 'custom-orders', {
      fullName: marker,
      phone: '01012345678',
      productIdea: 'desk-model',
      description: 'قطعة مكتب للاختبار المحلي فقط',
      preferredColor: 'أخضر',
      estimatedSize: '10 سم',
      preferredMaterial: 'PLA+',
      quantity: 2,
      designSource: 'written-idea',
      rightsConfirmed: true,
    });
    const messageCount = testInfo.project.name === 'desktop' ? 11 : 1;
    for (let index = 0; index < messageCount; index += 1) {
      fixtures.messages.push(
        await createFixture(request, 'contact-messages', {
          fullName: marker,
          email: 'local-operations@example.test',
          phone: '01012345678',
          subject: `استفسار تجريبي ${index + 1}`,
          message: 'رسالة اختبار محلية لمتابعة الإدارة فقط.',
        }),
      );
    }

    await page.goto('/admin/orders');
    await expect(page.locator('#operations-title')).toHaveText('طلبات المتجر');
    await searchRecords(page, marker);
    await expect(page.locator('.operation-row')).toHaveCount(1);
    const detailResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/admin/orders/${fixtures.order.id}`,
    );
    await openFirstRecord(page);
    const savedDetail = (await (await detailResponse).json()).data;
    expect(savedDetail.items[0].configuration).toEqual(fixtures.order.items[0].configuration);
    expect(savedDetail.items[0].manufacturingSnapshot.version).toBe(1);
    expect(fixtures.order.items[0]).not.toHaveProperty('manufacturingSnapshot');
    await expect(page.locator('.detail-fields')).toContainText('القاهرة');
    await expect(page.locator('.detail-fields')).toContainText('مدينة نصر');
    await expect(page.locator('.order-items')).toContainText(products[0].name);
    const purchasedSpecs = page.locator('.order-items app-order-item-configuration').first();
    await purchasedSpecs.locator('summary').click();
    await expect(purchasedSpecs.locator('dl')).toBeVisible();
    await expect(purchasedSpecs).toContainText('الخامة');
    const manufacturing = page.locator('.manufacturing-snapshot').first();
    await manufacturing.locator('summary').click();
    await expect(manufacturing.locator('.snapshot-fields')).toBeVisible();
    const modelReference = savedDetail.items[0].manufacturingSnapshot.modelUrl || 'غير مسجل';
    const modelRow = manufacturing.getByText('مرجع ملف النموذج', { exact: true }).locator('..');
    await expect(modelRow).toContainText(modelReference);
    await modelRow.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/browser/order-manufacturing-${testInfo.project.name}.png`,
    });
    await expect(page.locator('#operation-next-status option')).toHaveText([
      'اختر الحالة',
      'قيد التجهيز',
      'ملغي',
    ]);
    const orderEndpoint = `/api/admin/orders/${fixtures.order.id}/status`;
    const processed = await changeStatus(
      page,
      'قيد التجهيز',
      orderEndpoint,
      'pending',
      'بدأ تجهيز طلب الاختبار',
    );
    expect(processed.status).toBe('processing');
    expect(processed.items[0]).not.toHaveProperty('manufacturingSnapshot');
    await expect(manufacturing.locator('.snapshot-fields')).toBeVisible();
    await expect(modelRow).toContainText(modelReference);
    expect(processed.statusHistory.at(-1).publicNote).toBe('بدأ تجهيز طلب الاختبار');
    expect(Object.hasOwn(processed, 'trackingToken')).toBe(false);
    expect(Object.hasOwn(processed, 'idempotencyKey')).toBe(false);
    const tracked = await request.get(`${apiBase}/orders/track/${fixtures.order.orderNumber}`, {
      headers: { 'X-Order-Token': fixtures.order.trackingToken },
    });
    expect((await tracked.json()).data.statusHistory.at(-1).publicNote).toBe(
      'بدأ تجهيز طلب الاختبار',
    );

    await page.locator('#operation-next-status').selectOption({ label: 'ملغي' });
    await page.getByRole('button', { name: 'مراجعة التغيير', exact: true }).click();
    const externalChange = await request.patch(
      `${apiBase}/admin/orders/${fixtures.order.id}/status`,
      {
        headers,
        data: {
          status: 'printed',
          expectedStatus: 'processing',
          publicNote: 'اكتملت الطباعة في جلسة الاختبار الثانية',
        },
      },
    );
    expect(externalChange.ok()).toBe(true);
    const conflictPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(orderEndpoint) && response.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'تأكيد وحفظ الحالة', exact: true }).click();
    expect((await conflictPromise).status()).toBe(409);
    await expect(page.getByRole('alert')).toContainText('تغيّرت الحالة بواسطة جلسة أخرى');
    await expect(page.getByRole('button', { name: 'مراجعة التغيير', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'إعادة تحميل التفاصيل', exact: true }).click();
    await expect(page.locator('.detail-reference')).toContainText('تمت الطباعة');
    await changeStatus(page, 'ملغي', orderEndpoint, 'printed');
    await expect(page.getByText('لا توجد انتقالات أخرى متاحة لهذه الحالة.')).toBeVisible();

    await page.route('**/api/admin/custom-orders?*', (route) => route.abort('failed'));
    await page.goto('/admin/custom-orders');
    await expect(page.getByRole('alert')).toContainText('تعذّر تحميل القائمة');
    await page.unroute('**/api/admin/custom-orders?*');
    await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
    await searchRecords(page, marker);
    await openFirstRecord(page);
    await expect(page.locator('.detail-fields')).toContainText('قطعة للمكتب أو ترتيب الأدوات');
    await expect(page.locator('.detail-fields')).toContainText('PLA+');
    await expect(page.locator('#operation-note-hint')).toContainText('للإدارة');
    const customEndpoint = `/api/admin/custom-orders/${fixtures.custom.id}/status`;
    const contacted = await changeStatus(
      page,
      'تم التواصل',
      customEndpoint,
      'pending',
      'متابعة داخلية للاختبار فقط',
    );
    expect(contacted.statusHistory.at(-1).note).toBe('متابعة داخلية للاختبار فقط');
    await page.reload();
    await searchRecords(page, marker);
    await openFirstRecord(page);
    await expect(page.locator('.history')).toContainText('متابعة داخلية للاختبار فقط');

    await page.goto('/admin/contact-messages');
    await searchRecords(page, marker);
    await expect(page.locator('.operation-row')).toHaveCount(Math.min(messageCount, 10));
    if (messageCount > 10) {
      const pagePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).searchParams.get('page') === '2' &&
          response.url().includes('/api/admin/contact-messages'),
      );
      await page.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
      const paged = await pagePromise;
      expect(paged.ok()).toBe(true);
      expect((await paged.json()).meta.totalItems).toBe(11);
      await expect(page.locator('.operation-row')).toHaveCount(1);
    }
    await openFirstRecord(page);
    const messageReference = await page.locator('.detail-reference strong').innerText();
    const selectedMessage = fixtures.messages.find(
      (message) => message.messageNumber === messageReference,
    );
    expect(selectedMessage).toBeTruthy();
    const beforeRead = await request.get(
      `${apiBase}/admin/contact-messages/${selectedMessage.id}`,
      { headers },
    );
    expect(
      (await beforeRead.json()).data.status,
      'Opening details must not implicitly mark the message read',
    ).toBe('unread');
    const messageEndpoint = `/api/admin/contact-messages/${selectedMessage.id}/status`;
    await changeStatus(page, 'مقروءة', messageEndpoint, 'unread');
    await changeStatus(page, 'غير مقروءة', messageEndpoint, 'read');
    await page.locator('#operation-filter').selectOption({ label: 'غير مقروءة' });
    await searchRecords(page, marker);
    await expect(page.locator('.operation-row .operation-status').first()).toHaveText('غير مقروءة');
    await page.getByRole('button', { name: 'إغلاق التفاصيل', exact: true }).click();
    await searchRecords(page, `${marker}-missing`);
    await expect(page.getByText('لا توجد رسائل تطابق البحث الحالي.')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(pageErrors).toEqual([]);
  } finally {
    await finishFixture(request, headers, 'orders', fixtures.order?.id, marker, 'cancelled');
    await finishFixture(
      request,
      headers,
      'custom-orders',
      fixtures.custom?.id,
      marker,
      'cancelled',
    );
    for (const message of fixtures.messages)
      await finishFixture(request, headers, 'contact-messages', message.id, marker, 'read');
  }
});

test('ordinary customers cannot open operations screens or change operation records', async ({
  page,
  request,
}) => {
  const identity = randomBytes(12).toString('hex');
  const password = `${randomBytes(24).toString('base64url')}aA1`;
  const registration = await request.post(`${apiBase}/auth/register`, {
    data: {
      fullName: 'عميل اختبار الإدارة',
      email: `qa-ops-${identity}@example.test`,
      password,
      confirmPassword: password,
    },
  });
  expect(registration.status()).toBe(201);
  const { data: session } = await registration.json();
  await installSession(page, session);
  for (const kind of ['orders', 'custom-orders', 'contact-messages']) {
    await page.goto(`/admin/${kind}`);
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator('app-admin-layout')).toHaveCount(0);
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    const response = await request.get(`${apiBase}/admin/${kind}`, { headers });
    expect(response.status()).toBe(403);
    const forbiddenUpdate = await request.patch(
      `${apiBase}/admin/${kind}/000000000000000000000001/status`,
      { headers, data: { status: 'cancelled' } },
    );
    expect(forbiddenUpdate.status()).toBe(403);
  }
  const logout = await request.post(`${apiBase}/auth/logout`, {
    data: { refreshToken: session.refreshToken },
  });
  expect(logout.ok()).toBe(true);
});
