import { test, expect } from './local-api.fixture.mjs';
import { verifyPrivateGuestTracking } from './guest-tracking.helper.mjs';

test.use({ trace: 'off' });

test('Arabic storefront loads real catalog and mobile navigation stays accessible', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('تفاصيل صغيرة');
  await expect(page.locator('app-product-card').first()).toBeVisible();
  await expect(page.locator('app-footer a.whatsapp-link')).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/201[0125]\d{8}\?text=/,
  );
  await expect(page.getByText('Invalid PrimeUI License')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const menu = page.locator('button[aria-controls="mobile-navigation"]');
  if (await menu.isVisible()) {
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('header search, category filters and browser history preserve catalog state', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'ابحث في المنتجات' }).fill('phone');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page).toHaveURL(/\/products\?search=phone/);
  await expect(page.getByRole('searchbox', { name: 'ابحث عن منتج' })).toHaveValue('phone');
  await expect(page.locator('app-product-card')).toHaveCount(3);
  await page.getByRole('link', { name: 'انتقل للمحتوى', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(/\/products\?search=phone#main-content$/);
  await expect(page.locator('app-product-card')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: 'حامل موبايل صغير بخطوط بارزة', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'ابحث عن منتج' }).fill('no-such-product-98765');
  await expect(page.getByRole('heading', { name: 'مفيش منتجات بالاختيارات دي' })).toBeVisible();
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page.locator('app-product-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'إكسسوارات المكتب', exact: true }).click();
  await expect(page.locator('app-product-card')).toHaveCount(5);
  await expect(page).toHaveURL(/category=Desk/);
  await page.goBack();
  await expect(page.locator('app-product-card')).toHaveCount(12);
});

test('product media and cart work before loading interactive 3D', async ({ page }) => {
  const modelRequests = [];
  page.on('request', (request) => {
    if (/\.(stl|glb|gltf|obj|ply)(\?|$)/i.test(request.url())) modelRequests.push(request.url());
  });
  await page.goto('/products/compact-phone-stand');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('حامل موبايل صغير بخطوط بارزة');
  const media = page.getByRole('region', { name: 'صور ومعاينة المنتج' });
  await expect(media.locator('.main-image img')).toBeVisible();
  expect(modelRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'زيادة الكمية' }).click();
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await expect(page.getByText('القطعة اتضافت للسلة')).toBeVisible();
  await expect(page).toHaveURL(/\/products\/compact-phone-stand$/);
  await page.getByRole('link', { name: 'كمل الطلب' }).click();
  await expect(page.locator('.quantity-control output')).toHaveText('2');
  await expect(page.locator('.cart-item .product-meta')).toHaveText('PLA+');
  await expect(page.getByRole('heading', { name: 'سلة المشتريات' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('3d_otaku_cart_items'));
    localStorage.setItem('3d_otaku_cart_items', JSON.stringify([{ ...items[0], quantity: 98 }]));
  });
  await page.goto('/products/compact-phone-stand');
  await expect(page.getByRole('button', { name: 'زيادة الكمية' })).toBeDisabled();
  await expect(
    page.getByText('يمكنك إضافة 1 قطعة أخرى من هذا المنتج قبل بلوغ حد السلة.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await expect(page.getByText('الحد الأقصى 99 قطعة من هذا المنتج في السلة.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'أضف للسلة', exact: true })).toBeDisabled();
  await page.goto('/products?search=phone');
  const card = page.locator('app-product-card').filter({
    has: page.getByRole('heading', { name: 'حامل موبايل صغير بخطوط بارزة', exact: true }),
  });
  await expect(card.getByRole('button', { name: /^وصلت للحد الأقصى:/ })).toBeDisabled();
  await expect(card.getByText('الحد الأقصى 99 قطعة من هذا المنتج في السلة.')).toBeVisible();
  await page.goto('/cart');
  await expect(page.locator('.quantity-control output')).toHaveText('99');
  await page.getByRole('button', { name: 'تقليل الكمية', exact: true }).click();
  await page.goto('/products?search=phone');
  await expect(card.getByRole('button', { name: /^أضف للسلة:/ })).toBeEnabled();
});

test('guest checkout validates Egyptian details, saves a real order and privately refreshes its receipt', async ({
  page,
  browser,
}, testInfo) => {
  await page.goto('/products/compact-phone-stand');
  await page.getByRole('button', { name: 'أضف للسلة', exact: true }).click();
  await page.getByRole('link', { name: 'كمل الطلب' }).click();
  await page.getByRole('button', { name: 'تأكيد طلب الشراء' }).click();
  await expect(
    page.getByText('راجع الحقول الموضحة في بيانات التوصيل عشان نكمل الطلب.'),
  ).toBeVisible();
  await page.locator('#checkout-name').fill('عميل اختبار محلي');
  await page.locator('#checkout-phone').fill('0501234567');
  await page.locator('#checkout-governorate').selectOption({ label: 'القاهرة' });
  await page.locator('#checkout-city').fill('مدينة نصر');
  await page
    .locator('#checkout-address')
    .fill('عنوان اختبار محلي فقط، شارع الاختبار، مبنى ١ شقة ٢');
  await page.getByRole('button', { name: 'تأكيد طلب الشراء' }).click();
  await expect(page.locator('#phone-error')).toBeVisible();
  await page.locator('#checkout-phone').fill('٠١٠١٢٣٤٥٦٧٨');
  const savedCart = await page.evaluate(() => localStorage.getItem('3d_otaku_cart_items'));
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'تأكيد طلب الشراء' }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const { data: order } = await response.json();
  expect(order.currency).toBe('EGP');
  expect(order.total).toBe(100);
  expect(order.deliveryFeeConfirmed).toBe(false);
  expect(Boolean(order.trackingToken), 'The saved guest order has a private tracking token').toBe(
    true,
  );
  await expect(page.getByRole('heading', { name: 'شكرًا لاختيارك 3D Otaku' })).toBeVisible();
  await expect(page.locator('#receipt-title')).toBeFocused();
  await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تصفح منتجات تانية', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.goto('/cart');
  await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible();
  const storedTrackingToken = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('3d-otaku-order-receipt')).trackingToken,
  );
  expect(
    storedTrackingToken === order.trackingToken,
    'Returning to the receipt preserves its original private token',
  ).toBe(true);
  await page.reload();
  await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible();
  const tracking = page.waitForRequest((request) => request.url().includes('/api/orders/track/'));
  await page.getByRole('button', { name: 'تحديث الحالة' }).click();
  const request = await tracking;
  expect(
    request.headers()['x-order-token'] === order.trackingToken,
    'Receipt refresh sends the original token in its private header',
  ).toBe(true);
  expect(
    request.url().includes(order.trackingToken),
    'Receipt refresh must not put its private token in the request URL',
  ).toBe(false);
  await expect(page.getByText(order.orderNumber, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تحديث الحالة', exact: true })).toBeEnabled();
  await verifyPrivateGuestTracking({
    page,
    browser,
    order,
    requestBody: response.request().postDataJSON(),
    savedCart,
    testInfo,
  });
});
