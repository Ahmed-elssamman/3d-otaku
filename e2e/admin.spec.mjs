import { test, expect } from './local-api.fixture.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

test.use({
  baseURL:
    process.env.ADMIN_QA_BASE_URL || process.env.STORE_E2E_BASE_URL || 'http://127.0.0.1:4200',
  trace: 'off',
  screenshot: 'off',
});

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
    throw new Error('Admin QA is restricted to the local frontend and API.');
  }
  return url.origin;
}

const apiOrigin = localOrigin(runtime.url, [4000]);
const apiBase = `${apiOrigin}/api`;

test.beforeEach(async ({ page, baseURL }) => {
  const webOrigin = localOrigin(baseURL, [4200, 4300]);
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ![webOrigin, apiOrigin].includes(url.origin)
    ) {
      await route.abort('blockedbyclient');
      throw new Error('A nonlocal mutation was blocked by the admin QA guard.');
    }
    await route.continue();
  });
});

async function signInAdmin(page, testInfo) {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  try {
    await page.locator('#login-email').fill(runtime.email);
    await page.locator('#login-password').fill(runtime.password);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
    );
    await page.locator('.auth-form button[type="submit"]').click();
    const response = await responsePromise;
    const limitHeader = response.headers()['ratelimit'] || '';
    const limits = [...limitHeader.matchAll(/r=(\d+);\s*t=(\d+)/g)].map((match) => ({
      remaining: Number(match[1]),
      resetSeconds: Number(match[2]),
    }));
    await writeFile(testInfo.outputPath('auth-quota.json'), JSON.stringify(limits));
    if (!response.ok()) throw new Error('Sign-in request was rejected.');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  } catch {
    await page
      .locator('#login-email')
      .fill('')
      .catch(() => null);
    await page
      .locator('#login-password')
      .fill('')
      .catch(() => null);
    throw new Error('Local admin sign-in did not finish; credential details have been suppressed.');
  }
}

async function removeTestProduct(page, request, id, marker) {
  if (!id) return;
  const token = await page.evaluate(() => localStorage.getItem('3d-otaku-access-token'));
  if (!token)
    throw new Error(
      'The local test product could not be cleaned up because the admin session ended.',
    );
  const headers = { Authorization: `Bearer ${token}` };
  const response = await request.get(`${apiBase}/admin/products/${encodeURIComponent(id)}`, {
    headers,
  });
  if (!response.ok()) throw new Error('Unable to inspect the local test product before cleanup.');
  const { data: product } = await response.json();
  if (product.slug !== marker || product.isActive !== false) {
    throw new Error('Cleanup stopped: the product does not match the inactive QA fixture.');
  }
  const cleanup = await request.delete(`${apiBase}/admin/products/${encodeURIComponent(id)}`, {
    headers,
    data: { expectedRevision: product.revision },
  });
  expect(cleanup.ok()).toBe(true);
}

test('admin signs in, browses real pages and saves an inactive product with an image preview', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90000);
  const marker = `qa-admin-${Date.now()}-${testInfo.project.name}`;
  const productName = `Local QA ${marker}`;
  const pageErrors = [];
  const productMutations = [];
  let createdId = '';
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (
      /\/api\/admin\/products(?:\/[a-f0-9]+)?$/.test(request.url()) &&
      ['POST', 'PUT'].includes(request.method())
    ) {
      productMutations.push(request.method());
    }
  });
  await page.route('**/api/admin/products**', async (route) => {
    if (
      ['POST', 'PUT'].includes(route.request().method()) &&
      route.request().postDataJSON()?.isActive !== false
    ) {
      await route.abort('blockedbyclient');
      throw new Error('The QA product must remain unpublished.');
    }
    await route.fallback();
  });

  try {
    await signInAdmin(page, testInfo);
    await expect(page.getByRole('heading', { name: 'نظرة عامة على المتجر' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/browser/admin-dashboard-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const menuToggle = page.getByRole('button', { name: 'فتح قائمة الإدارة', exact: true });
    if (await menuToggle.isVisible()) {
      await expect(page.locator('#admin-navigation')).toBeHidden();
      await menuToggle.click();
      await expect(page.locator('#admin-navigation')).toBeVisible();
      await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(page.locator('#admin-navigation')).toBeHidden();
      await expect(menuToggle).toBeFocused();
    }
    await expect(page.getByText('Invalid PrimeUI License')).toHaveCount(0);
    await page.locator('.dashboard-links a[href="/admin/products"]').click();
    await expect(page.getByRole('heading', { name: 'إدارة المنتجات' })).toBeVisible();
    await expect(page.locator('p-table tbody tr').first()).toBeVisible();
    const accessToken = await page.evaluate(() => localStorage.getItem('3d-otaku-access-token'));
    if (!accessToken) throw new Error('The local admin session is missing.');
    const adminHeaders = { Authorization: `Bearer ${accessToken}` };
    const baselineResponse = await request.get(`${apiBase}/admin/products?limit=100`, {
      headers: adminHeaders,
    });
    expect(baselineResponse.ok()).toBe(true);
    const baseline = await baselineResponse.json();
    const reviewDrafts = baseline.data.filter(
      (product) => product.requiresManufacturingReview && product.isActive === false,
    );
    expect(baseline.meta.totalItems).toBe(16);
    expect(baseline.data).toHaveLength(16);
    expect(reviewDrafts).toHaveLength(4);
    const importedCategory = reviewDrafts[0].category;
    expect(baseline.data.every((product) => !product.deletedAt)).toBe(true);
    await expect(page.locator('.p-paginator-current')).toContainText('من 16 منتج');
    await expect(page.getByText('مسودة غير منشورة', { exact: true })).toHaveCount(4);
    await page.locator('#admin-product-category').click();
    const categoryResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/admin/products' &&
        url.searchParams.get('category') === importedCategory
      );
    });
    await page.getByRole('option', { name: importedCategory, exact: true }).click();
    const categoryResult = await (await categoryResponse).json();
    expect(categoryResult.meta.totalItems).toBe(
      baseline.data.filter((product) => product.category === importedCategory).length,
    );
    expect(categoryResult.data.every((product) => product.category === importedCategory)).toBe(
      true,
    );
    await page.locator('#admin-product-category').click();
    await page.getByRole('option', { name: 'كل التصنيفات', exact: true }).click();
    await expect(page.locator('.p-paginator-current')).toContainText('من 16 منتج');
    const nextPage = page.getByRole('button', { name: 'الصفحة التالية', exact: true });
    if (await nextPage.isEnabled()) {
      const pageResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === '/api/admin/products' && url.searchParams.get('page') === '2';
      });
      await nextPage.click();
      expect((await pageResponse).ok()).toBe(true);
      await expect(page.locator('p-table tbody tr').first()).toBeVisible();
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/browser/admin-products-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page
      .locator('.products-header')
      .getByRole('link', { name: 'إضافة منتج', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'إضافة منتج', exact: true, level: 2 }),
    ).toBeVisible();
    const theme = await page
      .locator('p-button button')
      .first()
      .evaluate((button) => {
        const styles = getComputedStyle(button);
        return {
          padding: Number.parseFloat(styles.paddingInlineStart),
          radius: Number.parseFloat(styles.borderRadius),
        };
      });
    expect(
      theme.padding,
      'PrimeNG buttons should receive the configured Aura theme',
    ).toBeGreaterThan(0);
    expect(
      theme.radius,
      'PrimeNG controls should be styled after opening the lazy admin route',
    ).toBeGreaterThan(0);
    await expect(page.locator('#product-isActive')).toBeDisabled();
    await expect(page.locator('#product-isActive')).not.toBeChecked();
    await expect(page.getByText('تبدأ مراجعة التصنيع تلقائيًا', { exact: false })).toBeVisible();
    await page.locator('input[formcontrolname="name"]').fill(productName);
    await page.locator('input[formcontrolname="slug"]').fill(marker);
    await page.locator('p-select[formcontrolname="category"]').getByRole('button').click();
    await page.getByRole('option', { name: importedCategory, exact: true }).click();
    await page.locator('p-select[formcontrolname="material"]').click();
    await page.getByRole('option', { name: 'PLA+', exact: true }).click();
    await page
      .locator('textarea[formcontrolname="shortDescription"]')
      .fill('Inactive fixture for local browser verification.');
    await page
      .locator('textarea[formcontrolname="description"]')
      .fill(
        'This disposable product verifies local admin editing and uploads. It is not offered for sale.',
      );
    await page.locator('p-inputnumber[formcontrolname="price"] input').fill('275');
    await page.locator('#product-finish').fill('Matte');
    await page.locator('#product-color').fill('Green');
    await page.locator('#product-size').fill('12 x 6 x 4 cm');
    await page.locator('#product-weight').fill('45 g');
    await page.locator('#product-printTime').fill('3 hours');

    const imageFixture = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('A canvas is required to create a valid local PNG fixture.');
      context.fillStyle = '#355e4b';
      context.fillRect(0, 0, 64, 64);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const uploadPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/uploads/image') &&
        response.request().method() === 'POST',
    );
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'local-qa-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from(imageFixture, 'base64'),
      });
    const uploaded = await uploadPromise;
    expect(uploaded.ok()).toBe(true);
    const { data: image } = await uploaded.json();
    expect(new URL(image.url).origin).toBe(apiOrigin);
    await expect(page.locator('input[formcontrolname="mainImage"]')).toHaveValue(image.url);
    const preview = page.locator('app-admin-file-preview img').first();
    await expect(preview).toHaveAttribute('src', image.url);
    await expect
      .poll(() => preview.evaluate((element) => element.complete && element.naturalWidth > 0))
      .toBe(true);

    const modelUploadPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/uploads/model') &&
        response.request().method() === 'POST',
    );
    const facets = [
      [
        [0, 0, 0],
        [0, 10, 0],
        [10, 0, 0],
      ],
      [
        [0, 0, 0],
        [10, 0, 0],
        [0, 0, 10],
      ],
      [
        [0, 0, 0],
        [0, 0, 10],
        [0, 10, 0],
      ],
      [
        [10, 0, 0],
        [0, 10, 0],
        [0, 0, 10],
      ],
    ]
      .map(
        (vertices) =>
          `facet normal 0 0 0\nouter loop\n${vertices.map((vertex) => `vertex ${vertex.join(' ')}`).join('\n')}\nendloop\nendfacet`,
      )
      .join('\n');
    await page.locator('.media-upload-zone--model input[type="file"]').setInputFiles({
      name: 'local-qa-tetrahedron.stl',
      mimeType: 'model/stl',
      buffer: Buffer.from(`solid localqa\n${facets}\nendsolid localqa\n`),
    });
    const uploadedModel = await modelUploadPromise;
    expect(uploadedModel.ok()).toBe(true);
    const { data: model } = await uploadedModel.json();
    expect(new URL(model.url).origin).toBe(apiOrigin);
    await expect(page.locator('input[formcontrolname="modelUrl"]')).toHaveValue(model.url);
    await page.locator('app-admin-file-preview').scrollIntoViewIfNeeded();
    const viewer = page.locator('app-product-3d-viewer');
    await expect(viewer.locator('canvas')).toBeVisible();
    await expect(viewer.getByRole('group', { name: 'ألوان المجسم للمعاينة' })).toBeVisible({
      timeout: 15000,
    });
    await expect(viewer.getByRole('heading', { name: 'المعاينة التفاعلية مش متاحة' })).toHaveCount(
      0,
    );
    await viewer.getByRole('button', { name: 'تصغير المجسم', exact: true }).click();
    await viewer.getByRole('button', { name: 'إيقاف الدوران', exact: true }).click();
    await expect(viewer.getByRole('button', { name: 'تشغيل الدوران', exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'أخضر', exact: true }).click();
    await expect(viewer.getByRole('button', { name: 'أخضر', exact: true })).toHaveClass(/active/);

    await viewer.getByRole('button', { name: 'تدوير المجسم ربع لفة', exact: true }).click();
    await viewer.getByRole('button', { name: 'تغيير اتجاه المجسم', exact: true }).click();
    await expect(viewer.getByRole('group', { name: 'ألوان المجسم للمعاينة' })).toBeVisible();
    const contextControl = await viewer.locator('canvas').evaluateHandle((canvas) => {
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return context?.getExtension('WEBGL_lose_context') || null;
    });
    const supportsContextLoss = await contextControl.evaluate((extension) => Boolean(extension));
    if (supportsContextLoss) {
      await viewer.getByRole('button', { name: 'عرض بملء الشاشة', exact: true }).click();
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
      await contextControl.evaluate((extension) => extension.loseContext());
      await expect(
        viewer.getByRole('heading', { name: 'المعاينة التفاعلية مش متاحة' }),
      ).toBeVisible();
      await expect(
        viewer.getByRole('button', { name: 'حاول مرة تانية', exact: true }),
      ).toBeVisible();
      const exitFullscreen = viewer.getByRole('button', {
        name: 'الخروج من ملء الشاشة',
        exact: true,
      });
      await expect(exitFullscreen).toBeVisible();
      await exitFullscreen.click();
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
      await contextControl.evaluate((extension) => extension.restoreContext());
      await expect(viewer.getByRole('group', { name: 'ألوان المجسم للمعاينة' })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        viewer.getByRole('heading', { name: 'المعاينة التفاعلية مش متاحة' }),
      ).toHaveCount(0);
      await expect(viewer.getByRole('button', { name: 'أخضر', exact: true })).not.toHaveClass(
        /active/,
      );
      await viewer.getByRole('button', { name: 'أخضر', exact: true }).click();
      await expect(viewer.getByRole('button', { name: 'أخضر', exact: true })).toHaveClass(/active/);
    } else {
      testInfo.annotations.push({
        type: 'browser-capability',
        description: 'WEBGL_lose_context unavailable; context recovery assertions were not run.',
      });
    }
    await contextControl.dispose();
    const recoveryEvidence = testInfo.outputPath('webgl-context-recovery.txt');
    await writeFile(
      recoveryEvidence,
      supportsContextLoss
        ? 'Actual WEBGL_lose_context loss/restoration, fullscreen error exit and color reset passed.'
        : 'WEBGL_lose_context unavailable in this browser; recovery assertions not run.',
    );
    await testInfo.attach('webgl-context-recovery', {
      path: recoveryEvidence,
      contentType: 'text/plain',
    });

    const galleryUrls = Array.from(
      { length: 31 },
      (_, index) => `${image.url}#qa-gallery-${index}`,
    );
    await page.locator('#product-galleryImages').fill(galleryUrls.join(', '));
    await page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }).click();
    await expect(page.locator('.validation-notice')).toContainText('30');
    await expect(page.locator('#field-gallery-images .field-error-msg')).toContainText('30');
    expect(productMutations).toEqual([]);
    await expect(page.locator('#product-galleryImages')).toHaveValue(galleryUrls.join(', '));
    await page.locator('#product-galleryImages').fill('');
    await expect(page.locator('.validation-notice')).toHaveCount(0);

    const createPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/products') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }).click();
    const createResponse = await createPromise;
    expect(createResponse.ok()).toBe(true);
    const { data: created } = await createResponse.json();
    createdId = created.id || created._id;
    expect(created.isActive).toBe(false);
    expect(created.requiresManufacturingReview).toBe(true);
    expect(created.manufacturingReview.status).toBe('pending');
    expect(created.manufacturingReview.consumedFilamentGrams).toBeNull();
    expect(created.slug).toBe(marker);
    expect(created.category).toBe(importedCategory);
    await expect(page).toHaveURL(new RegExp(`/admin/products/${createdId}/edit$`));
    await expect(
      page.getByRole('heading', { name: 'تعديل المنتج', exact: true, level: 2 }),
    ).toBeVisible();

    await page.locator('input[formcontrolname="name"]').fill(`${productName} updated`);
    await expect(page.locator('input[formcontrolname="slug"]')).toHaveValue(marker);
    await page.locator('p-inputnumber[formcontrolname="price"] input').fill('285');
    const updatePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/admin/products/${createdId}`) &&
        response.request().method() === 'PUT',
    );
    const updateUrl = new URL(`/api/admin/products/${createdId}`, page.url()).href;
    let releaseSave = () => {};
    const heldSave = new Promise((resolve) => {
      releaseSave = resolve;
    });
    let saveReachedServer = false;
    await page.route(updateUrl, async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      const payload = route.request().postDataJSON();
      expect(payload.isActive).toBe(false);
      expect(payload.expectedRevision).toBe(created.revision);
      const response = await route.fetch({ maxRetries: 0 });
      saveReachedServer = true;
      await heldSave;
      await route.fulfill({ response });
    });
    try {
      await page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }).click();
      await expect.poll(() => saveReachedServer, { timeout: 15000 }).toBe(true);
      await expect(page.locator('#product-name')).toBeDisabled();
      await expect(page.locator('#product-price')).toBeDisabled();
      const uploadInputs = page.locator('.product-editor input[type="file"]');
      await expect(uploadInputs).toHaveCount(5);
      for (const input of await uploadInputs.all()) await expect(input).toBeDisabled();
      await expect(
        page.getByRole('button', { name: 'حفظ ومتابعة التعديل', exact: true }),
      ).toBeDisabled();
      await page.screenshot({ path: testInfo.outputPath('product-save-locked.png') });
    } finally {
      releaseSave();
    }
    const updateResponse = await updatePromise;
    await page.unroute(updateUrl);
    expect(updateResponse.ok()).toBe(true);
    const { data: updated } = await updateResponse.json();
    expect(updated.id || updated._id).toBe(createdId);
    expect(updated.price).toBe(285);
    expect(updated.category).toBe(importedCategory);
    expect(updated.isActive).toBe(false);
    expect(updated.revision).toBe(created.revision + 1);
    await expect(page.locator('#product-name')).toBeEnabled();
    await expect(page.locator('#product-price')).toBeEnabled();
    await expect(page.locator('#product-isActive')).toBeDisabled();
    expect(productMutations).toEqual(['POST', 'PUT']);
    const publicResponse = await request.get(`${apiBase}/products/${marker}`);
    expect(publicResponse.status()).toBe(404);
    await page.reload();
    await expect(page.locator('p-inputnumber[formcontrolname="price"] input')).toHaveValue('285');
    await expect(page.locator('input[formcontrolname="slug"]')).toHaveValue(marker);
    await expect(page.locator('p-select[formcontrolname="category"] input')).toHaveValue(
      importedCategory,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(pageErrors).toEqual([]);
    await page.screenshot({
      path: `artifacts/browser/admin-product-${testInfo.project.name}.png`,
      fullPage: true,
    });

    await page.goto('/admin/products');
    await expect(page.locator('.p-paginator-current')).toContainText('من 17 منتج');
    const afterCreateResponse = await request.get(`${apiBase}/admin/products`, {
      headers: adminHeaders,
    });
    expect(afterCreateResponse.ok()).toBe(true);
    const afterCreate = await afterCreateResponse.json();
    expect(afterCreate.meta.totalItems).toBe(baseline.meta.totalItems + 1);
    const filteredResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/admin/products' && url.searchParams.get('search') === marker;
    });
    await page.locator('#admin-product-search').fill(marker);
    const filtered = await (await filteredResponse).json();
    expect(filtered.meta.totalItems).toBe(1);
    expect(filtered.data[0].id || filtered.data[0]._id).toBe(createdId);
    const fixtureRow = page
      .locator('p-table tbody tr')
      .filter({ hasText: `${productName} updated` });
    await expect(fixtureRow).toHaveCount(1);
    await fixtureRow.getByRole('button', { name: 'حذف', exact: true }).click();
    const changedAfterConfirmation = await request.put(`${apiBase}/admin/products/${createdId}`, {
      headers: adminHeaders,
      data: { expectedRevision: updated.revision, price: 286, isActive: false },
    });
    expect(changedAfterConfirmation.ok()).toBe(true);
    const currentBeforeDelete = (await changedAfterConfirmation.json()).data;
    const rejectedDeletion = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/admin/products/${createdId}` &&
        response.request().method() === 'DELETE',
    );
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'حذف المنتج', exact: true })
      .click();
    const staleDeletion = await rejectedDeletion;
    expect(staleDeletion.status()).toBe(409);
    expect(staleDeletion.request().postDataJSON()).toEqual({ expectedRevision: updated.revision });
    expect(
      (
        await (
          await request.get(`${apiBase}/admin/products/${createdId}`, { headers: adminHeaders })
        ).json()
      ).data,
    ).toEqual(currentBeforeDelete);
    await expect(page.locator('.products-page .product-error')).toContainText(
      'حمّل القائمة الحالية',
    );
    const reviewedListResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/admin/products' &&
        url.searchParams.get('search') === marker &&
        response.request().method() === 'GET'
      );
    });
    await page.getByRole('button', { name: 'تحميل القائمة الحالية للمراجعة', exact: true }).click();
    const reviewedList = await (await reviewedListResponse).json();
    expect(reviewedList.data[0].revision).toBe(currentBeforeDelete.revision);
    await expect(page.locator('.products-page .product-error')).toHaveCount(0);
    const deletedId = createdId;
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/admin/products/${deletedId}`) &&
        response.request().method() === 'DELETE',
    );
    const filteredAfterDeleteResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/admin/products' &&
        url.searchParams.get('search') === marker &&
        response.request().method() === 'GET'
      );
    });
    await fixtureRow.getByRole('button', { name: 'حذف', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'حذف المنتج', exact: true })
      .click();
    const confirmedDeletion = await deleteResponse;
    expect(confirmedDeletion.ok()).toBe(true);
    expect(confirmedDeletion.request().postDataJSON()).toEqual({
      expectedRevision: currentBeforeDelete.revision,
    });
    createdId = '';
    expect((await filteredAfterDeleteResponse).ok()).toBe(true);
    await expect(page.getByText('لا توجد منتجات مطابقة', { exact: true })).toBeVisible();
    const filteredAfterDeleteCheck = await request.get(`${apiBase}/admin/products`, {
      headers: adminHeaders,
      params: { search: marker },
    });
    expect(filteredAfterDeleteCheck.ok()).toBe(true);
    const filteredAfterDelete = await filteredAfterDeleteCheck.json();
    expect(filteredAfterDelete.meta.totalItems).toBe(0);
    expect(filteredAfterDelete.data).toHaveLength(0);

    await page.reload();
    await expect(page.locator('.p-paginator-current')).toContainText('من 16 منتج');
    const refreshedResponse = await request.get(`${apiBase}/admin/products?limit=100`, {
      headers: adminHeaders,
    });
    expect(refreshedResponse.ok()).toBe(true);
    const refreshed = await refreshedResponse.json();
    expect(refreshed.meta.totalItems).toBe(baseline.meta.totalItems);
    expect(refreshed.data.some((product) => (product.id || product._id) === deletedId)).toBe(false);
    await expect(page.locator('.p-paginator-current')).toContainText('من 16 منتج');
    await expect(page.getByText('مسودة غير منشورة', { exact: true })).toHaveCount(4);
    const missingDetail = await request.get(`${apiBase}/admin/products/${deletedId}`, {
      headers: adminHeaders,
    });
    expect(missingDetail.status()).toBe(404);
    const absentSearch = await request.get(`${apiBase}/admin/products`, {
      headers: adminHeaders,
      params: { search: marker },
    });
    expect((await absentSearch.json()).meta.totalItems).toBe(0);
    await writeFile(
      testInfo.outputPath('product-deletion-regression.json'),
      JSON.stringify(
        {
          baselineTotal: baseline.meta.totalItems,
          sourceProducts: baseline.data.length - reviewDrafts.length,
          reviewDrafts: reviewDrafts.length,
          afterCreateTotal: afterCreate.meta.totalItems,
          searchBeforeDelete: filtered.meta.totalItems,
          searchAfterDelete: filteredAfterDelete.meta.totalItems,
          afterRefreshTotal: refreshed.meta.totalItems,
          deletedDetailStatus: missingDetail.status(),
        },
        null,
        2,
      ),
    );
    await page.screenshot({
      path: `artifacts/browser/admin-products-final-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await removeTestProduct(page, request, createdId, marker);
  }
});

test('an ordinary customer is denied the admin route and admin API', async ({ page, request }) => {
  const identity = randomBytes(12).toString('hex');
  const password = `${randomBytes(24).toString('base64url')}aA1`;
  const registration = await request.post(`${apiBase}/auth/register`, {
    data: {
      fullName: 'Local QA Customer',
      email: `qa-customer-${identity}@example.test`,
      password,
      confirmPassword: password,
    },
  });
  expect(registration.status()).toBe(201);
  const { data: session } = await registration.json();
  expect(session.user.role).toBe('customer');
  await page.addInitScript((auth) => {
    localStorage.setItem('3d-otaku-access-token', auth.accessToken);
    localStorage.setItem('3d-otaku-refresh-token', auth.refreshToken);
    localStorage.setItem('3d-otaku-auth-user', JSON.stringify(auth.user));
  }, session);
  await page.goto('/admin/products');
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('app-admin-layout')).toHaveCount(0);
  const forbidden = await request.get(`${apiBase}/admin/products`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  expect(forbidden.status()).toBe(403);
  const logout = await request.post(`${apiBase}/auth/logout`, {
    data: { refreshToken: session.refreshToken },
  });
  expect(logout.ok()).toBe(true);
});
