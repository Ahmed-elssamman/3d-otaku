import { test, expect } from './local-api.fixture.mjs';

test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
    throw new Error('Contact submissions are tested against the local environment only.');
  }
});

test('custom request validates Egyptian details and safely recovers a lost server response', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /NG05\d+|hydration/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('/contact');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('خلّينا نساعدك');
  await page.getByRole('button', { name: 'ابعت الفكرة للمراجعة' }).click();
  await expect(page.getByText('راجع الحقول الموضحة عشان نقدر نستلم فكرتك.')).toBeVisible();
  await page.locator('#custom-name').fill('عميل تجربة طلب خاص');
  await page.locator('#custom-phone').fill('0501234567');
  await page
    .locator('#custom-details')
    .fill('منظم للمكتب للاختبار المحلي فقط، مقاس صغير ولون أخضر');
  await page.locator('#custom-quantity').fill('1.5');
  await page.locator('#custom-rights').check();
  await page.getByRole('button', { name: 'ابعت الفكرة للمراجعة' }).click();
  await expect(page.locator('#custom-phone-error')).toContainText('مصري');
  await expect(page.locator('#custom-quantity-error')).toContainText('عددًا صحيحًا');
  await page.locator('#custom-source').selectOption('other-model-url');
  await page.locator('#custom-reference').fill('http://example.com/model');
  await page.getByRole('button', { name: 'ابعت الفكرة للمراجعة' }).click();
  await expect(page.locator('#reference-error')).toContainText('HTTPS');
  await page.locator('#custom-source').selectOption('written-idea');
  await expect(page.locator('#custom-reference')).toHaveCount(0);
  await page.locator('#custom-phone').fill('٠١٠١٢٣٤٥٦٧٨');
  await page.locator('#custom-quantity').fill('2');
  await page.locator('.extra-details summary').click();
  await page.locator('#custom-size').fill('8 × 12 × 5');

  let firstNumber = '';
  let firstKey = '';
  let savedCount = 0;
  const sentBodies = [];
  await page.route('**/api/custom-orders', async (route) => {
    sentBodies.push(route.request().postDataJSON());
    const response = await route.fetch();
    const receipt = await response.json();
    expect(response.ok()).toBe(true);
    savedCount += 1;
    if (savedCount === 1) {
      firstNumber = receipt.data.requestNumber;
      firstKey = route.request().headers()['idempotency-key'];
      expect(response.status()).toBe(201);
      await route.abort('failed');
    } else {
      expect(response.status()).toBe(200);
      expect(receipt.data.requestNumber).toBe(firstNumber);
      expect(route.request().headers()['idempotency-key']).toBe(firstKey);
      expect(route.request().postDataJSON()).toEqual(sentBodies[0]);
      await route.fulfill({ response });
    }
  });
  await page.getByRole('button', { name: 'ابعت الفكرة للمراجعة' }).click();
  await expect(page.getByRole('alert')).toContainText('تعذر تأكيد استلام');
  await expect(page.getByRole('heading', { name: 'وصلنا طلبك للمراجعة' })).toHaveCount(0);
  await expect(page.locator('#custom-details')).toHaveValue(
    'منظم للمكتب للاختبار المحلي فقط، مقاس صغير ولون أخضر',
  );
  await page.locator('#custom-details').fill('');
  await page.locator('#custom-quantity').fill('');
  await page.locator('#custom-size').fill('22 × 18');
  await page.getByRole('button', { name: 'ابعت الفكرة للمراجعة' }).click();
  await expect(page.getByRole('alert')).toContainText('في محاولة سابقة');
  expect(sentBodies).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'إعادة محاولة الفكرة السابقة', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('#custom-details')).toHaveValue('');
  await expect(page.locator('#custom-quantity')).toHaveValue('');
  await page.locator('.extra-details summary').click();
  await expect(page.locator('#custom-size')).toHaveValue('22 × 18');
  expect(sentBodies).toHaveLength(1);
  const pendingScreenshot = testInfo.outputPath('contact-pending-recovery.png');
  await page
    .locator('.request-recovery')
    .screenshot({ path: pendingScreenshot, animations: 'disabled' });
  await testInfo.attach('Saved custom request after SSR reload', {
    path: pendingScreenshot,
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'إعادة محاولة الفكرة السابقة', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'وصلنا طلبك للمراجعة' })).toBeVisible();
  expect(firstNumber).toMatch(/^CUSTOM-[A-F0-9]{16}$/);
  await expect(page.getByText(firstNumber, { exact: true })).toBeVisible();
  await expect(page.locator('#custom-result')).toBeFocused();
  const savedDetails = page.getByRole('region', { name: 'البيانات التي تم إرسالها' });
  await expect(savedDetails).toContainText('منظم للمكتب للاختبار المحلي فقط، مقاس صغير ولون أخضر');
  await expect(savedDetails).toContainText('8 × 12 × 5');
  await expect(savedDetails).not.toContainText('22 × 18');
  const whatsapp = page.getByRole('link', { name: 'تابع على واتساب' });
  if (await whatsapp.count()) {
    const url = new URL(await whatsapp.getAttribute('href'));
    expect(url.searchParams.get('text')).toContain(firstNumber);
    expect(url.searchParams.get('text')).toContain('8 × 12 × 5');
    expect(url.searchParams.get('text')).not.toContain('22 × 18');
  }
  expect(savedCount).toBe(2);
  const receiptScreenshot = testInfo.outputPath('contact-original-receipt.png');
  await page
    .locator('.result-card')
    .screenshot({ path: receiptScreenshot, animations: 'disabled' });
  await testInfo.attach('Original custom receipt with retained edited draft', {
    path: receiptScreenshot,
    contentType: 'image/png',
  });
  await page.reload();
  await expect(page.getByText(firstNumber, { exact: true })).toBeVisible();
  expect(sentBodies).toHaveLength(2);
  await page.getByRole('button', { name: 'الرجوع لمسودة الفكرة المحفوظة', exact: true }).click();
  await expect(page.locator('#custom-details')).toHaveValue('');
  await expect(page.locator('#custom-quantity')).toHaveValue('');
  await page.locator('.extra-details summary').click();
  await expect(page.locator('#custom-size')).toHaveValue('22 × 18');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('a general inquiry saves separately and displays its actual message reference', async ({
  page,
}) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'عندي استفسار', exact: true }).click();
  await page.getByRole('button', { name: 'ابعت الرسالة', exact: true }).click();
  await expect(page.getByText('راجع الحقول الموضحة قبل إرسال الرسالة.')).toBeVisible();
  await page.locator('#message-name').fill('عميل تجربة التواصل');
  await page.locator('#message-email').fill('local-contact@example.com');
  await page.locator('#message-subject').fill('استفسار محلي عن حامل الموبايل');
  await page
    .locator('#message-text')
    .fill('محتاج أعرف المقاس قبل الشراء، دي رسالة اختبار محلي فقط.');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/contact-messages') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'ابعت الرسالة', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data.messageNumber).toMatch(/^MESSAGE-[A-F0-9]{16}$/);
  await expect(page.getByRole('heading', { name: 'وصلتنا رسالتك' })).toBeVisible();
  await expect(page.getByText(data.messageNumber, { exact: true })).toBeVisible();
  await expect(page.locator('#message-result')).toBeFocused();
  await page.getByRole('button', { name: 'ابعت رسالة تانية' }).click();
  await expect(page.locator('#message-email')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
