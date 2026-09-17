import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Product } from '@core/models/product.model';
import { AdminProductQuery } from '../../products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import {
  AdminProductPayload,
  AdminProductRecord,
  AdminProductRevisionRequest,
  AdminProductUpdateRequest,
} from '../models/admin-product-form.model';
import { AdminProductCategory } from '../models/admin-product-category.model';

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

  updateProduct(
    id: string,
    payload: Product,
    expectedRevision: number,
  ): Observable<ApiResponse<AdminProductRecord>> {
    const request: AdminProductUpdateRequest = { ...this.toApiPayload(payload), expectedRevision };
    return this.api
      .put<AdminProductRecord, AdminProductUpdateRequest>(
        API_ENDPOINTS.admin.products.update(id),
        request,
      )
      .pipe(map((response) => ({ ...response, data: this.normalizeProduct(response.data) })));
  }

  deleteProduct(id: string, expectedRevision: number): Observable<ApiResponse<null>> {
    const request: AdminProductRevisionRequest = { expectedRevision };
    return this.api.delete<null, AdminProductRevisionRequest>(
      API_ENDPOINTS.admin.products.delete(id),
      request,
    );
  }

  duplicateProduct(id: string): Observable<ApiResponse<AdminProductRecord>> {
    return this.api.post<AdminProductRecord>(API_ENDPOINTS.admin.products.duplicate(id));
  }

  private normalizeProduct(product: AdminProductRecord): AdminProductRecord {
    return {
      ...product,
      id: product.id || product._id || '',
      revision:
        Number.isSafeInteger(product.revision) && product.revision !== null && product.revision >= 0
          ? product.revision
          : null,
    };
  }

  private toApiPayload(product: Product): AdminProductPayload {
    const {
      id,
      _id,
      createdAt,
      updatedAt,
      deletedAt,
      imageVariants,
      configurationFingerprint,
      revision,
      requiresManufacturingReview,
      manufacturingReview,
      ...editableFields
    } = product as AdminProductRecord;
    return editableFields;
  }
}
