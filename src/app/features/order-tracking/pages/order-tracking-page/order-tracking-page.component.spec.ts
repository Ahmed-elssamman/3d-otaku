import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { ORDER_STORAGE_KEYS } from '@core/constants/order.constants';
import { OrderStatus } from '@core/enums/order-status.enum';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { PendingOrderState } from '@core/enums/pending-order-state.enum';
import { ProductConfigurationVersion } from '@core/enums/product-configuration-version.enum';
import { Order, PendingOrderSubmission } from '@core/models/order.model';
import { OrderService } from '@core/services/order.service';
import { OrderTrackingPageComponent } from './order-tracking-page.component';
import { ORDER_TRACKING_TEXT } from './order-tracking-page.control';
import { OrderTrackingState } from './order-tracking-page.enum';

describe('Guest order tracking page', () => {
  const token = 'a'.repeat(64);
  const fragment = `order=ORD-100&token=${token}`;
  const trackingUrl = '/api/orders/track/ORD-100';
  const originalUrl = window.location.href;
  const savedOrder: Order = {
    id: 'tracked-order',
    orderNumber: 'ORD-100',
    trackingToken: token,
    items: [
      {
        productId: 'purchased-piece',
        name: 'قطعة الطلب الأصلية',
        image: '',
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
        configurationFingerprint: 'c'.repeat(64),
        configuration: {
          version: ProductConfigurationVersion.Current,
          material: 'PLA+',
          finish: '',
          color: '',
          size: '120 mm',
          weight: '',
          printTime: '',
          layerHeight: '',
          infill: '',
          isMadeToOrder: false,
          productionTimeMin: null,
          productionTimeMax: null,
          productionTimeUnit: null,
          safetyNote: 'للعرض فقط',
        },
      },
    ],
    customer: {
      fullName: 'عميل المتابعة',
      phone: '+201012345678',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'عنوان الطلب المحفوظ',
      notes: 'ملاحظة لا نعرضها هنا',
    },
    subtotal: 200,
    deliveryFee: 0,
    deliveryFeeConfirmed: true,
    discount: 10,
    total: 190,
    currency: 'EGP',
    status: OrderStatus.PROCESSING,
    paymentMethod: 'manual',
    createdAt: '2026-09-17T05:00:00Z',
    updatedAt: '2026-09-17T06:00:00Z',
    statusHistory: [
      {
        status: OrderStatus.PROCESSING,
        createdAt: '2026-09-17T06:00:00Z',
        publicNote: 'بدأ تنفيذ القطع',
      },
    ],
    paymentSummary: {
      state: PaymentSummaryState.RecordedBalance,
      recordedCollected: 50,
      recordedRefunded: 0,
      recordedNet: 50,
      balanceDue: 140,
      credit: 0,
      shippingConfirmed: true,
    },
  };
  let fixture: ComponentFixture<OrderTrackingPageComponent>;
  let component: OrderTrackingPageComponent;
  let http: HttpTestingController;
  let fragments: BehaviorSubject<string | null>;

  function configure(): void {
    TestBed.configureTestingModule({
      imports: [OrderTrackingPageComponent],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.inject(ActivatedRoute).fragment = fragments.asObservable();
    http = TestBed.inject(HttpTestingController);
  }

  function createPage(incoming: string | null = null): void {
    window.history.replaceState(null, '', `/track-order${incoming ? `#${incoming}` : ''}`);
    fragments.next(incoming);
    fixture = TestBed.createComponent(OrderTrackingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  }

  function pageText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    fragments = new BehaviorSubject<string | null>(null);
    configure();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', originalUrl);
    sessionStorage.clear();
    localStorage.clear();
  });

  it('strips a private fragment before its GET and displays saved public details without changing checkout or cart', async () => {
    const pending: PendingOrderSubmission = {
      key: 'pending-checkout-identity',
      state: PendingOrderState.UNCERTAIN,
      payload: JSON.stringify({
        items: [{ productId: 'edited-cart-piece', quantity: 3 }],
        customer: savedOrder.customer,
      }),
    };
    sessionStorage.setItem(ORDER_STORAGE_KEYS.pendingSubmission, JSON.stringify(pending));
    sessionStorage.setItem(ORDER_STORAGE_KEYS.deliveryDraft, '{"fullName":"عميل السلة"}');
    localStorage.setItem(
      '3d_otaku_cart_items',
      '[{"product":{"id":"edited-cart-piece","name":"قطعة السلة","price":100},"quantity":3}]',
    );
    const pendingBefore = sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission);
    const draftBefore = sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft);
    const cartBefore = localStorage.getItem('3d_otaku_cart_items');
    createPage(fragment);
    expect(component.state()).toBe(OrderTrackingState.Loading);
    expect(window.location.hash).toBe('');
    expect(pageText()).not.toContain(savedOrder.customer.fullName);
    expect(pageText()).toContain(ORDER_TRACKING_TEXT.privacy);
    const request = http.expectOne(trackingUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('X-Order-Token')).toBe(token);
    expect(request.request.urlWithParams).not.toContain(token);
    expect(request.request.transferCache).toBe(false);
    request.flush({
      success: true,
      message: '',
      data: {
        ...savedOrder,
        paymentHistory: [{ reference: 'private-bank-reference', actorId: 'private-operator' }],
        shippingHistory: [{ note: 'private-shipping-note' }],
      },
    });
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Ready);
    expect(pageText()).toContain(savedOrder.customer.address);
    expect(pageText()).toContain('قطعة الطلب الأصلية');
    expect(pageText()).toContain('120');
    expect(pageText()).toContain('بدأ تنفيذ القطع');
    expect(pageText()).toContain('الخصم');
    const element = fixture.nativeElement as HTMLElement;
    const balanceRow =
      Array.from(element.querySelectorAll('app-order-payment-summary .summary-amounts > div'))
        .find((row) => row.querySelector('dt')?.textContent?.trim() === 'المتبقي حسب السجل') ?? null;
    expect(balanceRow?.querySelector('dd')?.textContent?.trim()).toBe('140 ج.م');
    const shippingRow =
      Array.from(element.querySelectorAll('.totals > div'))
        .find((row) => row.querySelector('dt')?.textContent?.trim() === 'رسوم الشحن') ?? null;
    expect(shippingRow?.querySelector('dd')?.textContent?.trim()).toBe('0 ج.م');
    expect(element.querySelector('.privacy-note')).toBeNull();
    expect(element.querySelector('#private-link-privacy')).not.toBeNull();
    expect(pageText()).not.toContain('private-');
    expect(pageText()).not.toContain(savedOrder.customer.notes);
    expect((fixture.nativeElement as HTMLElement).innerHTML).not.toContain(token);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      ORDER_TRACKING_TEXT.robots,
    );
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBe(pendingBefore);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft)).toBe(draftBefore);
    expect(localStorage.getItem('3d_otaku_cart_items')).toBe(cartBefore);
    expect(TestBed.inject(OrderService).hasPendingSubmission()).toBe(true);
    http.expectNone((request) => request.method !== 'GET');
  });

  it('offers saved-receipt tracking only explicitly when a reload has no fragment', async () => {
    sessionStorage.setItem(ORDER_STORAGE_KEYS.receipt, JSON.stringify(savedOrder));
    createPage();
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Missing);
    expect(component.canShowSaved()).toBe(true);
    expect(pageText()).not.toContain(savedOrder.customer.address);
    http.expectNone(trackingUrl);
    component.showSavedOrder();
    const request = http.expectOne(trackingUrl);
    expect(request.request.headers.get('X-Order-Token')).toBe(token);
    request.flush({ success: true, message: '', data: savedOrder });
    await fixture.whenStable();
    expect(component.order()?.orderNumber).toBe('ORD-100');
    fixture.destroy();
    TestBed.resetTestingModule();
    configure();
    createPage();
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Missing);
    expect(component.canShowSaved()).toBe(true);
    expect(pageText()).not.toContain(savedOrder.customer.address);
    http.expectNone(trackingUrl);
  });

  it('rejects an invalid incoming link without revealing an unrelated saved receipt', async () => {
    sessionStorage.setItem(ORDER_STORAGE_KEYS.receipt, JSON.stringify(savedOrder));
    createPage('order=ORD-OTHER&token=invalid');
    await fixture.whenStable();
    expect(window.location.hash).toBe('');
    expect(component.state()).toBe(OrderTrackingState.Invalid);
    expect(component.canShowSaved()).toBe(false);
    component.showSavedOrder();
    component.retry();
    expect(component.order()).toBeNull();
    expect(pageText()).toContain(ORDER_TRACKING_TEXT.invalid);
    expect(pageText()).not.toContain(savedOrder.customer.address);
    http.expectNone((request) => request.url.includes('/orders'));
    expect(TestBed.inject(OrderService).receipt()?.orderNumber).toBe('ORD-100');
  });

  it('keeps a failed read retryable with the exact private credentials and no new order', async () => {
    createPage(fragment);
    http
      .expectOne(trackingUrl)
      .flush({ message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Error);
    expect(pageText()).toContain(ORDER_TRACKING_TEXT.failed);
    component.retry();
    const retry = http.expectOne(trackingUrl);
    expect(retry.request.method).toBe('GET');
    expect(retry.request.headers.get('X-Order-Token')).toBe(token);
    retry.flush({ success: true, message: '', data: savedOrder });
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Ready);
    expect(pageText()).not.toContain(ORDER_TRACKING_TEXT.failed);
    http.expectNone((request) => request.method !== 'GET');
  });

  it('cancels an abandoned tracking response on invalid navigation and then shows only the new valid link', async () => {
    createPage(fragment);
    const abandoned = http.expectOne(trackingUrl);
    window.history.replaceState(null, '', '/track-order#invalid');
    fragments.next('invalid');
    expect(abandoned.cancelled).toBe(true);
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Invalid);
    expect(TestBed.inject(OrderService).receipt()).toBeNull();
    const nextFragment = `order=ORD-200&token=${'b'.repeat(64)}`;
    window.history.replaceState(null, '', `/track-order#${nextFragment}`);
    fragments.next(nextFragment);
    const current = http.expectOne('/api/orders/track/ORD-200');
    current.flush({
      success: true,
      message: '',
      data: { ...savedOrder, orderNumber: 'ORD-200', trackingToken: 'b'.repeat(64) },
    });
    await fixture.whenStable();
    expect(component.order()?.orderNumber).toBe('ORD-200');
    expect(TestBed.inject(OrderService).receipt()?.orderNumber).toBe('ORD-200');
    expect(window.location.hash).toBe('');
    expect(pageText()).not.toContain('ORD-100');
  });

  it('cancels a private GET when leaving the page before it completes', () => {
    createPage(fragment);
    const request = http.expectOne(trackingUrl);
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(TestBed.inject(OrderService).receipt()).toBeNull();
  });

  it('does not send credentials when removing the private fragment fails', async () => {
    window.history.replaceState(null, '', `/track-order#${fragment}`);
    fragments.next(fragment);
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('History unavailable');
    });
    fixture = TestBed.createComponent(OrderTrackingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.state()).toBe(OrderTrackingState.Invalid);
    expect(component.canRetry()).toBe(false);
    http.expectNone((request) => request.url.includes('/orders'));
  });
});
