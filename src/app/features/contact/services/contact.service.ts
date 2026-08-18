import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { ContactMessageRequest, ContactMessageResponse, ContactMessageItem } from '../models/contact-message.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private api = inject(ApiService);

  sendMessage(payload: ContactMessageRequest): Observable<ApiResponse<ContactMessageResponse>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Message sent successfully.',
        data: {
          id: `msg_${Date.now()}`,
          createdAt: new Date().toISOString()
        }
      });
    }

    return this.api.post<ContactMessageResponse>(API_ENDPOINTS.contactMessages.create, payload);
  }

  getAdminContactMessages(query?: { page?: number; limit?: number; status?: string; search?: string }): Observable<PaginatedResponse<ContactMessageItem>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Contact messages fetched successfully.',
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

    return this.api.getPaginated<ContactMessageItem, { page?: number; limit?: number; status?: string; search?: string }>(API_ENDPOINTS.contactMessages.adminList, query ?? null);
  }

  markMessageRead(id: string): Observable<ApiResponse<ContactMessageItem>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Message marked as read.',
        data: {
          id,
          fullName: 'Mock contact',
          email: '',
          phone: '',
          subject: '',
          message: '',
          status: 'read',
          createdAt: new Date().toISOString()
        }
      });
    }

    return this.api.patch<ContactMessageItem>(API_ENDPOINTS.contactMessages.markRead(id));
  }
}
