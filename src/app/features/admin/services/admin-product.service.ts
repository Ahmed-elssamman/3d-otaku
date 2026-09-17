import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Product } from '@core/models/product.model';
import { AdminProductQuery } from '../../products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { AdminProductRecord } from '../models/admin-product-form.model';
import { AdminProductCategory } from '../models/admin-product-category.model';

interface AdminProductPayload extends Omit<
  Product,
  'id' | '_id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'imageVariants'
> {}
interface DeletedProductResponse {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private api = inject(ApiService);

  getCategories(): Observable<ApiResponse<AdminProductCategory[]>> {
    return this.api.get<AdminProductCategory[]>(API_ENDPOINTS.admin.products.categories);
  }

  getProducts(query?: AdminProductQuery): Observable<PaginatedResponse<AdminProductRecord>> {
    return this.api
      .getPaginated<AdminProductRecord, AdminProductQuery>(
        API_ENDPOINTS.admin.products.list,
        query ?? null,
      )
      .pipe(
        map((response) => ({
          ...response,
          data: response.data.map((product) => this.normalizeProduct(product)),
        })),
      );
  }

  getProductById(id: string): Observable<ApiResponse<AdminProductRecord>> {
    return this.api
      .get<AdminProductRecord>(API_ENDPOINTS.admin.products.details(id))
      .pipe(map((response) => ({ ...response, data: this.normalizeProduct(response.data) })));
  }

  createProduct(payload: Product): Observable<ApiResponse<AdminProductRecord>> {
    return this.api
      .post<AdminProductRecord>(API_ENDPOINTS.admin.products.create, this.toApiPayload(payload))
      .pipe(map((response) => ({ ...response, data: this.normalizeProduct(response.data) })));
  }

  updateProduct(id: string, payload: Product): Observable<ApiResponse<AdminProductRecord>> {
    return this.api
      .put<AdminProductRecord>(API_ENDPOINTS.admin.products.update(id), this.toApiPayload(payload))
      .pipe(map((response) => ({ ...response, data: this.normalizeProduct(response.data) })));
  }

  deleteProduct(id: string): Observable<ApiResponse<DeletedProductResponse>> {
    return this.api.delete<DeletedProductResponse>(API_ENDPOINTS.admin.products.delete(id));
  }

  duplicateProduct(id: string): Observable<ApiResponse<AdminProductRecord>> {
    return this.api.post<AdminProductRecord>(API_ENDPOINTS.admin.products.duplicate(id));
  }

  private normalizeProduct(product: AdminProductRecord): AdminProductRecord {
    return { ...product, id: product.id || product._id || '' };
  }

  private toApiPayload(product: Product): AdminProductPayload {
    const { id, _id, createdAt, updatedAt, deletedAt, imageVariants, ...editableFields } = product;
    return editableFields;
  }
}
