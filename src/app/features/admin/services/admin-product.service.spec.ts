import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { environment } from '../../../../environments/environment';
import { AdminProductRecord } from '../models/admin-product-form.model';
import { AdminProductService } from './admin-product.service';

function productRecord(): AdminProductRecord {
  return {
    id: 'product-version',
    revision: 4,
    name: 'Test product',
    slug: 'test-product',
    category: 'Test category',
    shortDescription: '',
    description: '',
    price: 0,
    discountPrice: null,
    image: '',
    gallery: [],
    tags: [],
    material: ProductMaterial.PLA,
    finish: '',
    color: '',
    size: '',
    weight: '',
    printTime: '',
    isActive: false,
    isFeatured: false,
    safetyNote: '',
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    requiresManufacturingReview: true,
    configurationFingerprint: 'server-only-configuration',
    imageVariants: [],
  };
}

describe('Admin product mutation contracts', () => {
  let service: AdminProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminProductService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the caller snapshot revision and excludes response-only metadata while preserving zero and null money', () => {
    const product = productRecord();
    let returned: AdminProductRecord | null = null;
    service
      .updateProduct(product.id, product, 4)
      .subscribe((response) => (returned = response.data));
    const request = http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      expectedRevision: 4,
      price: 0,
      discountPrice: null,
      isActive: false,
    });
    for (const key of [
      'revision',
      'requiresManufacturingReview',
      'manufacturingReview',
      'configurationFingerprint',
      'imageVariants',
      'id',
      'updatedAt',
      'createdAt',
    ]) {
      expect(request.request.body).not.toHaveProperty(key);
    }
    request.flush({ success: true, message: 'Saved', data: { ...product, revision: 5 } });
    expect(returned).toMatchObject({ id: product.id, revision: 5 });
    http.expectNone((pending) => pending.method === 'GET');
  });

  it('maps an unusable response revision to null instead of inventing an editable version', () => {
    const product = productRecord();
    let returned: AdminProductRecord | null = null;
    service.getProductById(product.id).subscribe((response) => (returned = response.data));
    http
      .expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`)
      .flush({ success: true, message: 'Loaded', data: { ...product, revision: -1 } });
    expect(returned).toMatchObject({ revision: null });
  });

  it('sends a zero captured revision in the DELETE body and leaves duplication revision-free', () => {
    const product = productRecord();
    service.deleteProduct(product.id, 0).subscribe();
    const deletion = http.expectOne(`${environment.apiBaseUrl}/admin/products/${product.id}`);
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toEqual({ expectedRevision: 0 });
    deletion.flush({ success: true, message: 'Deleted', data: null });
    service.duplicateProduct(product.id).subscribe();
    const duplicate = http.expectOne(
      `${environment.apiBaseUrl}/admin/products/${product.id}/duplicate`,
    );
    expect(duplicate.request.body).toBeNull();
    duplicate.flush({ success: true, message: 'Duplicated', data: product });
  });
});
