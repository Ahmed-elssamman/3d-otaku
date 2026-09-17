import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { OrderStatus } from '../enums/order-status.enum';
import { ORDER_STORAGE_KEYS } from '../constants/order.constants';
import { CreateOrderPayload, OrderApiItem, OrderApiRecord } from '../models/order.model';
import { CheckoutQuoteVersion } from '../enums/checkout-quote-version.enum';
import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ApiErrorResponse } from '../models/api-response.model';
import { PendingOrderState } from '../enums/pending-order-state.enum';
import { PaymentSummaryState } from '../enums/payment-summary-state.enum';
import { OrderPaymentSummary } from '../models/order-payment-summary.model';
import { OrderService } from './order.service';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';

describe('OrderService checkout safety', () => {
  let service: OrderService;
  let http: HttpTestingController;
  const payload: CreateOrderPayload = {
    items: [{ productId: 'product-1', quantity: 2 }],
    customer: {
      fullName: 'Test Customer',
      phone: '+201012345678',
      country: 'EG',
      city: 'Cairo',
      address: '123 Test Street',
    },
  };
  const serverOrder: OrderApiRecord = {
    _id: 'order-1',
    orderNumber: 'OTK-1001',
    items: [],
    customer: payload.customer,
    subtotal: 350,
    deliveryFee: 0,
    deliveryFeeConfirmed: false,
    totalAmount: 350,
    status: OrderStatus.PENDING,
    createdAt: '2026-09-16T12:00:00Z',
    trackingToken: 'private-guest-token',
  };
  const purchasedItem: OrderApiItem = {
    productId: 'product-1',
    name: 'القطعة وقت الطلب',
    image: '/original.webp',
    quantity: 2,
    unitPrice: 175,
    lineTotal: 350,
    configurationFingerprint: 'c'.repeat(64),
    configuration: {
      version: ProductConfigurationVersion.Current,
      material: 'PLA+',
      finish: 'Matte',
      color: 'White',
      size: '120 mm',
      weight: '45',
      printTime: '',
      layerHeight: '',
      infill: '',
      isMadeToOrder: false,
      productionTimeMin: null,
      productionTimeMax: null,
      productionTimeUnit: null,
      safetyNote: 'للعرض فقط',
    },
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reuses the pending idempotency key after a lost response and keeps the server receipt', () => {
    service.createOrder(payload).subscribe({ error: () => null });
    const firstAttempt = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const originalKey = firstAttempt.request.headers.get('Idempotency-Key');
    expect(originalKey).toBeTruthy();
    firstAttempt.error(new ProgressEvent('network error'));
    expect(service.hasPendingSubmission()).toBe(true);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toContain(originalKey);

    service.createOrder(payload).subscribe((response) => {
      expect(response.data.total).toBe(350);
      expect(response.data.deliveryFeeConfirmed).toBe(false);
    });
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(originalKey);
    expect(retry.request.body.currency).toBe('EGP');
    retry.flush({ success: true, message: 'Created', data: serverOrder });

    expect(service.receipt()?.orderNumber).toBe('OTK-1001');
    expect(service.receipt()?.trackingToken).toBe('private-guest-token');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toContain('OTK-1001');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBeNull();
    expect(service.hasPendingSubmission()).toBe(false);
  });

  it('sends a guest credential in the header and preserves it after a status refresh', () => {
    service.trackOrder('OTK-1001', 'private-guest-token').subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    expect(request.request.headers.get('X-Order-Token')).toBe('private-guest-token');
    expect(request.request.context.get(GUEST_ORDER_TRACKING)).toBe(true);
    expect(request.request.transferCache).toBe(false);
    expect(request.request.urlWithParams).not.toContain('private-guest-token');
    const { trackingToken, ...updatedOrder } = serverOrder;
    request.flush({
      success: true,
      message: 'Tracked',
      data: { ...updatedOrder, status: OrderStatus.CONFIRMED },
    });
    expect(service.receipt()?.trackingToken).toBe(trackingToken);
    expect(service.receipt()?.status).toBe(OrderStatus.CONFIRMED);
  });

  it('does not replace a saved receipt with an unsuccessful or mismatched tracking response', () => {
    service.trackOrder(serverOrder.orderNumber, 'private-guest-token').subscribe();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`)
      .flush({ success: true, data: serverOrder });
    const saved = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt);
    const errors: ApiErrorResponse[] = [];
    for (const response of [
      { success: false, data: serverOrder },
      { success: true, data: { ...serverOrder, orderNumber: 'ORD-OTHER' } },
    ]) {
      service
        .trackOrder(serverOrder.orderNumber, 'private-guest-token')
        .subscribe({ error: (error: ApiErrorResponse) => errors.push(error) });
      http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`).flush(response);
      expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBe(saved);
      expect(service.receipt()?.orderNumber).toBe(serverOrder.orderNumber);
    }
    expect(errors.map((error) => error.statusCode)).toEqual([502, 502]);
  });

  it('keeps a newly created receipt when an older order tracking response arrives later', () => {
    service.trackOrder(serverOrder.orderNumber, 'private-guest-token').subscribe();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`)
      .flush({ success: true, data: serverOrder });
    service.trackOrder(serverOrder.orderNumber, 'private-guest-token').subscribe();
    const oldRefresh = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);

    service.createOrder(payload).subscribe();
    http.expectOne(`${environment.apiBaseUrl}/orders`).flush({
      success: true,
      data: {
        ...serverOrder,
        _id: 'order-2',
        orderNumber: 'OTK-1002',
        trackingToken: 'new-private-guest-token',
      },
    });
    const savedReceipt = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt);
    oldRefresh.flush({
      success: true,
      data: { ...serverOrder, status: OrderStatus.CONFIRMED },
    });

    expect(service.receipt()?.orderNumber).toBe('OTK-1002');
    expect(service.receipt()?.trackingToken).toBe('new-private-guest-token');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBe(savedReceipt);
    expect(service.hasPendingSubmission()).toBe(false);
  });

  it('does not restore a cleared receipt from an outstanding tracking request', () => {
    service.trackOrder(serverOrder.orderNumber, 'private-guest-token').subscribe();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`)
      .flush({ success: true, data: serverOrder });
    service.trackOrder(serverOrder.orderNumber, 'private-guest-token').subscribe();
    const refresh = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    service.clearReceipt();
    refresh.flush({
      success: true,
      data: { ...serverOrder, status: OrderStatus.CONFIRMED },
    });

    expect(service.receipt()).toBeNull();
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBeNull();
  });

  it('captures an explicit tracking intent when subscribed and can populate an empty receipt', () => {
    const tracking = service.trackOrder(serverOrder.orderNumber, 'private-guest-token');
    service.clearReceipt();
    http.expectNone(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    tracking.subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    const { trackingToken, ...publicOrder } = serverOrder;
    expect(request.request.headers.get('X-Order-Token')).toBe(trackingToken);
    request.flush({ success: true, data: publicOrder });

    expect(service.receipt()?.orderNumber).toBe(serverOrder.orderNumber);
    expect(service.receipt()?.trackingToken).toBe(trackingToken);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toContain(trackingToken);
  });

  it('only publishes the latest subscribed refresh regardless of response order', () => {
    const tracking = service.trackOrder(serverOrder.orderNumber, 'private-guest-token');
    tracking.subscribe();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    tracking.subscribe();
    const second = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    first.flush({ success: true, data: serverOrder });
    expect(service.receipt()).toBeNull();
    second.flush({
      success: true,
      data: { ...serverOrder, status: OrderStatus.CONFIRMED },
    });
    expect(service.receipt()?.status).toBe(OrderStatus.CONFIRMED);

    tracking.subscribe();
    const third = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    tracking.subscribe();
    const fourth = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    fourth.flush({
      success: true,
      data: { ...serverOrder, status: OrderStatus.SHIPPED },
    });
    const savedReceipt = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt);
    third.flush({
      success: true,
      data: { ...serverOrder, status: OrderStatus.PROCESSING },
    });
    expect(service.receipt()?.status).toBe(OrderStatus.SHIPPED);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBe(savedReceipt);
  });

  it('blocks changed uncertain details without HTTP and replays only the original snapshot and key', () => {
    service.createOrder(payload).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const originalKey = first.request.headers.get('Idempotency-Key');
    const originalBody = first.request.body;
    first.error(new ProgressEvent('lost response'));
    const saved = sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission);
    const failures: ApiErrorResponse[] = [];
    service
      .createOrder({
        ...payload,
        items: [{ productId: 'product-1', quantity: 3 }],
        customer: { ...payload.customer, address: 'A different delivery address' },
      })
      .subscribe({ error: (error: ApiErrorResponse) => failures.push(error) });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(failures[0].statusCode).toBe(409);
    expect(failures[0].errors?.['checkoutDetails']).toHaveLength(1);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBe(saved);
    expect(service.receipt()).toBeNull();

    service.retryPendingOrder().subscribe();
    const recovery = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(recovery.request.headers.get('Idempotency-Key')).toBe(originalKey);
    expect(recovery.request.body).toEqual(originalBody);
    recovery.flush(
      { success: true, message: 'Created', data: serverOrder },
      {
        status: 201,
        statusText: 'Created',
      },
    );
    expect(service.hasPendingSubmission()).toBe(false);
    expect(service.receipt()?.orderNumber).toBe(serverOrder.orderNumber);
  });

  it('refreshes agreed shipping including zero and the server total while preserving the private guest credential', () => {
    const { trackingToken, ...publicRecord } = serverOrder;
    service.trackOrder(serverOrder.orderNumber, trackingToken).subscribe();
    const confirmed = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    expect(confirmed.request.headers.get('X-Order-Token')).toBe(trackingToken);
    confirmed.flush({
      success: true,
      message: 'Latest',
      data: {
        ...publicRecord,
        discount: 10,
        deliveryFee: 49.75,
        deliveryFeeConfirmed: true,
        total: 389.75,
      },
    });
    expect(service.receipt()).toMatchObject({
      deliveryFee: 49.75,
      deliveryFeeConfirmed: true,
      discount: 10,
      total: 389.75,
      trackingToken,
    });
    service.trackOrder(serverOrder.orderNumber, service.receipt()?.trackingToken || '').subscribe();
    const freeDelivery = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`);
    expect(freeDelivery.request.headers.get('X-Order-Token')).toBe(trackingToken);
    freeDelivery.flush({
      success: true,
      message: 'Latest',
      data: {
        ...publicRecord,
        discount: 10,
        deliveryFee: 0,
        deliveryFeeConfirmed: true,
        total: 340,
      },
    });
    expect(service.receipt()).toMatchObject({
      deliveryFee: 0,
      deliveryFeeConfirmed: true,
      total: 340,
      trackingToken,
    });
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toContain(
      '"deliveryFeeConfirmed":true',
    );
    service.getOrders().subscribe();
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/orders`)
      .flush({
        success: true,
        message: 'Account orders',
        data: [
          { ...publicRecord, discount: 10, deliveryFee: 0, deliveryFeeConfirmed: true, total: 340 },
        ],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(service.orders()[0]).toMatchObject({
      deliveryFee: 0,
      deliveryFeeConfirmed: true,
      discount: 10,
      total: 340,
    });
    expect(service.orders()[0].trackingToken).toBeFalsy();
  });

  it('uses a new key after confirmed 422 rejection and persists the corrected recoverable snapshot', () => {
    service.createOrder(payload).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(
      { success: false, message: 'Invalid address' },
      {
        status: 422,
        statusText: 'Unprocessable Entity',
      },
    );
    expect(service.canRetryPendingSubmission()).toBe(false);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toContain(
      PendingOrderState.VALIDATION_REJECTED,
    );

    const reloaded = TestBed.runInInjectionContext(() => new OrderService());
    const corrected: CreateOrderPayload = {
      ...payload,
      customer: { ...payload.customer, address: 'Corrected complete delivery address' },
    };
    reloaded.createOrder(corrected).subscribe({ error: () => null });
    const second = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const correctedKey = second.request.headers.get('Idempotency-Key');
    expect(correctedKey).not.toBe(key);
    expect(second.request.body.customer.address).toBe(corrected.customer.address);
    second.error(new ProgressEvent('lost corrected response'));

    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.pendingRequest()?.customer.address).toBe(corrected.customer.address);
    restored.retryPendingOrder().subscribe();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(correctedKey);
    expect(retry.request.body).toEqual({ ...corrected, currency: 'EGP' });
    retry.flush({ success: true, message: 'Recovered', data: serverOrder });
  });

  it('keeps a previously uncertain request locked after exact retry 422 or quote conflict, including reload', () => {
    const quoted = { ...payload, expectedQuoteFingerprint: 'a'.repeat(64) };
    service.createOrder(quoted).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    const body = first.request.body;
    first.error(new ProgressEvent('original request may still be running'));
    const originalStored = sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission);

    for (const status of [422, 409]) {
      const restored = TestBed.runInInjectionContext(() => new OrderService());
      restored.retryPendingOrder().subscribe({ error: () => null });
      const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
      expect(retry.request.body).toEqual(body);
      expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
      retry.flush(
        { success: false, errors: { checkoutQuote: ['Quote changed'] } },
        {
          status,
          statusText: 'Rejected retry',
        },
      );
      expect(restored.canRetryPendingSubmission()).toBe(true);
      expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBe(originalStored);
      restored
        .createOrder({ ...quoted, expectedQuoteFingerprint: 'b'.repeat(64) })
        .subscribe({ error: () => null });
      http.expectNone(`${environment.apiBaseUrl}/orders`);
    }
  });

  it('does not let a late first rejection unlock another in-flight copy of its request', () => {
    service.createOrder(payload).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    service.retryPendingOrder().subscribe({ error: () => null });
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    first.flush({ success: false }, { status: 422, statusText: 'Late validation' });
    expect(service.canRetryPendingSubmission()).toBe(true);
    retry.error(new ProgressEvent('retry outcome unknown'));
    service
      .createOrder({ ...payload, customer: { ...payload.customer, address: 'Changed address' } })
      .subscribe({ error: () => null });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
  });

  it('allows correction after a first quote conflict without weakening prior uncertainty', () => {
    const quoted = { ...payload, expectedQuoteFingerprint: 'a'.repeat(64) };
    service.createOrder(quoted).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      {
        success: false,
        errors: { checkoutQuote: ['Quote changed before creation'] },
      },
      { status: 409, statusText: 'Quote conflict' },
    );
    expect(service.canRetryPendingSubmission()).toBe(false);
    service
      .createOrder({ ...quoted, expectedQuoteFingerprint: 'b'.repeat(64) })
      .subscribe({ error: () => null });
    const next = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(next.request.body.expectedQuoteFingerprint).toBe('b'.repeat(64));
    expect(next.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    next.error(new ProgressEvent('uncertain revised attempt'));
    expect(service.canRetryPendingSubmission()).toBe(true);
  });

  it('persists a matching terminal rejection after uncertainty and uses a new reviewed request identity', () => {
    const quoted = { ...payload, expectedQuoteFingerprint: 'a'.repeat(64) };
    service.createOrder(quoted).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const originalKey = first.request.headers.get('Idempotency-Key');
    const originalBody = first.request.body;
    first.error(new ProgressEvent('POST was blocked before reaching the API'));
    service.retryPendingOrder().subscribe({ error: () => null });
    const recovery = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(recovery.request.body).toEqual(originalBody);
    recovery.flush(
      { success: false, errors: { checkoutNotRecorded: ['Matching durable rejection'] } },
      { status: 409, statusText: 'Not recorded' },
    );
    expect(service.canRetryPendingSubmission()).toBe(false);
    expect(service.requiresFreshQuoteReview()).toBe(true);
    expect(service.pendingRequest()).toEqual(originalBody);
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.requiresFreshQuoteReview()).toBe(true);
    restored
      .createOrder({ ...quoted, expectedQuoteFingerprint: 'b'.repeat(64) })
      .subscribe({ error: () => null });
    const reviewed = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(reviewed.request.headers.get('Idempotency-Key')).not.toBe(originalKey);
    expect(reviewed.request.body.expectedQuoteFingerprint).toBe('b'.repeat(64));
    reviewed.error(new ProgressEvent('new outcome uncertain'));
  });

  it('does not accept malformed or conflicting terminal markers as proof', () => {
    service.createOrder(payload).subscribe({ error: () => null });
    http.expectOne(`${environment.apiBaseUrl}/orders`).error(new ProgressEvent('uncertain'));
    const saved = sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission);
    const errorsToReject = [
      { checkoutNotRecorded: [] },
      { checkoutNotRecorded: [' '] },
      { checkoutNotRecorded: ['proof', 1] },
      { checkoutNotRecorded: 'proof' },
      { checkoutNotRecorded: ['proof'], checkoutSession: ['Wrong owner'] },
      { checkoutNotRecorded: ['proof'], checkoutDetails: ['Wrong payload'] },
      { checkoutNotRecorded: ['proof'], checkoutQuote: ['Generic quote conflict'] },
      { checkoutNotRecorded: ['proof'], customer: 'Malformed field' },
    ];
    for (const errors of errorsToReject) {
      service.retryPendingOrder().subscribe({ error: () => null });
      http
        .expectOne(`${environment.apiBaseUrl}/orders`)
        .flush({ success: false, errors }, { status: 409, statusText: 'Untrusted conflict' });
      expect(service.canRetryPendingSubmission()).toBe(true);
      expect(service.requiresFreshQuoteReview()).toBe(false);
      expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBe(saved);
    }
  });

  it('does not let a late replay clear a newer pending checkout', () => {
    service.createOrder(payload).subscribe();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    service.retryPendingOrder().subscribe();
    const oldReplay = http.expectOne(`${environment.apiBaseUrl}/orders`);
    first.flush({ success: true, data: serverOrder });
    service
      .createOrder({ ...payload, items: [{ productId: 'product-2', quantity: 1 }] })
      .subscribe({ error: () => null });
    const newer = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const newerKey = newer.request.headers.get('Idempotency-Key');
    oldReplay.flush({ success: true, data: serverOrder });
    expect(service.hasPendingSubmission()).toBe(true);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toContain(newerKey);
    newer.error(new ProgressEvent('new request remains unresolved'));
  });

  it('treats a legacy pending record as uncertain and keeps it after a private session conflict', () => {
    const key = 'legacy-pending-checkout-key';
    const originalBody = { ...payload, currency: 'EGP' };
    sessionStorage.setItem(
      ORDER_STORAGE_KEYS.pendingSubmission,
      JSON.stringify({
        key,
        payload: JSON.stringify(originalBody),
      }),
    );
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.canRetryPendingSubmission()).toBe(true);
    restored
      .createOrder({ ...payload, customer: { ...payload.customer, email: 'changed@example.test' } })
      .subscribe({ error: () => null });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    restored.retryPendingOrder().subscribe({ error: () => null });
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(originalBody);
    retry.flush(
      { success: false, errors: { checkoutSession: ['Original session required'] } },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    expect(restored.receipt()).toBeNull();
    expect(restored.canRetryPendingSubmission()).toBe(true);
    expect(restored.pendingRequest()).toEqual(originalBody);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBeNull();
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toContain(key);
  });

  it('does not present a legacy zero shipping fee as confirmed free shipping', () => {
    service.trackOrder('OTK-1001', 'private-guest-token').subscribe((response) => {
      expect(response.data.deliveryFeeConfirmed).toBe(false);
    });
    const { deliveryFeeConfirmed, ...legacyOrder } = serverOrder;
    http
      .expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`)
      .flush({ success: true, message: 'Tracked', data: legacyOrder });
  });

  it('whitelists the public payment summary on tracking and in the saved receipt', () => {
    const summary: OrderPaymentSummary = {
      state: PaymentSummaryState.RecordedBalance,
      recordedCollected: 100,
      recordedRefunded: 20.25,
      recordedNet: 79.75,
      balanceDue: 270.25,
      credit: 0,
      shippingConfirmed: true,
    };
    service.trackOrder('OTK-1001', 'private-guest-token').subscribe((response) => {
      expect(response.data.paymentSummary).toEqual(summary);
      expect(response.data).not.toHaveProperty('paymentEvents');
    });
    http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`).flush({
      success: true,
      data: {
        ...serverOrder,
        deliveryFeeConfirmed: true,
        paymentSummary: { ...summary, internalNote: 'secret-note', reference: 'secret-reference' },
        paymentEvents: [{ actor: 'private-admin' }],
      },
    });
    const stored = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt) || '';
    expect(stored).not.toContain('secret-note');
    expect(stored).not.toContain('secret-reference');
    expect(stored).not.toContain('private-admin');
    expect(service.receipt()?.paymentSummary).toEqual(summary);
    sessionStorage.setItem(
      ORDER_STORAGE_KEYS.receipt,
      JSON.stringify({
        ...serverOrder,
        total: 350,
        deliveryFeeConfirmed: true,
        paymentSummary: { ...summary, internalNote: 'private-cached-note' },
      }),
    );
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.receipt()?.paymentSummary).toEqual(summary);
    expect(JSON.stringify(restored.receipt())).not.toContain('private-cached-note');
  });

  it('does not infer unpaid status from an older API or cached receipt without payment history', () => {
    service.trackOrder('OTK-1001').subscribe((response) => {
      expect(response.data.paymentSummary?.state).toBe(PaymentSummaryState.Unavailable);
      expect(response.data.paymentSummary?.recordedCollected).toBeNull();
      expect(response.data.paymentSummary?.balanceDue).toBeNull();
    });
    http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`).flush({
      success: true,
      data: serverOrder,
    });
    sessionStorage.setItem(
      ORDER_STORAGE_KEYS.receipt,
      JSON.stringify({
        ...serverOrder,
        total: 350,
        paymentEvents: [{ reference: 'private-old-reference' }],
      }),
    );
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.receipt()?.paymentSummary?.state).toBe(PaymentSummaryState.Unavailable);
    expect(restored.receipt()).not.toHaveProperty('paymentEvents');
  });

  it('replays the exact reviewed protocol and quote identity after reload', () => {
    const reviewed: CreateOrderPayload = {
      ...payload,
      expectedQuoteVersion: CheckoutQuoteVersion.Current,
      expectedQuoteFingerprint: 'a'.repeat(64),
    };
    service.createOrder(reviewed).subscribe({ error: () => null });
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    const body = JSON.stringify(first.request.body);
    first.error(new ProgressEvent('lost response'));
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    restored.createOrder(payload).subscribe({ error: () => null });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    restored.retryPendingOrder().subscribe();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(JSON.stringify(retry.request.body)).toBe(body);
    expect(retry.request.body.expectedQuoteVersion).toBe(2);
    retry.flush({ success: true, data: { ...serverOrder, items: [purchasedItem] } });
    expect(restored.receipt()?.items[0].configuration).toEqual(purchasedItem.configuration);
  });

  it('keeps purchased specifications in receipts and reloads while excluding manufacturing records', () => {
    const leakedItem = {
      ...purchasedItem,
      manufacturingSnapshot: { measurementReference: 'private-measurement' },
      configuration: { ...purchasedItem.configuration, approvedBy: 'private-approver' },
    };
    service.trackOrder('OTK-1001', 'private-guest-token').subscribe();
    http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`).flush({
      success: true,
      data: { ...serverOrder, items: [leakedItem] },
    });
    expect(service.receipt()?.items[0].configuration).toEqual(purchasedItem.configuration);
    expect(service.receipt()?.items[0].configurationFingerprint).toBe(
      purchasedItem.configurationFingerprint,
    );
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).not.toContain('private-measurement');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).not.toContain('private-approver');
    sessionStorage.setItem(
      ORDER_STORAGE_KEYS.receipt,
      JSON.stringify({ ...serverOrder, total: 350, items: [leakedItem] }),
    );
    const restored = TestBed.runInInjectionContext(() => new OrderService());
    expect(restored.receipt()?.items[0].configuration).toEqual(purchasedItem.configuration);
    expect(JSON.stringify(restored.receipt()?.items)).not.toContain('private-');
  });

  it('marks legacy, incomplete and malformed purchased configuration as unavailable', () => {
    const legacyItem = { ...purchasedItem };
    Reflect.deleteProperty(legacyItem, 'configuration');
    Reflect.deleteProperty(legacyItem, 'configurationFingerprint');
    service.trackOrder('OTK-1001').subscribe();
    http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-1001`).flush({
      success: true,
      data: {
        ...serverOrder,
        items: [
          legacyItem,
          { ...purchasedItem, configurationFingerprint: null },
          { ...purchasedItem, configuration: { ...purchasedItem.configuration, weight: 45 } },
        ],
      },
    });
    for (const item of service.receipt()?.items ?? []) {
      expect(item.configuration).toBeNull();
      expect(item.configurationFingerprint).toBeNull();
    }
    expect(service.receipt()?.items).toHaveLength(3);
  });
});
