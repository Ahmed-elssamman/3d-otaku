import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { CreateCustomOrderRequest, CustomOrder } from '../models/custom-order.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomOrderService {
  private api = inject(ApiService);

  createCustomOrder(payload: CreateCustomOrderRequest): Observable<ApiResponse<CustomOrder>> {
    if (environment.useMockApi) {
      const mockOrder: CustomOrder = {
        ...payload,
        id: `order_${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      return of({
        success: true,
        message: 'Custom order request submitted successfully.',
        data: mockOrder
      });
    }

    return this.api.post<CustomOrder>(API_ENDPOINTS.customOrders.create, payload);
  }

  getAdminCustomOrders(query?: { page?: number; limit?: number; status?: string; search?: string }): Observable<PaginatedResponse<CustomOrder>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Custom orders fetched successfully.',
        data: [],
        meta: {
          page: query?.page || 1,
          limit: query?.limit || 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    }

    return this.api.getPaginated<CustomOrder, { page?: number; limit?: number; status?: string; search?: string }>(API_ENDPOINTS.customOrders.adminList, query ?? null);
  }

  updateCustomOrderStatus(id: string, status: string): Observable<ApiResponse<CustomOrder>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Custom order status updated successfully.',
        data: {
          id,
          status,
          fullName: 'Mock User',
          phone: '',
          whatsappNumber: '',
          email: '',
          productIdea: '',
          description: '',
          createdAt: new Date().toISOString()
        }
      });
    }

    return this.api.patch<CustomOrder>(API_ENDPOINTS.customOrders.updateStatus(id), { status });
  }
}
