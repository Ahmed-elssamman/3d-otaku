import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import {
  ContactMessageRequest,
  ContactMessageResponse,
  ContactMessageItem,
  ContactMessageQuery,
} from '../models/contact-message.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { RequestSubmissionService } from './request-submission.service';
import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private api = inject(ApiService);
  private submissions = inject(RequestSubmissionService);

  pending = computed(() =>
    this.submissions.pendingSubmission<ContactMessageRequest>(
      PublicRequestEndpoint.ContactMessages,
    ),
  );
  hasPending = computed(() => this.submissions.hasPending(PublicRequestEndpoint.ContactMessages));

  replayMessage(): Observable<ApiResponse<ContactMessageResponse>> {
    return this.submissions.replay<ContactMessageResponse, ContactMessageRequest>(
      PublicRequestEndpoint.ContactMessages,
    );
  }

  sendMessage(payload: ContactMessageRequest): Observable<ApiResponse<ContactMessageResponse>> {
    return this.submissions.submit<ContactMessageResponse, ContactMessageRequest>(
      PublicRequestEndpoint.ContactMessages,
      payload,
    );
  }

  getAdminContactMessages(
    query: ContactMessageQuery = {},
  ): Observable<PaginatedResponse<ContactMessageItem>> {
    return this.api.getPaginated<ContactMessageItem, ContactMessageQuery>(
      API_ENDPOINTS.contactMessages.adminList,
      query,
    );
  }

  markMessageRead(id: string): Observable<ApiResponse<ContactMessageItem>> {
    return this.api.patch<ContactMessageItem>(API_ENDPOINTS.contactMessages.markRead(id));
  }
}
