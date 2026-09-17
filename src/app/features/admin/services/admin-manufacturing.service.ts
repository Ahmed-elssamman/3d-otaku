import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { ApiResponse } from '@core/models/api-response.model';
import { environment } from '../../../../environments/environment';
import { AdminProductRecord } from '../models/admin-product-form.model';
import {
  ApproveManufacturingReviewRequest,
  ManufacturingQuoteResult,
  QuoteManufacturingReviewRequest,
  SaveManufacturingReviewRequest,
  StartManufacturingReviewRequest,
  UnpublishManufacturingProductRequest,
} from '../models/manufacturing-review.model';

@Injectable({ providedIn: 'root' })
export class AdminManufacturingService {
  private http = inject(HttpClient);

  startReview(
    id: string,
    request: StartManufacturingReviewRequest,
  ): Observable<ApiResponse<AdminProductRecord>> {
    return this.http.post<ApiResponse<AdminProductRecord>>(`${this.reviewUrl(id)}/start`, request);
  }

  unpublishProduct(id: string): Observable<ApiResponse<AdminProductRecord>> {
    const request: UnpublishManufacturingProductRequest = { isActive: false };
    return this.http.put<ApiResponse<AdminProductRecord>>(this.productUrl(id), request);
  }

  saveReview(
    id: string,
    request: SaveManufacturingReviewRequest,
  ): Observable<ApiResponse<AdminProductRecord>> {
    return this.http.put<ApiResponse<AdminProductRecord>>(this.reviewUrl(id), request);
  }

  quoteReview(
    id: string,
    request: QuoteManufacturingReviewRequest,
  ): Observable<ApiResponse<ManufacturingQuoteResult>> {
    return this.http.post<ApiResponse<ManufacturingQuoteResult>>(
      `${this.reviewUrl(id)}/quote`,
      request,
    );
  }

  approveReview(
    id: string,
    request: ApproveManufacturingReviewRequest,
  ): Observable<ApiResponse<AdminProductRecord>> {
    return this.http.post<ApiResponse<AdminProductRecord>>(
      `${this.reviewUrl(id)}/approve`,
      request,
    );
  }

  private reviewUrl(id: string): string {
    return `${this.productUrl(id)}/manufacturing-review`;
  }

  private productUrl(id: string): string {
    return `${environment.apiBaseUrl}${API_ENDPOINTS.admin.products.details(encodeURIComponent(id))}`;
  }
}
