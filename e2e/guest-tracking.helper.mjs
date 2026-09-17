import { expect } from '@playwright/test';

export async function verifyPrivateGuestTracking({
  page,
  browser,
  order,
  requestBody,
  savedCart,
  testInfo,
}) {
  const origin = new URL(page.url()).origin;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.getByRole('button', { name: 'نسخ رابط متابعة الطلب', exact: true }).click();
  await expect(page.getByText('تم نسخ رابط المتابعة', { exact: true })).toBeVisible();
  const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
  const link = new URL(copiedLink);
  expect(link.origin).toBe(origin);
  expect(link.pathname).toBe('/track');
  expect(link.search).toBe('');
  expect(new URLSearchParams(link.hash.slice(1)).get('token')).toBe(order.trackingToken);
  const pending = JSON.stringify({
    key: `guest-link-held-${testInfo.project.name}`,
    payload: JSON.stringify(requestBody),
    state: 'uncertain',
  });
  const context = await browser.newContext({
    baseURL: origin,
    viewport: page.viewportSize(),
    isMobile: testInfo.project.name === 'mobile',
    hasTouch: testInfo.project.name === 'mobile',
    deviceScaleFactor: testInfo.project.name === 'mobile' ? 2 : 1,
  });
  try {
    await context.addInitScript(
      ({ cart, pendingOrder }) => {
        if (!sessionStorage.getItem('guest-tracking-qa-initialized')) {
          localStorage.setItem('3d_otaku_cart_items', cart);
          localStorage.setItem('3d-otaku-access-token', 'expired-tracking-access');
          sessionStorage.setItem('3d-otaku-pending-order', pendingOrder);
          sessionStorage.setItem('guest-tracking-qa-initialized', 'true');
        }
        window.dataLayer = [];
      },
      { cart: savedCart, pendingOrder: pending },
    );
    const trackedPage = await context.newPage();
    const requests = [];
    const errors = [];
    trackedPage.on('pageerror', (error) => errors.push(error.message));
    trackedPage.on('request', (request) => requests.push(request));
    const response = await trackedPage.goto(copiedLink);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    expect(await response.text()).not.toContain(order.trackingToken);
    await expect(trackedPage.locator('#tracked-order-title')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toBeVisible();
    await expect(trackedPage).toHaveURL(`${origin}/track`);
    const trackingReads = () =>
      requests.filter((request) => request.url().includes('/api/orders/track/'));
    expect(trackingReads()).toHaveLength(1);
    const trackingHeaders = await trackingReads()[0].allHeaders();
    expect(trackingHeaders['x-order-token']).toBe(order.trackingToken);
    expect(trackingHeaders).not.toHaveProperty('authorization');
    expect(trackingHeaders).not.toHaveProperty('cookie');
    expect((await trackingReads()[0].response()).headers()['cache-control']).toContain('no-store');
    const preserved = await trackedPage.evaluate(() => ({
      cart: localStorage.getItem('3d_otaku_cart_items'),
      pending: sessionStorage.getItem('3d-otaku-pending-order'),
      receipt: JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt')),
      analytics: JSON.stringify(window.dataLayer),
    }));
    expect(preserved.cart).toBe(savedCart);
    expect(preserved.pending).toBe(pending);
    expect(preserved.receipt.orderNumber).toBe(order.orderNumber);
    expect(preserved.receipt.trackingToken).toBe(order.trackingToken);
    expect(preserved.analytics).not.toContain(order.trackingToken);
    expect(
      await trackedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await trackedPage.screenshot({
      path: testInfo.outputPath('private-guest-tracking.png'),
      fullPage: true,
    });

    await trackedPage.reload();
    await trackedPage
      .getByRole('button', { name: 'عرض آخر طلب محفوظ في هذا التبويب', exact: true })
      .click();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toBeVisible();
    expect(trackingReads()).toHaveLength(2);
    await trackedPage.goto(`/track#order=${order.orderNumber}&token=invalid`);
    await expect(trackedPage.getByRole('alert')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toHaveCount(0);
    await expect(
      trackedPage.getByRole('button', { name: 'عرض آخر طلب محفوظ في هذا التبويب', exact: true }),
    ).toHaveCount(0);
    expect(trackingReads()).toHaveLength(2);

    const wrongToken = (order.trackingToken.startsWith('a') ? 'b' : 'a').repeat(64);
    const denied = trackedPage.waitForResponse((response) =>
      response.url().includes('/api/orders/track/'),
    );
    await trackedPage.goto(`/track#order=${order.orderNumber}&token=${wrongToken}`);
    const denial = await denied;
    expect(denial.status()).toBe(404);
    expect(denial.headers()['cache-control']).toContain('no-store');
    expect(await denial.json()).not.toHaveProperty('data');
    await expect(trackedPage.getByRole('alert')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toHaveCount(0);
    expect(trackingReads()).toHaveLength(3);
    expect(requests.every((request) => !request.url().includes(order.trackingToken))).toBe(true);
    expect(requests.filter((request) => request.method() === 'POST')).toHaveLength(0);
    expect(await trackedPage.evaluate(() => sessionStorage.getItem('3d-otaku-pending-order'))).toBe(
      pending,
    );
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
}
