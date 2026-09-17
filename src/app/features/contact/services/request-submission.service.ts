import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, catchError, defer, map, tap, throwError } from 'rxjs';
import { ApiErrorResponse, ApiResponse } from '@core/models/api-response.model';
import { environment } from '../../../../environments/environment';
import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';
import { PublicRequestError } from '../enums/public-request-error.enum';
import {
  PendingPublicRequest,
  PublicRequestReceipt,
  StoredPublicRequest,
} from '../models/pending-public-request.model';
import {
  PUBLIC_REQUEST_ENDPOINTS,
  PUBLIC_REQUEST_ERRORS,
  PUBLIC_REQUEST_STORAGE_PREFIX,
} from './request-submission.data';

@Injectable({ providedIn: 'root' })
export class RequestSubmissionService {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private unavailable = signal<PublicRequestEndpoint[]>([]);
  private pending = signal<StoredPublicRequest[]>(this.loadPending());
  private sequences = new Map<PublicRequestEndpoint, number>();

  pendingSubmission<TBody extends object>(
    endpoint: PublicRequestEndpoint,
  ): PendingPublicRequest<TBody> | null {
    const submission = this.findPending(endpoint);
    if (!submission) return null;
    return { key: submission.key, payload: JSON.parse(submission.payload) as TBody };
  }

  hasPending(endpoint: PublicRequestEndpoint): boolean {
    return this.findPending(endpoint) !== null || this.unavailable().includes(endpoint);
  }

  submit<T extends PublicRequestReceipt, TBody extends object>(
    endpoint: PublicRequestEndpoint,
    payload: TBody,
  ): Observable<ApiResponse<T>> {
    const serialized = JSON.stringify(payload);
    return defer(() => {
      if (this.unavailable().includes(endpoint)) {
        return throwError(() => this.failure(endpoint, PublicRequestError.Recovery));
      }
      const previous = this.findPending(endpoint);
      if (previous && previous.payload !== serialized) {
        return throwError(() => this.failure(endpoint, PublicRequestError.Details));
      }
      const submission = previous ?? { endpoint, key: crypto.randomUUID(), payload: serialized };
      if (!previous) this.save(submission);
      return this.send<T, TBody>(submission, previous === null);
    });
  }

  replay<T extends PublicRequestReceipt, TBody extends object>(
    endpoint: PublicRequestEndpoint,
  ): Observable<ApiResponse<T>> {
    return defer(() => {
      const submission = this.findPending(endpoint);
      if (!submission) {
        return throwError(() => this.failure(endpoint, PublicRequestError.Recovery));
      }
      return this.send<T, TBody>(submission, false);
    });
  }

  private send<T extends PublicRequestReceipt, TBody extends object>(
    submission: StoredPublicRequest,
    canAcceptDefiniteRejection: boolean,
  ): Observable<ApiResponse<T>> {
    const { endpoint } = submission;
    const sequence = (this.sequences.get(endpoint) ?? 0) + 1;
    this.sequences.set(endpoint, sequence);
    const payload = JSON.parse(submission.payload) as TBody;
    return this.http
      .post<ApiResponse<T>>(`${environment.apiBaseUrl}${endpoint}`, payload, {
        headers: new HttpHeaders({ 'Idempotency-Key': submission.key }),
      })
      .pipe(
        map((response) => {
          const receipt = response?.data;
          const reference =
            endpoint === PublicRequestEndpoint.CustomOrders
              ? receipt?.requestNumber
              : receipt?.messageNumber;
          if (
            response?.success !== true ||
            typeof receipt?.id !== 'string' ||
            !receipt.id.trim() ||
            typeof reference !== 'string' ||
            !reference.trim()
          ) {
            throw this.failure(endpoint, PublicRequestError.Receipt, 503);
          }
          return response;
        }),
        tap(() => {
          if (this.isCurrent(submission)) this.clear(submission);
        }),
        catchError((error: ApiErrorResponse | HttpErrorResponse) => {
          const status = error instanceof HttpErrorResponse ? error.status : error.statusCode;
          if (
            status === 422 &&
            canAcceptDefiniteRejection &&
            this.sequences.get(endpoint) === sequence &&
            this.isCurrent(submission)
          ) {
            this.clear(submission);
          }
          return throwError(() => error);
        }),
      );
  }

  private findPending(endpoint: PublicRequestEndpoint): StoredPublicRequest | null {
    return this.pending().find((submission) => submission.endpoint === endpoint) ?? null;
  }

  private isCurrent(submission: StoredPublicRequest): boolean {
    const current = this.findPending(submission.endpoint);
    return current?.key === submission.key && current?.payload === submission.payload;
  }

  private loadPending(): StoredPublicRequest[] {
    const submissions: StoredPublicRequest[] = [];
    if (!this.isBrowser) return submissions;
    for (const endpoint of PUBLIC_REQUEST_ENDPOINTS) {
      let value = '';
      try {
        value = sessionStorage.getItem(`${PUBLIC_REQUEST_STORAGE_PREFIX}${endpoint}`) || '';
        if (!value) continue;
        const parsed = JSON.parse(value) as Partial<StoredPublicRequest> | null;
        if (
          !parsed ||
          typeof parsed.key !== 'string' ||
          !/^[A-Za-z0-9-]{16,128}$/.test(parsed.key) ||
          typeof parsed.payload !== 'string'
        ) {
          this.unavailable.update((endpoints) => [...endpoints, endpoint]);
          continue;
        }
        const body = JSON.parse(parsed.payload) as object | null;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          this.unavailable.update((endpoints) => [...endpoints, endpoint]);
          continue;
        }
        submissions.push({ endpoint, key: parsed.key, payload: parsed.payload });
      } catch {
        this.unavailable.update((endpoints) => [...endpoints, endpoint]);
      }
    }
    return submissions;
  }

  private save(submission: StoredPublicRequest): void {
    try {
      if (!this.isBrowser) throw this.failure(submission.endpoint, PublicRequestError.Storage, 503);
      sessionStorage.setItem(
        `${PUBLIC_REQUEST_STORAGE_PREFIX}${submission.endpoint}`,
        JSON.stringify({ key: submission.key, payload: submission.payload }),
      );
    } catch {
      throw this.failure(submission.endpoint, PublicRequestError.Storage, 503);
    }
    this.pending.update((pending) => [
      ...pending.filter((item) => item.endpoint !== submission.endpoint),
      submission,
    ]);
  }

  private clear(submission: StoredPublicRequest): void {
    this.pending.update((pending) =>
      pending.filter((item) => item.endpoint !== submission.endpoint),
    );
    try {
      sessionStorage.removeItem(`${PUBLIC_REQUEST_STORAGE_PREFIX}${submission.endpoint}`);
    } catch {
      return;
    }
  }

  private failure(
    endpoint: PublicRequestEndpoint,
    field: PublicRequestError,
    statusCode = 409,
  ): ApiErrorResponse {
    const message = PUBLIC_REQUEST_ERRORS[field];
    return {
      success: false,
      message,
      errors: { [field]: [message] },
      statusCode,
      timestamp: new Date().toISOString(),
      path: `${environment.apiBaseUrl}${endpoint}`,
    };
  }
}
