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
  expect(link.origin === origin, 'The private link keeps the storefront origin').toBe(true);
  expect(link.pathname === '/track', 'The private link uses only the tracking route').toBe(true);
  expect(link.search === '', 'The private link keeps credentials out of the query').toBe(true);
  expect(
    new URLSearchParams(link.hash.slice(1)).get('token') === order.trackingToken,
    'The copied fragment contains the original private tracking token',
  ).toBe(true);
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
    expect(
      Boolean(response.headers()['x-robots-tag']?.includes('noindex')),
      'The tracking document prevents indexing',
    ).toBe(true);
    expect(
      (await response.text()).includes(order.trackingToken),
      'Server-rendered HTML must not contain the private tracking token',
    ).toBe(false);
    await expect(trackedPage.locator('#tracked-order-title')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toBeVisible();
    await expect
      .poll(() => trackedPage.url() === `${origin}/track`, {
        message: 'The private fragment is removed from the visible URL',
      })
      .toBe(true);
    const trackingReads = () =>
      requests.filter((request) => request.url().includes('/api/orders/track/'));
    expect(trackingReads().length, 'Opening the private link makes one tracking read').toBe(1);
    const trackingHeaders = await trackingReads()[0].allHeaders();
    expect(
      trackingHeaders['x-order-token'] === order.trackingToken,
      'Tracking sends the original token only through its private header',
    ).toBe(true);
    expect(
      Object.hasOwn(trackingHeaders, 'authorization'),
      'Private guest tracking must not forward account authorization',
    ).toBe(false);
    expect(
      Object.hasOwn(trackingHeaders, 'cookie'),
      'Private guest tracking must not forward account cookies',
    ).toBe(false);
    expect(
      Boolean(
        (await trackingReads()[0].response()).headers()['cache-control']?.includes('no-store'),
      ),
      'The private tracking response prevents storage by caches',
    ).toBe(true);
    const preserved = await trackedPage.evaluate(() => ({
      cart: localStorage.getItem('3d_otaku_cart_items'),
      pending: sessionStorage.getItem('3d-otaku-pending-order'),
      receipt: JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt')),
      analytics: JSON.stringify(window.dataLayer),
    }));
    expect(preserved.cart).toBe(savedCart);
    expect(preserved.pending === pending, 'Tracking preserves the separate pending checkout').toBe(
      true,
    );
    expect(preserved.receipt.orderNumber).toBe(order.orderNumber);
    expect(
      preserved.receipt.trackingToken === order.trackingToken,
      'The restored receipt preserves the original private tracking token',
    ).toBe(true);
    expect(
      preserved.analytics.includes(order.trackingToken),
      'Analytics must not contain the private tracking token',
    ).toBe(false);
    await trackedPage.getByRole('link', { name: 'انتقل للمحتوى', exact: true }).focus();
    await trackedPage.keyboard.press('Enter');
    await expect(trackedPage.locator('#main-content')).toBeFocused();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toBeVisible();
    await expect
      .poll(() => trackedPage.url() === `${origin}/track#main-content`, {
        message: 'The native skip link stays on the tracking route without private credentials',
      })
      .toBe(true);
    expect(trackingReads().length, 'The skip link does not repeat tracking').toBe(1);
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
    expect(trackingReads().length, 'Explicit saved-receipt recovery adds one tracking read').toBe(
      2,
    );
    await trackedPage.goto(`/track#order=${order.orderNumber}&token=invalid`);
    await expect(trackedPage.getByRole('alert')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toHaveCount(0);
    await expect(
      trackedPage.getByRole('button', { name: 'عرض آخر طلب محفوظ في هذا التبويب', exact: true }),
    ).toHaveCount(0);
    expect(trackingReads().length, 'An invalid fragment must not send a tracking read').toBe(2);

    const wrongToken = (order.trackingToken.startsWith('a') ? 'b' : 'a').repeat(64);
    const denied = trackedPage.waitForResponse((response) =>
      response.url().includes('/api/orders/track/'),
    );
    await trackedPage.goto(`/track#order=${order.orderNumber}&token=${wrongToken}`);
    const denial = await denied;
    expect(denial.status()).toBe(404);
    expect(
      Boolean(denial.headers()['cache-control']?.includes('no-store')),
      'A denied tracking response also prevents cache storage',
    ).toBe(true);
    expect(
      Object.hasOwn(await denial.json(), 'data'),
      'A denied private tracking request must not disclose order data',
    ).toBe(false);
    await expect(trackedPage.getByRole('alert')).toBeVisible();
    await expect(trackedPage.getByText(order.orderNumber, { exact: true })).toHaveCount(0);
    expect(trackingReads().length, 'The wrong-token check adds exactly one denied read').toBe(3);
    expect(
      requests.every((request) => !request.url().includes(order.trackingToken)),
      'No request URL may expose the private tracking token',
    ).toBe(true);
    expect(
      requests.filter((request) => request.method() === 'POST').length,
      'Private tracking never submits an order or authentication request',
    ).toBe(0);
    expect(
      (await trackedPage.evaluate(() => sessionStorage.getItem('3d-otaku-pending-order'))) ===
        pending,
      'All tracking states preserve the separate pending checkout',
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
}
