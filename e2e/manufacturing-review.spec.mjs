import { test, expect } from './local-api.fixture.mjs';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test.use({ trace: 'off', screenshot: 'off' });

const runtime = JSON.parse(
  await readFile(new URL('../outako/backend-api/.local/runtime.json', import.meta.url), 'utf8'),
);

function localOrigin(value, ports) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !ports.includes(Number(url.port)) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Manufacturing QA requires a local frontend and disposable API.');
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const apiBase = `${apiOrigin}/api`;

async function prepareFixture(page, request, baseURL, fromLegacy = false) {
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  let session;
  try {
    const response = await request.post(`${apiBase}/auth/login`, {
      data: { email: runtime.email, password: runtime.password },
    });
    if (!response.ok()) throw new Error('Sign-in rejected.');
    session = (await response.json()).data;
  } catch {
    throw new Error('Local administrator sign-in failed; credentials are suppressed.');
  }
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const catalogResponse = await request.get(`${apiBase}/admin/products?limit=100`, { headers });
  expect(catalogResponse.ok()).toBe(true);
  const catalog = (await catalogResponse.json()).data;
  const drafts = catalog.filter((product) => product.requiresManufacturingReview);
  expect(drafts).toHaveLength(4);
  expect(
    drafts.every(
      (product) => !product.isActive && product.manufacturingReview.status === 'pending',
    ),
  ).toBe(true);
  const sourceSlug = fromLegacy ? 'templar-knight-phone-and-tablet-holder' : 'wavy-desk-bin';
  const source = catalog.find((product) => product.slug === sourceSlug);
  expect(source).toBeTruthy();
  const protectedProducts = fromLegacy ? [...drafts, source] : drafts;
  const copied = await request.post(`${apiBase}/admin/products/${source.id}/duplicate`, {
    headers,
  });
  expect(copied.status()).toBe(201);
  const fixture = (await copied.json()).data;
  expect(fixture.id).not.toBe(source.id);
  expect(fixture.requiresManufacturingReview).toBe(true);
  expect(fixture.isActive).toBe(false);

  // Only the newly returned copy can be mutated or deleted by this test.
  const productUrl = `${apiBase}/admin/products/${fixture.id}`;
  const marker = `qa-manufacturing-${randomUUID()}`;
  const cleanup = async () => {
    const currentResponse = await request.get(productUrl, { headers });
    expect(currentResponse.ok()).toBe(true);
    const current = (await currentResponse.json()).data;
    expect(current.id).toBe(fixture.id);
    expect(protectedProducts.some((product) => product.id === current.id)).toBe(false);
    expect([marker, fixture.slug]).toContain(current.slug);
    expect(current.isActive).toBe(false);
    expect(
      (
        await request.delete(productUrl, {
          headers,
          data: { expectedRevision: current.revision },
        })
      ).ok(),
    ).toBe(true);
    for (const original of protectedProducts) {
      const result = await request.get(`${apiBase}/admin/products/${original.id}`, { headers });
      expect((await result.json()).data).toEqual(original);
    }
  };

  try {
    const updated = await request.put(productUrl, {
      headers,
      data: {
        expectedRevision: fixture.revision,
        name: `اختبار محلي للتصنيع ${marker}`,
        slug: marker,
        price: 100,
        discountPrice: null,
        material: 'PLA+',
        isActive: false,
      },
    });
    expect(updated.ok()).toBe(true);
    const savedFixture = (await updated.json()).data;
    await page.route('**/*', async (route) => {
      const currentRequest = route.request();
      const url = new URL(currentRequest.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(currentRequest.method())) {
        const allowedProduct =
          url.pathname === `/api/admin/products/${fixture.id}` ||
          url.pathname.startsWith(`/api/admin/products/${fixture.id}/manufacturing-review`);
        if (
          ![webOrigin, apiOrigin].includes(url.origin) ||
          (!allowedProduct && !url.pathname.startsWith('/api/auth/'))
        ) {
          await route.abort('blockedbyclient');
          throw new Error('Manufacturing QA blocked a mutation outside its local fixture.');
        }
        if (allowedProduct && currentRequest.postDataJSON()?.isActive === true) {
          await route.abort('blockedbyclient');
          throw new Error('Manufacturing QA must leave its fixture unpublished.');
        }
      }
      await route.continue();
    });
    await page.addInitScript((auth) => {
      localStorage.setItem('3d-otaku-access-token', auth.accessToken);
      localStorage.setItem('3d-otaku-refresh-token', auth.refreshToken);
      localStorage.setItem('3d-otaku-auth-user', JSON.stringify(auth.user));
    }, session);
    await page.goto(`/admin/products/${fixture.id}/edit`);
    const panel = page.locator('app-manufacturing-review');
    await expect(panel.getByRole('heading', { name: 'مراجعة التصنيع والتكلفة' })).toBeVisible();
    return { headers, fixture, savedFixture, source, productUrl, marker, panel, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

function actionResponse(page, id, suffix, method = 'POST') {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/admin/products/${id}/manufacturing-review${suffix}` &&
      response.request().method() === method,
  );
}

async function saveInputs(page, context) {
  const saved = actionResponse(page, context.fixture.id, '', 'PUT');
  await context.panel.getByRole('button', { name: 'حفظ بيانات المراجعة', exact: true }).click();
  const response = await saved;
  expect(response.ok()).toBe(true);
  const data = (await response.json()).data;
  await expect(context.panel.locator('.review-status')).toContainText(
    `نسخة ${data.manufacturingReview.revision}`,
  );
  return data;
}

test('manufacturing review saves missing values, quotes actual inputs and explicitly approves only the QA copy', async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const context = await prepareFixture(page, request, baseURL);
  const { panel, fixture, headers, productUrl } = context;
  try {
    await expect(panel.locator('#review-consumedFilamentGrams')).toHaveValue('');
    await expect(panel.locator('#review-laborCostEgp')).toHaveValue('');
    await expect(page.locator('#product-isActive')).toBeDisabled();
    await panel
      .locator('#review-measurementReference')
      .fill('سجل اختبار آلي محلي فقط — ليس قياسًا لمنتج للبيع');
    const incomplete = await saveInputs(page, context);
    expect(incomplete.manufacturingReview.consumedFilamentGrams).toBeNull();
    expect(incomplete.manufacturingReview.costing.laborCostEgp).toBeNull();
    const invalidQuote = actionResponse(page, fixture.id, '/quote');
    await panel.getByRole('button', { name: 'حساب التسعير من الخادم' }).click();
    expect((await invalidQuote).status()).toBe(422);
    await expect(panel.getByRole('alert')).toContainText('البيانات غير مكتملة');

    const fields = {
      consumedFilamentGrams: '100',
      verifiedWeightGrams: '90',
      verifiedPrintHours: '2',
      machineCostPerHourEgp: '5',
      electricityCostPerHourEgp: '1',
      laborCostEgp: '20',
      packagingCostEgp: '10',
      hardwareCostEgp: '0',
      overheadCostEgp: '0',
      fixedPaymentFeeEgp: '0',
      failureRatePercent: '0',
      targetGrossMarginPercent: '20',
      variablePaymentFeePercent: '0',
      returnReservePercent: '0',
    };
    for (const [field, value] of Object.entries(fields))
      await panel.locator(`#review-${field}`).fill(value);
    await panel.locator('#review-material').selectOption({ label: 'PLA+' });
    await panel.locator('#review-consumption').selectOption({ label: 'نعم، يشمل الدعامات والهدر' });
    await panel.locator('#review-rounding').selectOption({ label: 'لأعلى إلى أقرب 5 جنيهات' });
    await panel.locator('#review-sampleReference').fill('عينة افتراضية لاختبار التطبيق فقط');
    await panel
      .locator('#review-rightsReference')
      .fill('نسخة اختبار محلية؛ لا يمثل هذا اعتمادًا لمنتجات الكتالوج');
    await expect(
      page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }),
    ).toBeDisabled();
    await saveInputs(page, context);
    const quoteResponse = actionResponse(page, fixture.id, '/quote');
    await panel.getByRole('button', { name: 'حساب التسعير من الخادم' }).click();
    const quote = (await (await quoteResponse).json()).data;
    // 100g × 2.50 + 2h × (5 + 1) + 20 labor + 10 packing = 292; / 80% = 365.
    expect(quote.quote.retailPriceEgp).toBe(365);
    expect(quote.quote.breakdownPiastres.material).toBe(25000);
    expect(quote.effectiveSellingPriceEgp).toBe(100);
    expect(quote.meetsQuoteTarget).toBe(false);
    await expect(panel.getByText('الربح المتوقع عند السعر المحسوب', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'اعتماد مراجعة التصنيع' })).toBeDisabled();
    await expect(
      panel.getByText('سعر البيع الحالي أقل من السعر المستهدف.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#product-price')).toHaveValue('100');

    await page.locator('#product-price').fill('400');
    const productSave = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/admin/products/${fixture.id}`) &&
        response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }).click();
    expect((await productSave).ok()).toBe(true);
    await expect(panel.locator('.quote-section')).toHaveCount(0);
    const requoteResponse = actionResponse(page, fixture.id, '/quote');
    await panel.getByRole('button', { name: 'حساب التسعير من الخادم' }).click();
    const requote = (await (await requoteResponse).json()).data;
    expect(requote.effectiveSellingPriceEgp).toBe(400);
    expect(requote.meetsQuoteTarget).toBe(true);
    const approval = panel.getByRole('button', { name: 'اعتماد مراجعة التصنيع' });
    await expect(approval).toBeDisabled();
    const attestations = panel.locator('.attestations input[type="checkbox"]');
    await expect(attestations).toHaveCount(3);
    for (let index = 0; index < 3; index++) await attestations.nth(index).check();
    const approvedResponse = actionResponse(page, fixture.id, '/approve');
    await approval.click();
    const approved = (await (await approvedResponse).json()).data;
    expect(approved.manufacturingReview.status).toBe('approved');
    expect(approved.isActive).toBe(false);
    expect(approved.price).toBe(400);
    await expect(panel.locator('.review-status')).toContainText('مراجعة معتمدة');
    await expect(page.locator('#product-isActive')).toBeEnabled();
    await expect(page.locator('#product-isActive')).not.toBeChecked();
    expect((await request.get(`${apiBase}/products/${context.marker}`)).status()).toBe(404);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await panel.screenshot({
      path: `artifacts/browser/manufacturing-approved-${testInfo.project.name}.png`,
    });
    await page.reload();
    await expect(panel.locator('.review-status')).toContainText('مراجعة معتمدة');
    expect(
      (await (await request.get(productUrl, { headers })).json()).data.manufacturingReview
        .approvedBy,
    ).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    await context.cleanup();
  }
});

test('a stale manufacturing edit keeps local input and requires explicit reload before another save', async ({
  page,
  request,
  baseURL,
}) => {
  const context = await prepareFixture(page, request, baseURL);
  const { panel, fixture, headers, productUrl } = context;
  try {
    await panel.locator('#review-consumedFilamentGrams').fill('120');
    const changed = await request.put(productUrl, {
      headers,
      data: { price: 110, isActive: false, expectedRevision: context.savedFixture.revision },
    });
    expect(changed.ok()).toBe(true);
    const staleSave = actionResponse(page, fixture.id, '', 'PUT');
    await panel.getByRole('button', { name: 'حفظ بيانات المراجعة', exact: true }).click();
    expect((await staleSave).status()).toBe(409);
    await expect(panel.getByRole('alert')).toContainText('تغيّرت نسخة المراجعة');
    await expect(panel.locator('#review-consumedFilamentGrams')).toHaveValue('120');
    await expect(
      panel.getByRole('button', { name: 'حفظ بيانات المراجعة', exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole('button', { name: 'تجاهل تعديلات المراجعة وإعادة تحميل المنتج', exact: true })
      .click();
    await expect(panel.locator('#review-consumedFilamentGrams')).toHaveValue('');
    await expect(page.locator('#product-price')).toHaveValue('110');
    await expect(panel.getByRole('alert')).toHaveCount(0);
    await panel.locator('#review-consumedFilamentGrams').fill('125');
    const saved = await saveInputs(page, context);
    expect(saved.manufacturingReview.consumedFilamentGrams).toBe(125);
    expect(saved.isActive).toBe(false);
  } finally {
    await context.cleanup();
  }
});

test('a stale product save preserves local edits and merges only after explicit review', async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  const context = await prepareFixture(page, request, baseURL);
  const { headers, productUrl, savedFixture } = context;
  const localName = `تعديل محلي ${context.marker}`;
  const currentName = `نسخة الخادم ${context.marker}`;
  const currentDescription = 'وصف محفوظ في جلسة أخرى لا يجوز استبداله ببيانات قديمة.';
  const productPath = new URL(productUrl).pathname;
  const mutations = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === productPath && request.method() === 'PUT') {
      mutations.push(request.postDataJSON().expectedRevision);
    }
  });
  const saveButton = page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true });
  try {
    await page.locator('#product-name').fill(localName);
    const externalSave = await request.put(productUrl, {
      headers,
      data: {
        expectedRevision: savedFixture.revision,
        name: currentName,
        description: currentDescription,
        price: 110,
        isActive: false,
      },
    });
    expect(externalSave.ok()).toBe(true);
    const current = (await externalSave.json()).data;
    const rejectedSave = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === productPath && response.request().method() === 'PUT',
    );
    await saveButton.click();
    expect((await rejectedSave).status()).toBe(409);
    const conflict = page.locator('.product-conflict');
    await expect(conflict).toBeVisible();
    await expect(page.locator('#product-name')).toHaveValue(localName);
    await expect(page.locator('#product-price')).toHaveValue('100');
    await expect(saveButton).toBeDisabled();
    expect(mutations).toEqual([savedFixture.revision]);
    expect((await (await request.get(productUrl, { headers })).json()).data).toEqual(current);

    const reviewResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === productPath && response.request().method() === 'GET',
    );
    await conflict.getByRole('button', { name: 'تحميل أحدث نسخة للمراجعة', exact: true }).click();
    expect((await reviewResponse).ok()).toBe(true);
    await expect(conflict.locator('.conflict-fields')).toContainText(currentName);
    await expect(conflict.locator('.conflict-fields')).toContainText(localName);
    await expect(conflict.locator('.conflict-fields')).toContainText(currentDescription);
    await expect(page.locator('#product-name')).toHaveValue(localName);
    await expect(page.locator('#product-price')).toHaveValue('100');
    await expect(saveButton).toBeDisabled();
    expect(mutations).toEqual([savedFixture.revision]);
    await conflict.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('product-conflict-review.png'),
      fullPage: true,
    });
    await conflict.screenshot({ path: testInfo.outputPath('product-conflict-panel.png') });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    await conflict
      .getByRole('button', { name: 'الاحتفاظ بتعديلاتي ومراجعة الحفظ', exact: true })
      .click();
    await expect(conflict).toHaveCount(0);
    await expect(page.locator('#product-name')).toHaveValue(localName);
    await expect(page.locator('textarea[formcontrolname="description"]')).toHaveValue(
      currentDescription,
    );
    await expect(page.locator('#product-price')).toHaveValue('110');
    await expect(page.locator('#product-isActive')).not.toBeChecked();
    await expect(page.locator('#product-isActive')).toBeDisabled();
    await expect(saveButton).toBeEnabled();
    expect(mutations).toEqual([savedFixture.revision]);

    const explicitSave = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === productPath && response.request().method() === 'PUT',
    );
    await saveButton.click();
    const saved = await explicitSave;
    expect(saved.ok()).toBe(true);
    const result = (await saved.json()).data;
    expect(result.name).toBe(localName);
    expect(result.description).toBe(currentDescription);
    expect(result.price).toBe(110);
    expect(result.isActive).toBe(false);
    expect(result.revision).toBe(current.revision + 1);
    expect(mutations).toEqual([savedFixture.revision, current.revision]);
    await page.reload();
    await expect(page.locator('#product-name')).toHaveValue(localName);
    await expect(page.locator('#product-price')).toHaveValue('110');
    expect((await request.get(`${apiBase}/products/${context.marker}`)).status()).toBe(404);
    expect(errors).toEqual([]);
  } finally {
    await context.cleanup();
  }
});

test('a legacy product copy automatically requires review without approving its copied specifications', async ({
  page,
  request,
  baseURL,
}) => {
  const starts = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/manufacturing-review/start')) {
      starts.push(request.url());
    }
  });
  const context = await prepareFixture(page, request, baseURL, true);
  const { panel, fixture, source } = context;
  try {
    expect(source.requiresManufacturingReview).toBe(false);
    expect(fixture.requiresManufacturingReview).toBe(true);
    expect(fixture.isActive).toBe(false);
    expect(fixture.price).toBe(source.price);
    for (const field of [
      'material',
      'finish',
      'color',
      'size',
      'weight',
      'printTime',
      'image',
      'gallery',
      'modelUrl',
    ]) {
      expect(fixture[field]).toEqual(source[field]);
    }
    expect(fixture.manufacturingReview.consumedFilamentGrams).toBeNull();
    expect(fixture.manufacturingReview.verifiedWeightGrams).toBeNull();
    expect(fixture.manufacturingReview.costing.laborCostEgp).toBeNull();
    expect(fixture.manufacturingReview.approvedQuote).toBeNull();
    await expect(page.getByRole('button', { name: 'بدء مراجعة التصنيع', exact: true })).toHaveCount(
      0,
    );
    await expect(panel.locator('#review-consumedFilamentGrams')).toHaveValue('');
    await expect(panel.locator('#review-verifiedWeightGrams')).toHaveValue('');
    await expect(page.locator('#product-isActive')).toBeDisabled();
    await expect(panel.locator('.review-status')).toContainText('قيد المراجعة');
    await panel
      .locator('#review-measurementReference')
      .fill('مرجع اختبار فقط؛ القياسات غير متوفرة');
    const saved = await saveInputs(page, context);
    expect(saved.manufacturingReview.consumedFilamentGrams).toBeNull();
    expect(saved.manufacturingReview.verifiedWeightGrams).toBeNull();
    expect(saved.manufacturingReview.pricingApproved).toBe(false);
    await page.reload();
    await expect(panel.locator('#review-verifiedWeightGrams')).toHaveValue('');
    await expect(page.locator('#product-isActive')).toBeDisabled();
    const incompleteQuote = actionResponse(page, fixture.id, '/quote');
    await panel.getByRole('button', { name: 'حساب التسعير من الخادم' }).click();
    expect((await incompleteQuote).status()).toBe(422);
    expect(starts).toEqual([]);
    expect((await request.get(`${apiBase}/products/${context.marker}`)).status()).toBe(404);
  } finally {
    await context.cleanup();
  }
});
