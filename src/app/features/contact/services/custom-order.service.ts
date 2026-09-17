import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import {
  CreateCustomOrderRequest,
  CustomOrder,
  CustomOrderQuery,
  CustomOrderStatusRequest,
} from '../models/custom-order.model';
import { CustomOrderStatus } from '../enums/contact.enum';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { RequestSubmissionService } from './request-submission.service';
import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';

@Injectable({ providedIn: 'root' })
export class CustomOrderService {
  private api = inject(ApiService);
  private submissions = inject(RequestSubmissionService);

  pending = computed(() =>
    this.submissions.pendingSubmission<CreateCustomOrderRequest>(
      PublicRequestEndpoint.CustomOrders,
    ),
  );
  hasPending = computed(() => this.submissions.hasPending(PublicRequestEndpoint.CustomOrders));

  replayCustomOrder(): Observable<ApiResponse<CustomOrder>> {
    return this.submissions.replay<CustomOrder, CreateCustomOrderRequest>(
      PublicRequestEndpoint.CustomOrders,
    );
  }

  createCustomOrder(payload: CreateCustomOrderRequest): Observable<ApiResponse<CustomOrder>> {
    return this.submissions.submit<CustomOrder, CreateCustomOrderRequest>(
      PublicRequestEndpoint.CustomOrders,
      payload,
    );
  }

  getAdminCustomOrders(query: CustomOrderQuery = {}): Observable<PaginatedResponse<CustomOrder>> {
    return this.api.getPaginated<CustomOrder, CustomOrderQuery>(
      API_ENDPOINTS.customOrders.adminList,
      query,
    );
  }

  updateCustomOrderStatus(
    id: string,
    status: CustomOrderStatus,
  ): Observable<ApiResponse<CustomOrder>> {
    return this.api.patch<CustomOrder, CustomOrderStatusRequest>(
      API_ENDPOINTS.customOrders.updateStatus(id),
      { status },
    );
  }
}
