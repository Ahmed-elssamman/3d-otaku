import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';
import { Observable, catchError, defer, map, of, tap, throwError } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { ApiErrorResponse, ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import {
  CreateOrderPayload,
  Order,
  OrderApiRecord,
  PendingOrderSubmission,
  ResolvedOrderSubmission,
  CheckoutQuote,
  CheckoutQuoteRequest,
} from '../models/order.model';
import {
  ORDER_STORAGE_KEYS,
  ORDER_TRACKING_RESPONSE_MESSAGE,
  ORDER_PENDING_KEY_PATTERN,
  ORDER_PENDING_STATES,
  ORDER_STORAGE_ERROR_FIELD,
  ORDER_STORAGE_MESSAGES,
} from '../constants/order.constants';
import { OrderStorageIssue } from '../enums/order-storage-issue.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { PendingOrderState } from '../enums/pending-order-state.enum';
import { environment } from '../../../environments/environment';
import { normalizeOrderPaymentSummary } from '../utils/order-payment-summary.util';
import { normalizeCheckoutQuote } from '../utils/checkout-quote.util';
import {
  normalizeConfigurationFingerprint,
  normalizeProductConfiguration,
} from '../utils/product-configuration.util';
import {
  CHECKOUT_TERMINAL_CONFLICT_FIELDS,
  CHECKOUT_NOT_RECORDED_FIELD,
} from '../utils/checkout-quote.data';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private storageIssueSignal = signal(OrderStorageIssue.None);
  private resolvedSubmission: ResolvedOrderSubmission | null = null;
  private ordersSignal = signal<Order[]>([]);
  private receiptSignal = signal<Order | null>(this.loadReceipt());
  private pendingSubmission = signal<PendingOrderSubmission | null>(this.loadPendingSubmission());
  private submissionSequence = 0;
  private receiptRevision = 0;
  private trackingSequence = 0;

  orders = computed(() => this.ordersSignal());
  receipt = this.receiptSignal.asReadonly();
  storageIssue = this.storageIssueSignal.asReadonly();
  storageMessage = computed(() => ORDER_STORAGE_MESSAGES[this.storageIssue()]);
  hasPendingSubmission = computed(
    () =>
      this.pendingSubmission() !== null || this.storageIssue() === OrderStorageIssue.Unavailable,
  );
  canRetryPendingSubmission = computed(
    () =>
      this.storageIssue() === OrderStorageIssue.None &&
      this.pendingSubmission()?.state === PendingOrderState.UNCERTAIN,
  );
  requiresFreshQuoteReview = computed(
    () =>
      this.storageIssue() === OrderStorageIssue.None &&
      this.pendingSubmission()?.state === PendingOrderState.NOT_RECORDED,
  );
  pendingRequest = computed(() => {
    const pending = this.pendingSubmission();
    return pending ? this.parsePayload(pending.payload) : null;
  });

  quoteOrder(request: CheckoutQuoteRequest): Observable<ApiResponse<CheckoutQuote>> {
    return defer(() => {
      if (!this.synchronizePendingStorage()) return throwError(() => this.storageError());
      if (this.canRetryPendingSubmission())
        return throwError(() => this.submissionError('checkoutDetails'));
      return this.api
        .post<CheckoutQuote, CheckoutQuoteRequest>(API_ENDPOINTS.orders.quote, request)
        .pipe(
          map((response) => {
            const quote = normalizeCheckoutQuote(response.data, request);
            if (!quote) throw this.submissionError('checkoutQuoteInvalid');
            return { ...response, data: quote };
          }),
        );
    });
  }

  createOrder(payload: CreateOrderPayload): Observable<ApiResponse<Order>> {
    const normalizedPayload: CreateOrderPayload = {
      ...payload,
      currency: environment.defaultCurrency,
    };

    if (environment.useMockApi) {
      const now = new Date().toISOString();
      const mockOrder: Order = {
        id: `mock-${Date.now()}`,
        orderNumber: `MOCK-${Date.now()}`,
        items: [],
        customer: normalizedPayload.customer,
        subtotal: normalizedPayload.subtotal ?? 0,
        deliveryFee: normalizedPayload.deliveryFee ?? 0,
        discount: 0,
        total: normalizedPayload.totalAmount ?? normalizedPayload.subtotal ?? 0,
        currency: environment.defaultCurrency,
        status: OrderStatus.PENDING,
        paymentMethod: 'mock',
        estimatedDeliveryDays: normalizedPayload.deliveryDays,
        createdAt: now,
        updatedAt: now,
      };
      return of({ success: true, message: 'Mock order created.', data: mockOrder });
    }

    return defer(() => {
      if (!this.synchronizePendingStorage()) return throwError(() => this.storageError());
      const pending = this.pendingSubmission();
      const serializedPayload = JSON.stringify(normalizedPayload);
      if (pending?.state === PendingOrderState.UNCERTAIN && pending.payload !== serializedPayload) {
        return throwError(() => this.submissionError('checkoutDetails'));
      }
      const submission: PendingOrderSubmission = {
        key: pending?.state === PendingOrderState.UNCERTAIN ? pending.key : crypto.randomUUID(),
        payload: serializedPayload,
        state: PendingOrderState.UNCERTAIN,
      };
      if (
        pending?.state !== PendingOrderState.UNCERTAIN &&
        !this.savePendingSubmission(submission)
      ) {
        return throwError(() => this.storageError());
      }
      return this.sendSubmission(
        normalizedPayload,
        submission,
        pending?.state !== PendingOrderState.UNCERTAIN,
      );
    });
  }

  retryPendingOrder(): Observable<ApiResponse<Order>> {
    return defer(() => {
      if (!this.synchronizePendingStorage()) return throwError(() => this.storageError());
      const pending = this.pendingSubmission();
      const payload = this.pendingRequest();
      if (!pending || !payload || pending.state !== PendingOrderState.UNCERTAIN) {
        return throwError(() => this.submissionError('checkoutRecovery'));
      }
      return this.sendSubmission(payload, pending, false);
    });
  }

  recheckPendingStorage(): void {
    if (this.resolvedSubmission) {
      this.finishResolvedSubmission();
    } else {
      this.synchronizePendingStorage();
    }
  }

  requestsMatch(first: CreateOrderPayload, second: CreateOrderPayload): boolean {
    return (
      JSON.stringify({ ...first, currency: environment.defaultCurrency }) ===
      JSON.stringify({ ...second, currency: environment.defaultCurrency })
    );
  }

  private sendSubmission(
    payload: CreateOrderPayload,
    submission: PendingOrderSubmission,
    canAcceptDefiniteRejection: boolean,
  ): Observable<ApiResponse<Order>> {
    const sequence = ++this.submissionSequence;
    const headers = new HttpHeaders({ 'Idempotency-Key': submission.key });
    return this.http
      .post<ApiResponse<OrderApiRecord>>(
        `${environment.apiBaseUrl}${API_ENDPOINTS.orders.create}`,
        payload,
        { headers },
      )
      .pipe(
        map((response) => ({ ...response, data: this.normalizeOrder(response.data) })),
        tap((response) => {
          if (
            this.pendingSubmission()?.key !== submission.key ||
            this.pendingSubmission()?.payload !== submission.payload
          )
            return;
          this.ordersSignal.update((orders) => [
            response.data,
            ...orders.filter((order) => order.id !== response.data.id),
          ]);
          this.receiptRevision++;
          this.receiptSignal.set(response.data);
          this.resolvedSubmission = { submission, order: response.data };
          this.finishResolvedSubmission();
        }),
        catchError((error: ApiErrorResponse | HttpErrorResponse) => {
          const status = error instanceof HttpErrorResponse ? error.status : error.statusCode;
          const fields: Record<string, string[]> =
            error instanceof HttpErrorResponse ? (error.error?.errors ?? {}) : (error.errors ?? {});
          const notRecorded = fields[CHECKOUT_NOT_RECORDED_FIELD];
          const terminalRejection =
            status === 409 &&
            Array.isArray(notRecorded) &&
            notRecorded.length > 0 &&
            notRecorded.every((message) => typeof message === 'string' && !!message.trim()) &&
            Object.values(fields).every(
              (messages) =>
                Array.isArray(messages) &&
                messages.length > 0 &&
                messages.every((message) => typeof message === 'string' && !!message.trim()),
            ) &&
            !CHECKOUT_TERMINAL_CONFLICT_FIELDS.some((field) => Object.hasOwn(fields, field));
          if (
            terminalRejection &&
            sequence === this.submissionSequence &&
            this.pendingSubmission()?.key === submission.key &&
            this.pendingSubmission()?.payload === submission.payload
          ) {
            this.savePendingSubmission(
              { ...submission, state: PendingOrderState.NOT_RECORDED },
              OrderStorageIssue.Unavailable,
            );
            return throwError(() => error);
          }
          const quoteRejected =
            status === 409 &&
            Array.isArray(fields['checkoutQuote']) &&
            fields['checkoutQuote'].some(
              (message) => typeof message === 'string' && !!message.trim(),
            );
          if (
            (status === 422 || quoteRejected) &&
            !Object.hasOwn(fields, CHECKOUT_NOT_RECORDED_FIELD) &&
            canAcceptDefiniteRejection &&
            sequence === this.submissionSequence &&
            this.pendingSubmission()?.key === submission.key
          ) {
            this.savePendingSubmission(
              {
                ...submission,
                state: PendingOrderState.VALIDATION_REJECTED,
              },
              OrderStorageIssue.Unavailable,
            );
          }
          return throwError(() => error);
        }),
      );
  }

  getOrders(page: number = 1, limit: number = 10): Observable<PaginatedResponse<Order>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Mock orders loaded.',
        data: this.ordersSignal(),
        meta: {
          page,
          limit,
          totalItems: this.ordersSignal().length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    return this.api.getPaginated<OrderApiRecord>(API_ENDPOINTS.orders.list, { page, limit }).pipe(
      map((response) => ({
        ...response,
        data: response.data.map((order) => this.normalizeOrder(order)),
      })),
      tap((response) => this.ordersSignal.set(response.data)),
    );
  }

  trackOrder(orderNumber: string, trackingToken: string = ''): Observable<ApiResponse<Order>> {
    return defer(() => {
      const receiptRevision = this.receiptRevision;
      const trackingSequence = ++this.trackingSequence;
      const headers = trackingToken
        ? new HttpHeaders({ 'X-Order-Token': trackingToken })
        : new HttpHeaders();
      return this.http
        .get<ApiResponse<OrderApiRecord>>(
          `${environment.apiBaseUrl}${API_ENDPOINTS.orders.track(encodeURIComponent(orderNumber))}`,
          {
            headers,
            context: new HttpContext().set(GUEST_ORDER_TRACKING, trackingToken.length > 0),
            transferCache: false,
          },
        )
        .pipe(
          map((response) => {
            if (
              response.success !== true ||
              !response.data ||
              response.data.orderNumber !== orderNumber
            ) {
              const error: ApiErrorResponse = {
                success: false,
                statusCode: 502,
                message: ORDER_TRACKING_RESPONSE_MESSAGE,
                timestamp: new Date().toISOString(),
                path: API_ENDPOINTS.orders.track(encodeURIComponent(orderNumber)),
              };
              throw error;
            }
            return {
              ...response,
              data: this.normalizeOrder({
                ...response.data,
                trackingToken: response.data.trackingToken || trackingToken,
              }),
            };
          }),
          tap((response) => {
            if (
              receiptRevision === this.receiptRevision &&
              trackingSequence === this.trackingSequence
            ) {
              this.saveReceipt(response.data);
            }
          }),
        );
    });
  }

  clearReceipt(): void {
    this.receiptRevision++;
    this.receiptSignal.set(null);
    this.removeStoredValue(ORDER_STORAGE_KEYS.receipt);
  }

  private saveReceipt(order: Order): void {
    this.receiptRevision++;
    this.receiptSignal.set(order);
    this.saveStoredValue(ORDER_STORAGE_KEYS.receipt, JSON.stringify(order));
  }

  private savePendingSubmission(
    submission: PendingOrderSubmission,
    failure = OrderStorageIssue.WriteFailed,
  ): boolean {
    let written = false;
    try {
      if (!this.isBrowser) throw this.storageError();
      const serialized = JSON.stringify(submission);
      sessionStorage.setItem(ORDER_STORAGE_KEYS.pendingSubmission, serialized);
      written = true;
      if (sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission) !== serialized) {
        throw this.storageError();
      }
      this.pendingSubmission.set(submission);
      this.storageIssueSignal.set(OrderStorageIssue.None);
      return true;
    } catch {
      // Keep the identity if writing succeeded but its read-back could not be verified.
      if (written) this.pendingSubmission.set(submission);
      this.storageIssueSignal.set(written ? OrderStorageIssue.Unavailable : failure);
      return false;
    }
  }

  private synchronizePendingStorage(): boolean {
    if (this.resolvedSubmission) {
      this.storageIssueSignal.set(OrderStorageIssue.CleanupRequired);
      return false;
    }
    try {
      const stored = this.readPendingSubmission();
      const current = this.pendingSubmission();
      if (
        current &&
        (!stored || current.key !== stored.key || current.payload !== stored.payload)
      ) {
        throw this.storageError();
      }
      this.pendingSubmission.set(stored);
      this.storageIssueSignal.set(OrderStorageIssue.None);
      return true;
    } catch {
      this.storageIssueSignal.set(OrderStorageIssue.Unavailable);
      return false;
    }
  }

  private finishResolvedSubmission(): void {
    const resolved = this.resolvedSubmission;
    if (!resolved) return;
    try {
      const stored = this.readPendingSubmission();
      if (
        stored &&
        (stored.key !== resolved.submission.key || stored.payload !== resolved.submission.payload)
      ) {
        throw this.storageError();
      }
      const currentReceipt = this.receiptSignal();
      const receipt =
        currentReceipt?.id === resolved.order.id &&
        currentReceipt.orderNumber === resolved.order.orderNumber
          ? currentReceipt
          : resolved.order;
      if (!this.saveStoredValue(ORDER_STORAGE_KEYS.receipt, JSON.stringify(receipt))) {
        throw this.storageError();
      }
      sessionStorage.removeItem(ORDER_STORAGE_KEYS.pendingSubmission);
      if (sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission) !== null) {
        throw this.storageError();
      }
      this.pendingSubmission.set(null);
      this.resolvedSubmission = null;
      this.storageIssueSignal.set(OrderStorageIssue.None);
    } catch {
      this.storageIssueSignal.set(OrderStorageIssue.CleanupRequired);
    }
  }

  private storageError(): ApiErrorResponse {
    const message =
      ORDER_STORAGE_MESSAGES[this.storageIssueSignal()] ||
      ORDER_STORAGE_MESSAGES[OrderStorageIssue.Unavailable];
    return {
      success: false,
      statusCode: 503,
      message,
      errors: { [ORDER_STORAGE_ERROR_FIELD]: [message] },
      timestamp: new Date().toISOString(),
      path: API_ENDPOINTS.orders.create,
    };
  }

  private submissionError(field: string): ApiErrorResponse {
    const message = 'Retry the saved checkout attempt before submitting different details.';
    return {
      success: false,
      statusCode: 409,
      message,
      errors: { [field]: [message] },
      timestamp: new Date().toISOString(),
      path: API_ENDPOINTS.orders.create,
    };
  }

  private parsePayload(serialized: string): CreateOrderPayload | null {
    try {
      const payload = JSON.parse(serialized) as Partial<CreateOrderPayload>;
      if (
        !payload ||
        !Array.isArray(payload.items) ||
        payload.items.length === 0 ||
        !payload.items.every(
          (item) =>
            item &&
            typeof item.productId === 'string' &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0,
        ) ||
        !payload.customer ||
        typeof payload.customer.fullName !== 'string' ||
        typeof payload.customer.phone !== 'string' ||
        typeof payload.customer.address !== 'string'
      )
        return null;
      return payload as CreateOrderPayload;
    } catch {
      return null;
    }
  }

  private loadReceipt(): Order | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt);
      if (!raw) return null;
      const receipt = JSON.parse(raw) as Order;
      return receipt &&
        typeof receipt.orderNumber === 'string' &&
        Array.isArray(receipt.items) &&
        Number.isFinite(receipt.total)
        ? this.normalizeOrder(receipt)
        : null;
    } catch {
      return null;
    }
  }

  private loadPendingSubmission(): PendingOrderSubmission | null {
    if (!this.isBrowser) return null;
    try {
      return this.readPendingSubmission();
    } catch {
      this.storageIssueSignal.set(OrderStorageIssue.Unavailable);
      return null;
    }
  }

  private readPendingSubmission(): PendingOrderSubmission | null {
    if (!this.isBrowser) throw this.storageError();
    const raw = sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission);
    if (!raw) return null;
    const submission = JSON.parse(raw) as Partial<PendingOrderSubmission> | null;
    if (
      !submission ||
      Array.isArray(submission) ||
      typeof submission.key !== 'string' ||
      !ORDER_PENDING_KEY_PATTERN.test(submission.key) ||
      typeof submission.payload !== 'string' ||
      !this.parsePayload(submission.payload) ||
      (Object.hasOwn(submission, 'state') &&
        !ORDER_PENDING_STATES.includes(submission.state as PendingOrderState))
    )
      throw this.storageError();
    return {
      key: submission.key,
      payload: submission.payload,
      state: submission.state ?? PendingOrderState.UNCERTAIN,
    };
  }

  private saveStoredValue(key: string, value: string): boolean {
    try {
      if (!this.isBrowser) return false;
      sessionStorage.setItem(key, value);
      return sessionStorage.getItem(key) === value;
    } catch {
      return false;
    }
  }

  private removeStoredValue(key: string): void {
    try {
      if (!this.isBrowser) return;
      sessionStorage.removeItem(key);
    } catch {
      return;
    }
  }

  private normalizeOrder(record: OrderApiRecord): Order {
    return {
      id: record.id || record._id || record.orderNumber,
      orderNumber: record.orderNumber,
      items: (record.items ?? []).map((item) => {
        const configuration = normalizeProductConfiguration(item.configuration ?? null);
        const fingerprint = normalizeConfigurationFingerprint(
          item.configurationFingerprint ?? null,
        );
        return {
          productId: item.productId,
          slug: item.slug,
          name: item.name || item.productName || 'Product',
          image: item.image || item.productImage || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPrice: item.discountPrice ?? null,
          lineTotal: item.lineTotal,
          configuration: fingerprint ? configuration : null,
          configurationFingerprint: configuration ? fingerprint : null,
        };
      }),
      customer: record.customer,
      subtotal: record.subtotal,
      deliveryFee: record.deliveryFee ?? 0,
      deliveryFeeConfirmed: record.deliveryFeeConfirmed === true,
      discount: record.discount ?? 0,
      total: record.total ?? record.totalAmount ?? 0,
      currency: environment.defaultCurrency,
      status: record.status,
      paymentMethod: record.paymentMethod?.trim() || '',
      paymentSummary: normalizeOrderPaymentSummary(
        record.paymentSummary ?? null,
        record.deliveryFeeConfirmed === true,
      ),
      estimatedDeliveryDays: record.estimatedDeliveryDays,
      statusHistory: record.statusHistory,
      trackingToken: record.trackingToken,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt || record.createdAt,
    };
  }
}
