import { test, expect } from './local-api.fixture.mjs';
import { readFile, writeFile } from 'node:fs/promises';

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
    throw new Error('Settings QA is restricted to the local frontend and API.');
  }
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const endpoint = `${apiOrigin}/api/admin/settings`;
test.use({
  baseURL:
    process.env.ADMIN_QA_BASE_URL || process.env.STORE_E2E_BASE_URL || 'http://127.0.0.1:4200',
  trace: 'off',
  screenshot: 'off',
});

// This suite changes global local-store settings and must run with workers: 1.
test('admin settings validate, persist and restore real Egyptian contact and delivery settings', async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  await page.route('**/*', async (route) => {
    const current = route.request();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(current.method()) &&
      ![webOrigin, apiOrigin].includes(new URL(current.url()).origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('Settings QA blocked a nonlocal mutation.');
    }
    await route.continue();
  });
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  try {
    await page.locator('#login-email').fill(runtime.email);
    await page.locator('#login-password').fill(runtime.password);
    const login = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
    );
    await page.locator('.auth-form button[type="submit"]').click();
    const response = await login;
    const limitHeader = response.headers()['ratelimit'] || '';
    const limits = [...limitHeader.matchAll(/r=(\d+);\s*t=(\d+)/g)].map((match) => ({
      remaining: Number(match[1]),
      resetSeconds: Number(match[2]),
    }));
    await writeFile(testInfo.outputPath('auth-quota.json'), JSON.stringify(limits));
    if (!response.ok()) throw new Error('Local sign-in failed.');
    await expect(page).toHaveURL(/\/admin\/settings$/);
  } catch {
    await page
      .locator('#login-email')
      .fill('')
      .catch(() => null);
    await page
      .locator('#login-password')
      .fill('')
      .catch(() => null);
    throw new Error('Local settings sign-in failed; credential details suppressed.');
  }
  await expect(
    page.getByRole('heading', { name: 'إعدادات المتجر', exact: true, level: 2 }),
  ).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('3d-otaku-access-token'));
  if (!token) throw new Error('Local admin session is missing.');
  const headers = { Authorization: `Bearer ${token}` };
  const snapshot = await request.get(endpoint, { headers });
  expect(snapshot.ok()).toBe(true);
  const { data: original } = await snapshot.json();
  let saveCount = 0;
  page.on('request', (current) => {
    if (new URL(current.url()).pathname === '/api/admin/settings' && current.method() === 'PUT')
      saveCount += 1;
  });
  const waitForSave = () =>
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/admin/settings' &&
        response.request().method() === 'PUT',
    );
  try {
    await expect(page.locator('#setting-currency')).toContainText('EGP');
    await page.locator('#setting-whatsappNumber').fill('0123');
    await page.getByRole('button', { name: 'حفظ الإعدادات', exact: true }).click();
    await expect(page.locator('#setting-whatsappNumber')).toHaveAttribute('aria-invalid', 'true');
    expect(saveCount).toBe(0);

    await page.locator('#setting-whatsappNumber').fill('٠١٠١٢٣٤٥٦٧٨');
    await page.locator('#setting-phone').fill('02 2345 6789');
    await page.locator('#setting-deliveryFee').fill('0');
    await page.locator('#setting-deliveryDays').fill('مدة اختبار محلي مؤقتة');
    const firstSave = waitForSave();
    await page.getByRole('button', { name: 'حفظ الإعدادات', exact: true }).click();
    const firstResponse = await firstSave;
    expect(firstResponse.ok()).toBe(true);
    const { data: saved } = await firstResponse.json();
    expect(saved.whatsappNumber).toBe('201012345678');
    expect(saved.phone).toBe('+20223456789');
    expect(saved.deliveryFee).toBe(0);
    expect(saved.defaultCurrency).toBe('EGP');
    expect(saved.heroTitle).toBe(original.heroTitle);
    expect(saved.maintenanceMode).toBe(original.maintenanceMode);
    await expect(page.getByText('تم حفظ الإعدادات في المتجر.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('#setting-whatsappNumber')).toHaveValue('201012345678');
    await expect(page.locator('#setting-deliveryFee')).toHaveValue('0');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/browser/admin-settings-${testInfo.project.name}.png`,
      fullPage: true,
    });

    await page.locator('#setting-deliveryFee').fill('');
    const secondSave = waitForSave();
    await page.getByRole('button', { name: 'حفظ الإعدادات', exact: true }).click();
    const secondResponse = await secondSave;
    expect(secondResponse.ok()).toBe(true);
    expect((await secondResponse.json()).data.deliveryFee).toBeNull();

    const blockLoad = async (route) =>
      route.request().method() === 'GET' ? route.abort('failed') : route.fallback();
    await page.route('**/api/admin/settings', blockLoad);
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('تعذّر تحميل الإعدادات الحالية');
    await expect(page.getByRole('button', { name: 'حفظ الإعدادات', exact: true })).toHaveCount(0);
    expect(saveCount).toBe(2);
    await page.unroute('**/api/admin/settings', blockLoad);
    await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
    await expect(page.locator('#setting-deliveryFee')).toHaveValue('');
  } finally {
    const restored = await request.put(endpoint, { headers, data: original });
    expect(restored.ok(), 'The local settings snapshot must be restored after QA').toBe(true);
    const verify = await request.get(endpoint, { headers });
    expect(verify.ok()).toBe(true);
    const { data: after } = await verify.json();
    for (const field of [
      'whatsappNumber',
      'phone',
      'deliveryFee',
      'deliveryDays',
      'defaultCurrency',
      'heroTitle',
      'maintenanceMode',
    ]) {
      expect(after[field], `Restored local setting: ${field}`).toEqual(original[field]);
    }
  }
});
