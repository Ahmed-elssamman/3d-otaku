import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import {
  AdminManufacturingReviewStatus,
  AdminProductRecord,
} from '../../models/admin-product-form.model';
import { AdminProductFormPageComponent } from './admin-product-form-page.component';
import { emptyManufacturingInputs } from '../../components/manufacturing-review/manufacturing-review.component.control';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';

function manufacturingCandidate(): AdminProductRecord {
  return {
    id: 'start-review-candidate',
    name: 'Local review candidate',
    slug: 'local-review-candidate',
    category: ProductCategory.DESK_MODELS,
    material: ProductMaterial.PLA_PLUS,
    shortDescription: 'Local unit fixture',
    description: 'Saved description',
    price: 250,
    image: '',
    gallery: [],
    tags: [],
    finish: '',
    color: '',
    size: '',
    weight: '',
    printTime: '',
    isActive: false,
    isFeatured: false,
    safetyNote: '',
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
    requiresManufacturingReview: false,
  };
}

function enrolledCandidate(product: AdminProductRecord): AdminProductRecord {
  return {
    ...product,
    updatedAt: '2026-09-17T00:01:00.000Z',
    requiresManufacturingReview: true,
    manufacturingReview: {
      ...emptyManufacturingInputs(),
      revision: 0,
      status: AdminManufacturingReviewStatus.Pending,
      sampleApproved: false,
      pricingApproved: false,
      rightsReviewed: false,
      approvedAt: null,
      approvedBy: null,
      approvedFingerprint: null,
      approvedQuote: null,
      history: [],
    },
  };
}

describe('Admin product editing', () => {
  let component: AdminProductFormPageComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        MessageService,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminProductFormPageComponent());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadCandidate(product = manufacturingCandidate()): AdminProductRecord {
    component.productId.set(product.id);
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [{ name: product.category, productsCount: 1 }],
    });
    http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`).flush({
      success: true,
      message: 'Loaded',
      data: product,
    });
    return product;
  }

  it('updates preview images and validation errors after form edits', () => {
    expect(component.previewImage()).toBe('');
    expect(component.validationErrors().some((error) => error.id === 'field-name')).toBe(true);
    component.productForm.patchValue({ name: 'Desk Organizer', mainImage: '/uploads/desk.webp' });
    expect(component.previewProductName()).toBe('Desk Organizer');
    expect(component.previewImage()).toBe('/uploads/desk.webp');
    expect(component.validationErrors().some((error) => error.id === 'field-name')).toBe(false);
    component.productForm.patchValue({ price: 100, discountPrice: 120 });
    expect(component.hasPricingError()).toBe(true);
    component.productForm.controls.discountPrice.setValue(90);
    expect(component.hasPricingError()).toBe(false);
  });

  it('updates the newly created product when Save and Continue is used again', () => {
    expect(component.publicationBlocked()).toBe(true);
    expect(component.productForm.controls.isActive.disabled).toBe(true);
    expect(component.productForm.controls.isActive.value).toBe(false);
    expect(component.publicationGuidance()).toContain('تبدأ مراجعة التصنيع تلقائيًا');
    component.productForm.patchValue({
      name: 'Desk Organizer',
      category: ProductCategory.DESK_MODELS,
      shortDescription: 'Desk organizer',
      description: 'A desk organizer',
      price: 250,
      material: ProductMaterial.PLA_PLUS,
      finish: 'Matte',
      color: 'Green',
      size: '12 cm',
      weight: '40 g',
      printTime: '3 hours',
    });
    expect(component.productForm.valid).toBe(true);
    component.saveProduct(true);
    const createRequest = http.expectOne(`${environment.apiBaseUrl}/admin/products`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body.isActive).toBe(false);
    const created = enrolledCandidate({
      ...manufacturingCandidate(),
      ...createRequest.request.body,
      id: 'created-product-id',
    });
    createRequest.flush({
      success: true,
      message: 'Created',
      data: created,
    });
    expect(component.isEditMode()).toBe(true);
    expect(component.publicationBlocked()).toBe(true);
    expect(component.productForm.controls.isActive.disabled).toBe(true);
    expect(component.existingProduct()?.manufacturingReview?.consumedFilamentGrams).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([
      '/admin/products',
      created.id,
      'edit',
    ]);
    component.productForm.controls.name.setValue('Updated Desk Organizer');
    expect(component.productForm.controls.slug.value).toBe('desk-organizer');
    component.productForm.controls.price.setValue(275);
    component.saveProduct(true);
    const updateRequest = http.expectOne(
      `${environment.apiBaseUrl}/admin/products/created-product-id`,
    );
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body.isActive).toBe(false);
    updateRequest.flush({
      success: true,
      message: 'Updated',
      data: { ...created, ...updateRequest.request.body },
    });
  });

  it('explains a server publication rejection without losing a new draft or treating it as created', () => {
    const messages = vi.spyOn(TestBed.inject(MessageService), 'add');
    component.productForm.patchValue({
      name: 'Unpublished candidate',
      category: ProductCategory.DESK_MODELS,
      material: ProductMaterial.PLA_PLUS,
      price: 0,
    });
    component.saveProduct(true);
    http.expectOne(`${environment.apiBaseUrl}/admin/products`).flush(
      { success: false, message: 'Draft required', errors: { isActive: ['Start unpublished.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(component.isSubmitting()).toBe(false);
    expect(component.isEditMode()).toBe(false);
    expect(component.existingProduct()).toBeNull();
    expect(component.productForm.controls.name.value).toBe('Unpublished candidate');
    expect(component.productForm.controls.price.value).toBe(0);
    expect(messages).toHaveBeenCalledWith(
      expect.objectContaining({ detail: component.reviewText.activeCreationError }),
    );
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('preserves publication controls and price for an existing unenrolled legacy product', () => {
    const product = loadCandidate({ ...manufacturingCandidate(), isActive: true, price: 315 });
    expect(component.publicationBlocked()).toBe(false);
    expect(component.productForm.controls.isActive.enabled).toBe(true);
    expect(component.productForm.controls.isActive.value).toBe(true);
    expect(component.productForm.controls.price.value).toBe(product.price);
    expect(component.existingProduct()?.requiresManufacturingReview).toBe(false);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it('blocks saving while an edit is loading or its request failed', () => {
    component.productId.set('existing-product');
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [],
    });
    expect(component.isLoadingProduct()).toBe(true);
    expect(component.canSaveProduct()).toBe(false);
    component.saveProduct(true);
    const load = http.expectOne(`${environment.apiBaseUrl}/admin/products/existing-product`);
    expect(load.request.method).toBe('GET');
    load.flush(
      { success: false, message: 'Unavailable' },
      { status: 503, statusText: 'Unavailable' },
    );
    expect(component.isLoadingProduct()).toBe(false);
    expect(component.productLoadError()).toBeTruthy();
    expect(component.canSaveProduct()).toBe(false);
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it('blocks saving until uploads finish', () => {
    component.isUploadingModel.set(true);
    expect(component.canSaveProduct()).toBe(false);
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.isUploadingModel.set(false);
    expect(component.canSaveProduct()).toBe(true);
  });

  it('keeps product saves separate from unsaved or in-flight manufacturing review changes', () => {
    component.onReviewDirtyChanged(true);
    expect(component.canSaveProduct()).toBe(false);
    component.onReviewDirtyChanged(false);
    component.onReviewBusyChanged(true);
    expect(component.canSaveProduct()).toBe(false);
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.onReviewBusyChanged(false);
    expect(component.canSaveProduct()).toBe(true);
  });

  it('starts review only for a saved inactive unflagged product with a server update timestamp', () => {
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    loadCandidate({ ...manufacturingCandidate(), isActive: true });
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    loadCandidate({ ...manufacturingCandidate(), updatedAt: '' });
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    loadCandidate(enrolledCandidate(manufacturingCandidate()));
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    loadCandidate();
    expect(component.canStartReview()).toBe(true);
  });

  it('blocks enrollment while product fields are unsaved or an upload is pending', () => {
    const product = loadCandidate();
    component.productForm.controls.description.setValue('Unsaved product description');
    expect(component.productEditorDirty()).toBe(true);
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    component.productForm.controls.description.setValue(product.description);
    component.isUploadingImage.set(true);
    expect(component.canStartReview()).toBe(false);
    component.startManufacturingReview();
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.isUploadingImage.set(false);
    expect(component.canStartReview()).toBe(true);
  });

  it('sends only the saved expectedUpdatedAt once and preserves product input typed during enrollment', () => {
    const product = loadCandidate();
    const productUrl = `${environment.apiBaseUrl}/admin/products/${product.id}`;
    component.startManufacturingReview();
    expect(component.isStartingReview()).toBe(true);
    expect(component.canStartReview()).toBe(false);
    expect(component.canSaveProduct()).toBe(false);
    const start = http.expectOne(`${productUrl}/manufacturing-review/start`);
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toEqual({ expectedUpdatedAt: product.updatedAt });
    component.startManufacturingReview();
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.productForm.patchValue({ name: 'Typed while enrollment was pending', price: 275 });
    start.flush({ success: true, message: 'Started', data: enrolledCandidate(product) });
    expect(component.isStartingReview()).toBe(false);
    expect(component.existingProduct()?.requiresManufacturingReview).toBe(true);
    expect(component.existingProduct()?.manufacturingReview?.revision).toBe(0);
    expect(component.existingProduct()?.manufacturingReview?.consumedFilamentGrams).toBeNull();
    expect(component.existingProduct()?.manufacturingReview?.costing.laborCostEgp).toBeNull();
    expect(component.publicationBlocked()).toBe(true);
    expect(component.productForm.controls.isActive.disabled).toBe(true);
    expect(component.productForm.controls.isActive.value).toBe(false);
    expect(component.productForm.controls.name.value).toBe('Typed while enrollment was pending');
    expect(component.productForm.controls.price.value).toBe(275);
    expect(component.productEditorDirty()).toBe(true);
    expect(component.existingProduct()?.price).toBe(250);
    expect(component.canStartReview()).toBe(false);
    expect(component.canSaveProduct()).toBe(true);
    http.expectNone(productUrl);
  });

  it('retains local edits after a normalized enrollment conflict and requires an explicit successful reload', () => {
    const product = loadCandidate();
    const productUrl = `${environment.apiBaseUrl}/admin/products/${product.id}`;
    component.startManufacturingReview();
    component.productForm.controls.description.setValue(
      'Local input while the request was pending',
    );
    http
      .expectOne(`${productUrl}/manufacturing-review/start`)
      .flush(
        { success: false, message: 'Product changed' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(component.isStartingReview()).toBe(false);
    expect(component.reviewStartConflict()).toBe(true);
    expect(component.reviewStartError()).toContain('تغيّرت بيانات المنتج');
    expect(component.productForm.controls.description.value).toBe(
      'Local input while the request was pending',
    );
    expect(component.canStartReview()).toBe(false);
    expect(component.canSaveProduct()).toBe(false);
    component.startManufacturingReview();
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
    component.reloadManufacturingProduct();
    expect(component.isLoadingProduct()).toBe(true);
    expect(component.canStartReview()).toBe(false);
    expect(component.canSaveProduct()).toBe(false);
    const current = {
      ...product,
      description: 'Winning server description',
      updatedAt: '2026-09-17T00:02:00.000Z',
    };
    http.expectOne(productUrl).flush({ success: true, message: 'Loaded', data: current });
    expect(component.reviewStartConflict()).toBe(false);
    expect(component.reviewStartError()).toBe('');
    expect(component.productForm.controls.description.value).toBe('Winning server description');
    expect(component.productEditorDirty()).toBe(false);
    expect(component.canStartReview()).toBe(true);
    component.startManufacturingReview();
    const retry = http.expectOne(`${productUrl}/manufacturing-review/start`);
    expect(retry.request.body).toEqual({ expectedUpdatedAt: current.updatedAt });
    retry.flush({ success: true, message: 'Started', data: enrolledCandidate(current) });
  });

  it('keeps enrollment and product writes blocked when the explicit reload also fails', () => {
    const product = loadCandidate();
    const productUrl = `${environment.apiBaseUrl}/admin/products/${product.id}`;
    component.startManufacturingReview();
    component.productForm.controls.name.setValue('Retained after denied enrollment');
    http
      .expectOne(`${productUrl}/manufacturing-review/start`)
      .flush(
        { success: false, message: 'Administrator access required' },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(component.reviewStartConflict()).toBe(true);
    expect(component.reviewStartError()).toContain('لم تتأكد نتيجة بدء المراجعة');
    expect(component.productForm.controls.name.value).toBe('Retained after denied enrollment');
    component.reloadManufacturingProduct();
    http
      .expectOne(productUrl)
      .flush(
        { success: false, message: 'Unavailable' },
        { status: 503, statusText: 'Unavailable' },
      );
    expect(component.productLoadError()).toBeTruthy();
    expect(component.productForm.controls.name.value).toBe('Retained after denied enrollment');
    expect(component.canStartReview()).toBe(false);
    expect(component.canSaveProduct()).toBe(false);
    component.startManufacturingReview();
    component.saveProduct(true);
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it('starts without guessed business specifications and allows an unpriced inactive draft', () => {
    expect(component.productForm.controls.category.value).toBeNull();
    expect(component.categoryOptions()).toContainEqual({
      value: ProductCategory.DESK_MODELS,
      label: 'قطع المكتب',
    });
    expect(component.productForm.controls.material.value).toBeNull();
    expect(component.productForm.controls.isActive.value).toBe(false);
    component.productForm.patchValue({
      name: 'حامل مكتب',
      category: ProductCategory.DESK_MODELS,
      material: ProductMaterial.PLA_PLUS,
      price: 0,
    });
    expect(component.productForm.controls.slug.value).toBe('حامل-مكتب');
    expect(component.productForm.valid).toBe(true);
    component.saveProduct(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/admin/products`);
    expect(request.request.body.isActive).toBe(false);
    expect(request.request.body.price).toBe(0);
    expect(request.request.body.weight).toBe('');
    expect(request.request.body.finish).toBe('');
    expect(request.request.body).not.toHaveProperty('imageVariants');
    request.flush({
      success: true,
      message: 'Created',
      data: { ...request.request.body, id: 'draft-id' },
    });
    component.productForm.controls.isActive.setValue(true);
    expect(component.productForm.invalid).toBe(true);
    expect(component.validationErrors().some((error) => error.id === 'field-price')).toBe(true);
    component.productForm.controls.price.setValue(250);
    expect(component.productForm.invalid).toBe(true);
    expect(component.validationErrors().some((error) => error.id === 'field-weight')).toBe(true);
  });

  it('keeps an imported draft editable while publication awaits real manufacturing review', () => {
    const draft: AdminProductRecord = {
      id: 'review-draft',
      name: 'Licensed draft',
      slug: 'licensed-draft',
      category: ProductCategory.DESK_MODELS,
      material: ProductMaterial.PLA_PLUS,
      shortDescription: '',
      description: '',
      price: 0,
      image: '',
      gallery: [],
      tags: [],
      finish: '',
      color: '',
      size: '',
      weight: '',
      printTime: '',
      isActive: false,
      isFeatured: false,
      safetyNote: '',
      createdAt: '',
      updatedAt: '',
      requiresManufacturingReview: true,
      manufacturingReview: {
        ...emptyManufacturingInputs(),
        revision: 0,
        status: AdminManufacturingReviewStatus.Pending,
        consumedFilamentGrams: null,
        verifiedWeightGrams: null,
        verifiedPrintHours: null,
        measurementReference: '',
        sampleApproved: false,
        pricingApproved: false,
        rightsReviewed: true,
        approvedAt: null,
        approvedBy: null,
        approvedFingerprint: null,
        approvedQuote: null,
        history: [],
      },
    };
    component.productId.set(draft.id);
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [{ name: draft.category, productsCount: 1 }],
    });
    http
      .expectOne(`${environment.apiBaseUrl}/admin/products/${draft.id}`)
      .flush({ success: true, message: 'Loaded', data: draft });
    expect(component.publicationBlocked()).toBe(true);
    expect(component.productForm.controls.isActive.disabled).toBe(true);
    expect(component.productEditorDirty()).toBe(false);
    expect(component.productForm.valid).toBe(true);
    component.productForm.controls.description.setValue('Updated draft description');
    expect(component.productEditorDirty()).toBe(true);
    component.saveProduct(true);
    const update = http.expectOne(`${environment.apiBaseUrl}/admin/products/${draft.id}`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.isActive).toBe(false);
    expect(update.request.body.weight).toBe('');
    update.flush({ success: true, message: 'Saved', data: { ...draft, ...update.request.body } });
    expect(component.publicationBlocked()).toBe(true);
    expect(component.productEditorDirty()).toBe(false);
    component.productForm.controls.description.setValue('Typed while review request was pending');
    component.onManufacturingProductUpdated(draft);
    expect(component.productForm.controls.description.value).toBe(
      'Typed while review request was pending',
    );
    expect(component.productEditorDirty()).toBe(true);
  });

  it('preserves a loaded custom category while options are pending or unavailable and saves it unchanged', () => {
    const product = { ...manufacturingCandidate(), category: 'تنظيم المكتب' };
    component.productId.set(product.id);
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`).flush({
      success: true,
      message: 'Loaded',
      data: product,
    });
    expect(component.categoryOptions()).toContainEqual({
      value: 'تنظيم المكتب',
      label: 'تنظيم المكتب',
    });
    expect(component.categoriesLoading()).toBe(true);
    http
      .expectOne(`${environment.apiBaseUrl}/admin/products/categories`)
      .flush(
        { success: false, message: 'Unavailable' },
        { status: 503, statusText: 'Unavailable' },
      );
    expect(component.categoryLoadError()).toBeTruthy();
    expect(component.productForm.controls.category.value).toBe('تنظيم المكتب');
    component.productForm.controls.description.setValue('وصف محدّث');
    component.saveProduct(true);
    const update = http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`);
    expect(update.request.body.category).toBe('تنظيم المكتب');
    expect(update.request.body.description).toBe('وصف محدّث');
    update.flush({
      success: true,
      message: 'Saved',
      data: { ...product, description: 'وصف محدّث' },
    });
    component.loadCategories();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [{ name: 'هدايا وألعاب مكتبية', productsCount: 1 }],
    });
    expect(component.categoryLoadError()).toBe('');
    expect(component.categoryOptions()).toContainEqual({
      value: 'هدايا وألعاب مكتبية',
      label: 'هدايا وألعاب مكتبية',
    });
    expect(component.categoryOptions()).toContainEqual({
      value: 'تنظيم المكتب',
      label: 'تنظيم المكتب',
    });
  });

  it('uses API categories without overwriting a newly typed custom choice when options arrive', () => {
    component.ngOnInit();
    component.productForm.controls.category.setValue('تصنيف يكتبه التاجر');
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [
        { name: ProductCategory.DESK_MODELS, productsCount: 3 },
        { name: 'إكسسوارات المكتب', productsCount: 1 },
      ],
    });
    expect(component.productForm.controls.category.value).toBe('تصنيف يكتبه التاجر');
    expect(component.categoryOptions()).toContainEqual({
      value: 'إكسسوارات المكتب',
      label: 'إكسسوارات المكتب',
    });
    expect(component.categoryOptions()).toContainEqual({
      value: 'تصنيف يكتبه التاجر',
      label: 'تصنيف يكتبه التاجر',
    });
    expect(
      component.categoryOptions().filter((option) => option.value === ProductCategory.DESK_MODELS),
    ).toEqual([{ value: ProductCategory.DESK_MODELS, label: 'قطع المكتب' }]);
    component.productForm.controls.category.setValue(' ');
    expect(component.productForm.controls.category.invalid).toBe(true);
  });
});
