import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductCategory } from '../enums/product-category.enum';
import { ProductMaterial } from '../enums/product-material.enum';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps an active API product visible when image and model media are missing', () => {
    const activeProduct = createProduct({ image: '', modelUrl: null });
    service.getProducts().subscribe(response => {
      expect(response.data).toHaveLength(1);
      expect(response.data[0]).toMatchObject({ id: activeProduct.id, image: '', modelUrl: null });
    });
    http.expectOne(`${environment.apiBaseUrl}/products`).flush({
      success: true,
      message: 'Products retrieved.',
      data: [activeProduct],
      meta: { page: 1, limit: 12, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
    });
  });

  it('does not expose inactive or deleted products returned defensively by the public endpoint', () => {
    const inactiveProduct = createProduct({ id: 'inactive', isActive: false });
    const deletedProduct = createProduct({ id: 'deleted', deletedAt: '2026-08-11T00:00:00Z' });
    service.getProducts().subscribe(response => expect(response.data).toEqual([]));
    http.expectOne(`${environment.apiBaseUrl}/products`).flush({
      success: true,
      message: 'Products retrieved.',
      data: [inactiveProduct, deletedProduct],
      meta: { page: 1, limit: 12, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
    });
  });
});

function createProduct(overrides: Partial<Product>): Product {
  return {
    id: 'product-1',
    slug: 'product-1',
    name: 'Product 1',
    category: ProductCategory.COLLECTIBLES,
    shortDescription: 'Short description',
    description: 'Description',
    price: 10,
    discountPrice: null,
    image: '',
    gallery: [],
    modelUrl: null,
    tags: [],
    material: ProductMaterial.RESIN,
    finish: 'Smooth',
    color: 'Green',
    size: '12cm',
    weight: '120g',
    printTime: '6 hours',
    isFeatured: false,
    isActive: true,
    safetyNote: '',
    createdAt: '2026-08-11T00:00:00Z',
    updatedAt: '2026-08-11T00:00:00Z',
    ...overrides
  };
}
