import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { AdminProductRecord } from '../../models/admin-product-form.model';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { environment } from '../../../../../environments/environment';
import { AdminFeaturedFilter } from '../../enums/admin-featured-filter.enum';
import { AdminProductsPageComponent } from './admin-products-page.component';

describe('Admin catalog pagination', () => {
  let component: AdminProductsPageComponent;
  let http: HttpTestingController;
  const products: AdminProductRecord[] = Array.from({ length: 23 }, (_, index) => ({
    revision: index,
    id: `product-${index + 1}`,
    slug: `product-${index + 1}`,
    name: `Product ${index + 1}`,
    category: ProductCategory.COLLECTIBLES,
    shortDescription: '',
    description: '',
    price: 100,
    image: '',
    gallery: [],
    tags: [],
    material: ProductMaterial.PLA,
    finish: 'Matte',
    color: 'Green',
    size: '10 cm',
    weight: '30 g',
    printTime: '2 hours',
    isFeatured: false,
    isActive: true,
    safetyNote: '',
    createdAt: '2026-09-16',
    updatedAt: '2026-09-16',
  }));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminProductsPageComponent());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches later backend pages and retains the complete catalog count', () => {
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [],
    });
    const first = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    expect(first.request.params.get('page')).toBe('1');
    expect(first.request.params.get('limit')).toBe('10');
    first.flush({
      success: true,
      message: 'Products',
      data: products.slice(0, 10),
      meta: {
        page: 1,
        limit: 10,
        totalItems: 23,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });
    expect(component.totalRecords()).toBe(23);

    component.onPageChange({ first: 10, rows: 10 });
    const second = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    expect(second.request.params.get('page')).toBe('2');
    second.flush({
      success: true,
      message: 'Products',
      data: products.slice(10, 20),
      meta: {
        page: 2,
        limit: 10,
        totalItems: 23,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
    expect(component.productsList()).toHaveLength(10);
    expect(component.productsList()[0].name).toBe('Product 11');
    expect(component.totalRecords()).toBe(23);

    component.onPageChange({ first: 20, rows: 10 });
    const third = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    expect(third.request.params.get('page')).toBe('3');
    third.flush({
      success: true,
      message: 'Products',
      data: products.slice(20),
      meta: {
        page: 3,
        limit: 10,
        totalItems: 23,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
    expect(component.productsList()).toHaveLength(3);
    expect(component.productsList()[0].name).toBe('Product 21');
  });

  it('sends filters to the backend and cancels stale list requests', () => {
    component.ngOnInit();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [],
    });
    const initialRequest = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    component.onFeaturedFilterChange(AdminFeaturedFilter.NOT_FEATURED);
    expect(initialRequest.cancelled).toBe(true);
    const filtered = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    expect(filtered.request.params.get('featured')).toBe('false');
    filtered.flush({
      success: true,
      message: 'Products',
      data: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    expect(component.isLoading()).toBe(false);
    expect(component.totalRecords()).toBe(0);
  });

  it('uses actual private category options and sends custom names without remapping them', () => {
    component.ngOnInit();
    const categories = http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`);
    expect(categories.request.method).toBe('GET');
    categories.flush({
      success: true,
      message: 'Categories',
      data: [
        { name: 'تنظيم المكتب', productsCount: 2 },
        { name: 'all', productsCount: 1 },
        { name: 'constructor', productsCount: 1 },
        { name: '__proto__', productsCount: 1 },
      ],
    });
    expect(component.categoryOptions().map((option) => option.value)).toEqual([
      '',
      'تنظيم المكتب',
      'all',
      'constructor',
      '__proto__',
    ]);
    expect(component.categoryOptions()).toContainEqual({
      value: 'constructor',
      label: 'constructor',
    });
    expect(component.categoryOptions()).toContainEqual({ value: '__proto__', label: '__proto__' });
    const initial = http.expectOne(
      (request) => request.url === `${environment.apiBaseUrl}/admin/products`,
    );
    component.onCategoryChange('تنظيم المكتب');
    expect(initial.cancelled).toBe(true);
    const filtered = http.expectOne((request) => request.params.get('category') === 'تنظيم المكتب');
    expect(filtered.request.url).toBe(`${environment.apiBaseUrl}/admin/products`);
    filtered.flush({
      success: true,
      message: 'Products',
      data: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    component.onCategoryChange('all');
    const literalAll = http.expectOne((request) => request.params.get('category') === 'all');
    literalAll.flush({
      success: true,
      message: 'Products',
      data: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('retains the selected category through a failed options request and an explicit retry', () => {
    component.selectedCategory.set('تصنيف محفوظ');
    component.loadCategories();
    http
      .expectOne(`${environment.apiBaseUrl}/admin/products/categories`)
      .flush(
        { success: false, message: 'Unavailable' },
        { status: 503, statusText: 'Unavailable' },
      );
    expect(component.categoriesLoading()).toBe(false);
    expect(component.categoryLoadError()).toBeTruthy();
    expect(component.categoryOptions()).toContainEqual({
      label: 'تصنيف محفوظ',
      value: 'تصنيف محفوظ',
    });
    component.loadCategories();
    http.expectOne(`${environment.apiBaseUrl}/admin/products/categories`).flush({
      success: true,
      message: 'Categories',
      data: [{ name: 'هدايا وألعاب مكتبية', productsCount: 1 }],
    });
    expect(component.categoryLoadError()).toBe('');
    expect(component.selectedCategory()).toBe('تصنيف محفوظ');
    expect(component.categoryOptions().map((option) => option.value)).toEqual([
      '',
      'هدايا وألعاب مكتبية',
      'تصنيف محفوظ',
    ]);
  });

  it('deletes using the list revision captured when confirmation opened, without a fresh detail GET', () => {
    const product = products[0];
    component.productsList.set([product]);
    const confirmation = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    component.deleteProduct(product.id);
    const accept = confirmation.mock.calls[0][0].accept;
    expect(accept).toBeTypeOf('function');
    component.productsList.set([{ ...product, revision: 8 }]);
    accept?.();
    const request = http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ expectedRevision: 0 });
    request.flush(
      { success: false, message: 'Stale', errors: { expectedRevision: ['Reload.'] } },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.mutationError()).toBe(component.mutationText.review);
    http.expectNone((pending) => pending.method === 'GET');
  });

  it('allows the same revision only after explicit list reload and new confirmation following a transient deletion failure', () => {
    const product = products[0];
    component.productsList.set([product]);
    const confirmation = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    component.deleteProduct(product.id);
    confirmation.mock.calls[0][0].accept?.();
    const url = `${environment.apiBaseUrl}/admin/products/${product.id}`;
    http
      .expectOne(url)
      .flush(
        { success: false, message: 'Unavailable' },
        { status: 503, statusText: 'Unavailable' },
      );
    component.deleteProduct(product.id);
    expect(confirmation).toHaveBeenCalledTimes(1);
    http.expectNone(url);
    component.reloadProductsForReview();
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/products`)
      .flush({
        success: true,
        message: 'Current',
        data: [product],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(component.mutationError()).toBe('');
    http.expectNone(url);
    component.deleteProduct(product.id);
    confirmation.mock.calls[1][0].accept?.();
    const retry = http.expectOne(url);
    expect(retry.request.body).toEqual({ expectedRevision: 0 });
    retry.flush({ success: false, message: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(component.busyProductId()).toBe('');
  });

  it('does not offer a delete confirmation for a record whose revision is unavailable', () => {
    const product = { ...products[0], revision: null };
    component.productsList.set([product]);
    const confirmation = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    component.deleteProduct(product.id);
    expect(confirmation).not.toHaveBeenCalled();
    expect(component.mutationError()).toBe(component.mutationText.review);
    http.expectNone((request) => request.method === 'DELETE');
  });
});
