import { test, expect } from './local-api.fixture.mjs';
import { randomBytes } from 'node:crypto';

test.use({ trace: 'off', screenshot: 'off' });

function localOrigin(value, ports) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !ports.includes(Number(url.port))
  ) {
    throw new Error('Public account QA is restricted to the local frontend and API.');
  }
  return url.origin;
}

const apiOrigin = localOrigin('http://127.0.0.1:4000', [4000]);
const apiBase = apiOrigin + '/api';

function customerDetails() {
  return {
    fullName: 'عميل اختبار محلي',
    email: `qa-public-${Date.now()}-${randomBytes(5).toString('hex')}@example.test`,
    password: `LocalQa9-${randomBytes(12).toString('hex')}`,
  };
}

async function createCustomer(request) {
  const customer = customerDetails();
  const response = await request.post(apiBase + '/auth/register', {
    data: { ...customer, confirmPassword: customer.password },
  });
  if (response.status() !== 201)
    throw new Error('The isolated local customer could not be created.');
  return customer;
}

async function fillLogin(page, customer) {
  try {
    await page.locator('#login-email').fill(customer.email);
    await page.locator('#login-password').fill(customer.password);
  } catch {
    throw new Error('The local customer sign-in form could not be filled; credentials suppressed.');
  }
}

test.beforeEach(async ({ page, baseURL }) => {
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(request.url()).origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('A nonlocal mutation was blocked by the public account QA guard.');
    }
    await route.continue();
  });
});

test('Arabic login validates accessibly and keeps external return URLs out of account links', async ({
  page,
}, testInfo) => {
  const mutations = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/auth/'))
      mutations.push(request.url());
  });
  await page.goto('/login?returnUrl=https%3A%2F%2Fexample.com');
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول', exact: true })).toBeVisible();
  await page.locator('.auth-form button[type="submit"]').click();
  await expect(page.locator('#login-email')).toBeFocused();
  await expect(page.locator('#login-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#login-email-error')).toContainText('بريدًا إلكترونيًا');
  await page.getByRole('button', { name: 'إظهار كلمة المرور', exact: true }).click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
  await expect(
    page.getByRole('button', { name: 'إخفاء كلمة المرور', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.auth-footer a')).toHaveAttribute('href', '/register');
  expect(mutations).toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/public-login-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('registration checks the real password rules and returns a new customer to orders', async ({
  page,
}, testInfo) => {
  const customer = customerDetails();
  let registrations = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/auth/register'))
      registrations++;
  });
  await page.goto('/register?returnUrl=%2Forders');
  await expect(page.getByRole('heading', { name: 'إنشاء حساب', exact: true })).toBeVisible();
  await page.locator('.auth-form button[type="submit"]').click();
  await expect(page.locator('#register-name')).toBeFocused();
  await expect(page.locator('#register-password-error')).toContainText('٨ إلى ١٢٨');
  await page.screenshot({
    path: `artifacts/browser/public-register-${testInfo.project.name}.png`,
    fullPage: true,
  });
  try {
    await page.locator('#register-name').fill(customer.fullName);
    await page.locator('#register-email').fill(customer.email);
    await page.locator('#register-password').fill('short');
    await page.locator('#register-confirm-password').fill('different');
    await page.locator('.auth-form button[type="submit"]').click();
    await expect(page.locator('#register-confirm-error')).toContainText('غير متطابقتين');
    expect(registrations).toBe(0);
    await page.locator('#register-password').fill(customer.password);
    await page.locator('#register-confirm-password').fill(customer.password);
    const registered = page.waitForResponse((response) =>
      response.url().endsWith('/api/auth/register'),
    );
    await page.locator('#register-confirm-password').press('Enter');
    expect((await registered).status()).toBe(201);
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole('heading', { name: 'طلباتي', exact: true })).toBeVisible();
    expect(registrations).toBe(1);
  } catch {
    throw new Error('The isolated local registration flow failed; credential details suppressed.');
  }
});

test('a customer sees invalid-login feedback, cannot return to admin and refreshes an expired session', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/login?returnUrl=%2Fadmin%2Fdashboard');
  await fillLogin(page, { ...customer, password: 'IncorrectQa9-password' });
  await page.locator('.auth-form button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  await fillLogin(page, customer);
  await page.locator('#login-password').press('Enter');
  await expect(page).toHaveURL(/\/products$/);
  let refreshCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/auth/refresh-token'))
      refreshCount++;
  });
  await page.evaluate(() =>
    localStorage.setItem('3d-otaku-access-token', 'expired-local-qa-token'),
  );
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'طلباتي', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'أول قطعة لسه مستنياك' })).toBeVisible();
  expect(refreshCount).toBe(1);
  await page.goto('/orders?page=999');
  await expect(page).toHaveURL(/\/orders\?page=1$/);
  await expect(page.getByRole('heading', { name: 'أول قطعة لسه مستنياك' })).toBeVisible();
  expect(refreshCount).toBe(1);
  expect(
    await page.evaluate(
      () => localStorage.getItem('3d-otaku-access-token') !== 'expired-local-qa-token',
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'طلباتي', exact: true })).toBeVisible();
  expect(refreshCount).toBe(1);
  const logout = page
    .getByRole('button', { name: 'تسجيل الخروج', exact: true })
    .filter({ visible: true });
  if ((await logout.count()) === 0)
    await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  const loggedOut = page.waitForResponse((response) => response.url().endsWith('/api/auth/logout'));
  await logout.click();
  expect((await loggedOut).ok()).toBe(true);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem('3d-otaku-access-token') === null &&
        localStorage.getItem('3d-otaku-refresh-token') === null,
    ),
  ).toBe(true);
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  expect(pageErrors).toEqual([]);
});

test('a lost guest checkout survives sign-in and edited details while receipt recovery preserves the changed cart', async ({
  page,
  request,
}, testInfo) => {
  const customer = await createCustomer(request);
  let originalOrder = null;
  let originalBody = null;
  let originalKey = '';
  let submissionCount = 0;
  await page.route('**/api/orders', async (route) => {
    const current = route.request();
    if (current.method() !== 'POST') return route.continue();
    submissionCount += 1;
    if (submissionCount === 1) {
      originalKey = current.headers()['idempotency-key'];
      originalBody = current.postDataJSON();
      const stored = await route.fetch();
      expect(stored.status()).toBe(201);
      originalOrder = (await stored.json()).data;
      await route.abort('connectionreset');
      return;
    }
    expect(current.headers()['idempotency-key']).toBe(originalKey);
    expect(current.postDataJSON()).toEqual(originalBody);
    await route.continue();
  });
  await page.goto('/products/compact-phone-stand');
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: 'كمل الطلب' }).click();
  await page.locator('#checkout-name').fill('اختبار استعادة طلب الزائر');
  await page.locator('#checkout-phone').fill('01012345678');
  await page.locator('#checkout-governorate').selectOption({ label: 'القاهرة' });
  await page.locator('#checkout-city').fill('مدينة نصر');
  await page.locator('#checkout-address').fill('عنوان اختبار محلي لاستعادة الطلب، مبنى 1 شقة 2');
  await expect(page.locator('#checkout-email')).toHaveValue('');
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  await expect(page.locator('.error-text[role="alert"]')).toContainText('احتفظ بنفس البيانات');
  expect(originalOrder).not.toBeNull();
  expect(originalOrder.userId).toBeNull();
  await expect(page.locator('.quantity-control output')).toHaveText('1');

  await page.getByRole('button', { name: 'تسجل دخول', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcart/);
  await fillLogin(page, customer);
  const signedIn = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'));
  await page.locator('.auth-form button[type="submit"]').click();
  expect((await signedIn).ok()).toBe(true);
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.locator('#checkout-name')).toHaveValue('اختبار استعادة طلب الزائر');
  await expect(page.locator('#checkout-email')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#checkout-email')).toHaveValue('');
  const conflicted = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const conflict = await conflicted;
  expect(conflict.status()).toBe(409);
  const conflictBody = await conflict.json();
  expect(conflictBody.errors.checkoutSession).toHaveLength(1);
  expect(conflictBody).not.toHaveProperty('data');
  await expect(page.locator('.error-text[role="alert"]')).toContainText(
    'الحساب أو وضع الزائر الذي بدأت به',
  );
  await expect(page.locator('.quantity-control output')).toHaveText('1');
  const accountOrders = await page.evaluate(async () => {
    const token = localStorage.getItem('3d-otaku-access-token');
    const response = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    return { status: response.status, count: body.data.length };
  });
  expect(accountOrders).toEqual({ status: 200, count: 0 });
  expect((await request.get(`${apiBase}/orders/track/${originalOrder.orderNumber}`)).status()).toBe(
    404,
  );

  await page.locator('#checkout-address').fill('عنوان آخر محفوظ فقط، مبنى 2 شقة 3');
  await page.getByRole('button', { name: 'زيادة الكمية', exact: true }).click();
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  const retryPrevious = page.getByRole('button', {
    name: 'إعادة محاولة الطلب السابق',
    exact: true,
  });
  await expect(retryPrevious).toBeVisible();
  expect(submissionCount).toBe(2);
  const wrongSessionRecovery = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
  );
  await retryPrevious.click();
  const wrongSessionResult = await wrongSessionRecovery;
  expect(wrongSessionResult.status()).toBe(409);
  expect(await wrongSessionResult.json()).not.toHaveProperty('data');
  await expect(page.locator('.error-text[role="alert"]')).toContainText(
    'الحساب أو وضع الزائر الذي بدأت به',
  );

  const logout = page
    .getByRole('button', { name: 'تسجيل الخروج', exact: true })
    .filter({ visible: true });
  if ((await logout.count()) === 0)
    await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  const loggedOut = page.waitForResponse((response) => response.url().endsWith('/api/auth/logout'));
  await logout.click();
  expect((await loggedOut).ok()).toBe(true);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/cart');
  await expect(page.locator('.quantity-control output')).toHaveText('2');
  await expect(page.locator('#checkout-address')).toHaveValue('عنوان آخر محفوظ فقط، مبنى 2 شقة 3');
  await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
  await expect(retryPrevious).toBeVisible();
  expect(submissionCount).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/checkout-recovery-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const recovered = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
  );
  await retryPrevious.click();
  const replay = await recovered;
  expect(replay.status()).toBe(200);
  const receipt = (await replay.json()).data;
  expect(receipt.id).toBe(originalOrder.id);
  expect(receipt.orderNumber).toBe(originalOrder.orderNumber);
  expect(receipt.total).toBe(originalOrder.total);
  expect(receipt.userId).toBeNull();
  expect(submissionCount).toBe(4);
  await expect(page.getByRole('heading', { name: 'شكرًا لاختيارك 3D Otaku' })).toBeVisible();
  await expect(page.getByText(originalOrder.orderNumber, { exact: true })).toBeVisible();
  await expect(page.locator('#receipt-title')).toBeFocused();
  await page.screenshot({
    path: `artifacts/browser/checkout-recovered-receipt-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'الرجوع للسلة المحفوظة', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cart-title')).toBeFocused();
  await expect(page.locator('.quantity-control output')).toHaveText('2');
  await expect(page.locator('#checkout-address')).toHaveValue('عنوان آخر محفوظ فقط، مبنى 2 شقة 3');
  await page.getByRole('button', { name: 'عرض إيصال الطلب السابق', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#receipt-title')).toBeFocused();
  await page.getByRole('button', { name: 'الرجوع للسلة المحفوظة', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cart-title')).toBeFocused();
  await expect(page.locator('#checkout-address')).toHaveValue('عنوان آخر محفوظ فقط، مبنى 2 شقة 3');

  await page.unroute('**/api/orders');
  const trackingPath = `**/api/orders/track/${originalOrder.orderNumber}`;
  const trackingGate = Promise.withResolvers();
  const trackingStarted = Promise.withResolvers();
  await page.route(trackingPath, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.data.orderNumber).toBe(originalOrder.orderNumber);
    expect(route.request().headers()['x-order-token']).toBe(originalOrder.trackingToken);
    trackingStarted.resolve();
    await trackingGate.promise;
    await route.fulfill({ response, body: JSON.stringify(body) });
  });
  try {
    await page.getByRole('button', { name: 'عرض إيصال الطلب السابق', exact: true }).click();
    await page.getByRole('button', { name: 'تحديث الحالة', exact: true }).click();
    await trackingStarted.promise;
    await page.getByRole('button', { name: 'الرجوع للسلة المحفوظة', exact: true }).click();
    await expect(page.locator('.quantity-control output')).toHaveText('2');
    const newOrderResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/orders') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'تأكيد طلب الشراء', exact: true }).click();
    const submitted = await newOrderResponse;
    expect(submitted.status()).toBe(201);
    const nextOrder = (await submitted.json()).data;
    expect(nextOrder.orderNumber).not.toBe(originalOrder.orderNumber);
    expect(nextOrder.trackingToken).toBeTruthy();
    expect(nextOrder.trackingToken).not.toBe(originalOrder.trackingToken);
    expect(submitted.request().headers()['idempotency-key']).not.toBe(originalKey);
    expect(nextOrder.items[0].quantity).toBe(2);
    expect(nextOrder.customer.address).toBe('عنوان آخر محفوظ فقط، مبنى 2 شقة 3');
    await expect(page.getByText(nextOrder.orderNumber, { exact: true })).toBeVisible();

    const lateTracking = page.waitForResponse((response) =>
      response.url().endsWith(`/api/orders/track/${originalOrder.orderNumber}`),
    );
    trackingGate.resolve();
    expect((await lateTracking).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'تحديث الحالة', exact: true })).toBeEnabled();
    await expect(page.getByText(nextOrder.orderNumber, { exact: true })).toBeVisible();
    await expect(page.getByText(originalOrder.orderNumber, { exact: true })).toHaveCount(0);
    const savedReceipt = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt')),
    );
    expect(savedReceipt.orderNumber).toBe(nextOrder.orderNumber);
    expect(savedReceipt.trackingToken).toBe(nextOrder.trackingToken);
    await page.reload();
    await expect(page.getByText(nextOrder.orderNumber, { exact: true })).toBeVisible();
    await expect(page.locator('#checkout-address')).toHaveCount(0);
  } finally {
    trackingGate.resolve();
    await page.unroute(trackingPath);
  }
});

test('about and missing pages are readable in RTL and missing-page search works by keyboard', async ({
  page,
}, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('أفكار تأخذ شكلًا');
  await expect(
    page.getByText('نستقبل الطلبات للتوصيل داخل مصر فقط.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/public-about-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto('/missing-public-qa-page');
  await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة.' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/browser/public-not-found-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.locator('#not-found-search').fill('phone');
  await page.locator('#not-found-search').press('Enter');
  await expect(page).toHaveURL(/\/products\?search=phone$/);
  await expect(page.locator('app-product-card').first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
