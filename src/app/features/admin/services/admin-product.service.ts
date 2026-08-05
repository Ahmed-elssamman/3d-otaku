import { Injectable, computed, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { Product } from '@core/models/product.model';
import { AdminProductQuery } from '../../products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminProductService {
  private api = inject(ApiService);
  private productService = inject(ProductService);

  products = this.productService.adminProducts;
  totalProducts = computed(() => this.products().length);
  featuredProducts = computed(() => this.products().filter(product => product.isFeatured).length);
  categories = computed(() => [...new Set(this.products().map(product => product.category))]);
  averagePrice = computed(() => {
    const products = this.products();
    if (!products.length) return 0;
    const total = products.reduce((sum, product) => sum + product.price, 0);
    return total / products.length;
  });

  getProducts(query?: AdminProductQuery): Observable<PaginatedResponse<Product>> {
    if (environment.useMockApi) {
      let items = [...this.productService.loadFromStorage()];

      if (query?.status && query.status !== 'all') {
        items = items.filter(p => (query.status === 'active' ? p.isActive : !p.isActive));
      }

      if (query?.featured && query.featured !== ('all' as unknown as boolean)) {
        items = items.filter(p => p.isFeatured);
      }

      if (query?.search) {
        const searchLower = query.search.toLowerCase();
        items = items.filter(
          p => p.name.toLowerCase().includes(searchLower) || p.slug.toLowerCase().includes(searchLower)
        );
      }

      if (query?.category && query.category !== 'all') {
        items = items.filter(p => p.category === query.category);
      }

      const page = query?.page || 1;
      const limit = query?.limit || 20;
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const start = (page - 1) * limit;
      const paginatedData = items.slice(start, start + limit);

      return of({
        success: true,
        message: 'Admin products fetched successfully.',
        data: paginatedData,
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    }

    return this.api.getPaginated<Product>(API_ENDPOINTS.admin.products.list, query as Record<string, unknown>).pipe(
      map(res => {
        if (res.data) {
          const normalized = res.data.map(p => ({
            ...p,
            id: p.id || p._id || ''
          }));
          return { ...res, data: normalized };
        }
        return res;
      })
    );
  }

  getProductById(id: string): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      const product = this.productService.getProductById(id);
      return of({
        success: !!product,
        message: product ? 'Admin product fetched successfully.' : 'Product not found.',
        data: product as Product
      });
    }

    return this.api.get<Product>(API_ENDPOINTS.admin.products.details(id)).pipe(
      map(res => {
        if (res.data) {
          return { ...res, data: { ...res.data, id: res.data.id || res.data._id || id } };
        }
        return res;
      })
    );
  }

  createProduct(payload: Product): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      this.productService.createProduct(payload);
      return of({
        success: true,
        message: 'Product created successfully.',
        data: payload
      });
    }

    return this.api.post<Product>(API_ENDPOINTS.admin.products.create, payload);
  }

  updateProduct(id: string, payload: Product): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      this.productService.updateProduct(id, payload);
      return of({
        success: true,
        message: 'Product updated successfully.',
        data: payload
      });
    }

    return this.api.put<Product>(API_ENDPOINTS.admin.products.update(id), payload);
  }

  deleteProduct(id: string): Observable<ApiResponse<{ id: string }>> {
    if (environment.useMockApi) {
      this.productService.deleteProduct(id);
      return of({
        success: true,
        message: 'Product deleted successfully.',
        data: { id }
      });
    }

    return this.api.delete<{ id: string }>(API_ENDPOINTS.admin.products.delete(id));
  }

  duplicateProduct(id: string): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      const duplicate = this.productService.duplicateProduct(id);
      return of({
        success: !!duplicate,
        message: duplicate ? 'Product duplicated successfully.' : 'Original product not found.',
        data: duplicate as Product
      });
    }

    return this.api.post<Product>(API_ENDPOINTS.admin.products.duplicate(id));
  }

  toggleActive(id: string, isActive?: boolean): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      this.productService.toggleActive(id);
      const updated = this.productService.getProductById(id);
      return of({
        success: true,
        message: 'Product status updated successfully.',
        data: updated as Product
      });
    }

    return this.api.patch<Product>(API_ENDPOINTS.admin.products.status(id), { isActive });
  }

  toggleFeatured(id: string, isFeatured?: boolean): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      this.productService.toggleFeatured(id);
      const updated = this.productService.getProductById(id);
      return of({
        success: true,
        message: 'Product featured status updated successfully.',
        data: updated as Product
      });
    }

    return this.api.patch<Product>(API_ENDPOINTS.admin.products.featured(id), { isFeatured });
  }

  loadFromStorage(): Product[] {
    return this.productService.loadFromStorage();
  }

  saveToStorage(): void {
    this.productService.saveToStorage();
  }
}
