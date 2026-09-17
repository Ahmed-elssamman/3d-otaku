import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductQuery } from '../../features/products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { hasValidDiscount } from '../utils/product-display.util';
import { normalizeConfigurationFingerprint } from '../utils/product-configuration.util';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = inject(ApiService);
  private productsSignal = signal<Product[]>([]);
  allProducts = computed(() => this.productsSignal());

  getProducts(query?: ProductQuery): Observable<PaginatedResponse<Product>> {
    return this.api
      .getPaginated<Product, ProductQuery>(API_ENDPOINTS.products.list, query ?? null)
      .pipe(
        map((response) => ({ ...response, data: this.normalizePublicProducts(response.data) })),
        tap((response) => this.productsSignal.set(response.data)),
      );
  }

  getFeaturedProducts(limit: number = 6): Observable<ApiResponse<Product[]>> {
    return this.api.get<Product[]>(API_ENDPOINTS.products.featured, { limit }).pipe(
      map((response) => ({ ...response, data: this.normalizePublicProducts(response.data) })),
      tap((response) => this.productsSignal.set(response.data)),
    );
  }

  getProductByIdOrSlug(idOrSlug: string): Observable<ApiResponse<Product>> {
    return this.api
      .get<Product>(API_ENDPOINTS.products.details(idOrSlug))
      .pipe(
        map((response) =>
          response.data ? { ...response, data: this.normalizeProduct(response.data) } : response,
        ),
      );
  }

  getProductBySlug(slug: string): Observable<ApiResponse<Product>> {
    return this.getProductByIdOrSlug(slug);
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.api.get<Category[]>(API_ENDPOINTS.products.categories);
  }

  private normalizePublicProducts(products: Product[]): Product[] {
    return products
      .filter((product) => product.isActive !== false && !product.deletedAt)
      .map((product) => this.normalizeProduct(product));
  }

  private normalizeProduct(product: Product): Product {
    return {
      ...product,
      id: product.id || product._id || '',
      image: product.image?.trim() ?? '',
      gallery: Array.isArray(product.gallery)
        ? product.gallery.filter((image) => Boolean(image?.trim()))
        : [],
      modelUrl: product.modelUrl?.trim() || null,
      configurationFingerprint: normalizeConfigurationFingerprint(
        product.configurationFingerprint ?? null,
      ),
      posterImage: product.posterImage?.trim() || null,
      discountPrice: hasValidDiscount(product.price, product.discountPrice ?? null)
        ? product.discountPrice
        : null,
    };
  }
}
