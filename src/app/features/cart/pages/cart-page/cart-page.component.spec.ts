import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { OrderStatus } from '@core/enums/order-status.enum';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { Product } from '@core/models/product.model';
import {
  CheckoutQuote,
  CheckoutQuoteItem,
  CreateOrderPayload,
  OrderApiRecord,
} from '@core/models/order.model';
import { CartService } from '@core/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { AuthService } from '@core/services/auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { UserRole } from '@core/enums/user-role.enum';
import { environment } from '../../../../../environments/environment';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { ORDER_STORAGE_KEYS } from '@core/constants/order.constants';
import { CartPageComponent } from './cart-page.component';
import { CheckoutQuoteVersion } from '@core/enums/checkout-quote-version.enum';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import { productConfiguration } from '@core/utils/product-configuration.util';

describe('Egyptian guest checkout', () => {
  let component: CartPageComponent;
  let cart: CartService;
  let orders: OrderService;
  let http: HttpTestingController;
  const product: Product = {
    id: 'desk-organizer',
    slug: 'desk-organizer',
    name: 'Desk Organizer',
    category: ProductCategory.COLLECTIBLES,
    shortDescription: 'Organizer',
    description: 'Desk organizer',
    price: 250,
    discountPrice: null,
    image: '',
    gallery: [],
    modelUrl: null,
    tags: [],
    material: ProductMaterial.PLA_PLUS,
    finish: 'Matte',
    color: 'Green',
    size: '12 cm',
    weight: '40 g',
    printTime: '3 hours',
    isFeatured: false,
    isActive: true,
    safetyNote: '',
    createdAt: '2026-09-16',
    updatedAt: '2026-09-16',
    configurationFingerprint: 'c'.repeat(64),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new CartPageComponent());
    cart = TestBed.inject(CartService);
    orders = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
    cart.addItem(product, 2);
    component.deliveryForm.patchValue({
      fullName: ' Test Customer ',
      whatsappNumber: '٠١٠١٢٣٤٥٦٧٨',
      governorate: 'القاهرة',
      city: ' مدينة نصر ',
      address: ' شارع اختبار، عمارة 12، شقة 2 ',
    });
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('submits as a guest and shows the server-confirmed receipt without a login redirect', () => {
    expect(component.isAuthenticated()).toBe(false);
    submitWithQuote();
    expect(component.isSubmittingOrder()).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(request.request.body.customer).toMatchObject({
      fullName: 'Test Customer',
      phone: '+201012345678',
      country: 'EG',
      city: 'مدينة نصر',
    });
    expect(request.request.body).not.toHaveProperty('subtotal');
    expect(request.request.body).not.toHaveProperty('deliveryFee');
    expect(request.request.body.expectedQuoteVersion).toBe(CheckoutQuoteVersion.Current);
    expect(component.pricingReview()).toBeNull();
    request.flush({
      success: true,
      message: 'Created',
      data: {
        _id: 'order-1',
        orderNumber: 'OTK-1001',
        items: [],
        customer: request.request.body.customer,
        subtotal: 500,
        totalAmount: 500,
        deliveryFee: 0,
        deliveryFeeConfirmed: false,
        status: OrderStatus.PENDING,
        trackingToken: 'private-token',
        createdAt: '2026-09-16T12:00:00Z',
      },
    });
    expect(component.isSubmittingOrder()).toBe(false);
    expect(cart.itemCount()).toBe(0);
    expect(component.showReceipt()).toBe(true);
    expect(orders.receipt()?.total).toBe(500);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('keeps the cart and input details after a failed submission', () => {
    submitWithQuote();
    http.expectOne(`${environment.apiBaseUrl}/orders`).error(new ProgressEvent('network error'));
    expect(component.isSubmittingOrder()).toBe(false);
    expect(component.submitError()).toBeTruthy();
    expect(cart.itemCount()).toBe(2);
    expect(component.deliveryForm.controls.address.value).toContain('عمارة 12');
    expect(component.showReceipt()).toBe(false);
  });

  it('renders the refreshed confirmed shipping and discount without continuing to promise an unknown fee', async () => {
    const receipt: OrderApiRecord = {
      id: 'order-shipping-receipt',
      orderNumber: 'OTK-SHIPPING-RECEIPT',
      items: [],
      customer: { fullName: 'عميل الاختبار', phone: '+201012345678', address: 'عنوان الاختبار' },
      subtotal: 250,
      discount: 10,
      total: 240,
      deliveryFee: 0,
      deliveryFeeConfirmed: false,
      status: OrderStatus.PENDING,
      createdAt: '2026-09-17T01:00:00Z',
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          createdAt: '2026-09-17T01:00:00Z',
          publicNote: 'تم تسجيل الطلب للمراجعة.',
        },
      ],
      paymentSummary: {
        state: PaymentSummaryState.ShippingUnconfirmed,
        recordedCollected: 100,
        recordedRefunded: 0,
        recordedNet: 100,
        balanceDue: null,
        credit: null,
        shippingConfirmed: false,
      },
    };
    cart.clearCart();
    orders.trackOrder(receipt.orderNumber, 'private-guest-token').subscribe();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/track/${receipt.orderNumber}`)
      .flush({ success: true, message: 'Receipt', data: receipt });
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('الإجمالي قبل الشحن');
    expect(fixture.nativeElement.textContent).toContain('الرصيد النهائي ينتظر تأكيد الشحن');
    expect(fixture.nativeElement.textContent).not.toContain('المتبقي حسب السجل');
    const copyButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.receipt-card button');
    copyButton.focus();
    fixture.componentInstance.refreshReceipt();
    const refresh = http.expectOne(`${environment.apiBaseUrl}/orders/track/${receipt.orderNumber}`);
    expect(refresh.request.headers.get('X-Order-Token')).toBe('private-guest-token');
    refresh.flush({
      success: true,
      message: 'Latest',
      data: {
        ...receipt,
        deliveryFee: 49.75,
        deliveryFeeConfirmed: true,
        total: 289.75,
        status: OrderStatus.PROCESSING,
        statusHistory: [
          ...(receipt.statusHistory ?? []),
          {
            status: OrderStatus.PROCESSING,
            createdAt: '2026-09-17T02:00:00Z',
            publicNote: 'راجع تفاصيل التوصيل قبل المتابعة.',
            note: 'private-status-note',
            actor: 'private-status-actor',
          },
        ],
        paymentSummary: {
          state: PaymentSummaryState.RecordedBalance,
          recordedCollected: 100,
          recordedRefunded: 0,
          recordedNet: 100,
          balanceDue: 189.75,
          credit: 0,
          shippingConfirmed: true,
          internalNote: 'private-payment-note',
        },
      },
    });
    await fixture.whenStable();
    expect(document.activeElement).toBe(copyButton);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('الخصم');
    expect(text).toContain('−10 ج.م');
    expect(text).toContain('49.75 ج.م');
    expect(text).toContain('289.75 ج.م');
    expect(text).toContain('رسوم الشحن مؤكدة ضمن الإجمالي');
    expect(text).toContain('المتبقي حسب السجل');
    expect(text).toContain('189.75 ج.م');
    expect(text).not.toContain('الرصيد النهائي ينتظر تأكيد الشحن');
    expect(text).not.toContain('private-payment-note');
    expect(text).not.toContain('الإجمالي قبل الشحن');
    expect(text).not.toContain('هنعرض عليك تكلفة الشحن');
    expect(text).not.toContain('private-guest-token');
    expect(fixture.nativeElement.querySelector('#receipt-history-title')?.textContent).toContain(
      'رحلة طلبك',
    );
    expect(text).toContain('راجع تفاصيل التوصيل قبل المتابعة.');
    expect(text).toContain('جاري التنفيذ');
    expect(text).not.toContain('private-status-note');
    expect(text).not.toContain('private-status-actor');
    fixture.componentInstance.returnToSavedCart();
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#cart-title'));
    fixture.componentInstance.showSavedReceipt();
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#receipt-title'));
  });

  it('preserves the receipt and tracking token while browsing and returning to an edited cart', () => {
    const initialDraft = component.deliveryForm.getRawValue();
    component.ngOnInit();
    component.deliveryForm.patchValue(initialDraft);
    submitWithQuote();
    const creation = http.expectOne(`${environment.apiBaseUrl}/orders`);
    creation.flush({
      success: true,
      data: {
        id: 'browse-receipt',
        orderNumber: 'OTK-BROWSE',
        items: [quotedItem(product)],
        customer: creation.request.body.customer,
        subtotal: 500,
        total: 500,
        deliveryFee: 0,
        deliveryFeeConfirmed: false,
        status: OrderStatus.PENDING,
        trackingToken: 'private-browse-token',
        createdAt: '2026-09-17T05:00:00Z',
      },
    });
    const savedReceipt = sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt);
    cart.addItem({ ...product, size: '22 cm' }, 1);
    component.deliveryForm.controls.address.setValue('عنوان معدل محفوظ، عمارة 3 شقة 4');
    const savedDraft = sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft);
    component.browseProducts();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/products']);
    expect(orders.receipt()?.trackingToken).toBe('private-browse-token');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.receipt)).toBe(savedReceipt);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft)).toBe(savedDraft);
    expect(cart.items()[0].product.size).toBe('22 cm');
    expect(component.deliveryForm.controls.address.value).toContain('عنوان معدل');
    const returned = TestBed.runInInjectionContext(() => new CartPageComponent());
    returned.ngOnInit();
    expect(returned.showReceipt()).toBe(false);
    expect(returned.deliveryForm.controls.address.value).toContain('عنوان معدل');
    expect(returned.canShowSavedReceipt()).toBe(true);
    returned.showSavedReceipt();
    expect(returned.showReceipt()).toBe(true);
    expect(returned.receiptRetainsCheckout()).toBe(true);
    returned.refreshReceipt();
    const refresh = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-BROWSE`);
    expect(refresh.request.headers.get('X-Order-Token')).toBe('private-browse-token');
    refresh.error(new ProgressEvent('read-only follow-up network failure'));
    expect(cart.itemCount()).toBe(1);
    expect(orders.receipt()?.trackingToken).toBe('private-browse-token');
  });

  it('ignores an old receipt refresh error after checkout saves a new receipt in the same page', () => {
    orders.trackOrder('OTK-OLDER', 'older-private-token').subscribe();
    http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-OLDER`).flush({
      success: true,
      data: {
        id: 'older-order',
        orderNumber: 'OTK-OLDER',
        items: [],
        customer: { fullName: 'عميل الاختبار', phone: '+201012345678', address: 'عنوان الاختبار' },
        subtotal: 250,
        total: 250,
        deliveryFee: 0,
        deliveryFeeConfirmed: false,
        status: OrderStatus.PENDING,
        createdAt: '2026-09-17T04:00:00Z',
      },
    });
    component.showSavedReceipt();
    component.refreshReceipt();
    const oldRefresh = http.expectOne(`${environment.apiBaseUrl}/orders/track/OTK-OLDER`);
    component.returnToSavedCart();
    submitWithQuote();
    const creation = http.expectOne(`${environment.apiBaseUrl}/orders`);
    creation.flush({
      success: true,
      data: {
        id: 'newer-order',
        orderNumber: 'OTK-NEWER',
        items: [quotedItem(product)],
        customer: creation.request.body.customer,
        subtotal: 500,
        total: 500,
        deliveryFee: 0,
        deliveryFeeConfirmed: false,
        status: OrderStatus.PENDING,
        trackingToken: 'newer-private-token',
        createdAt: '2026-09-17T05:00:00Z',
      },
    });
    expect(component.showReceipt()).toBe(true);
    oldRefresh.error(new ProgressEvent('older order follow-up failed'));

    expect(component.receiptError()).toBe('');
    expect(component.isRefreshingReceipt()).toBe(false);
    expect(component.receipt()?.orderNumber).toBe('OTK-NEWER');
    expect(component.receipt()?.trackingToken).toBe('newer-private-token');
    expect(cart.itemCount()).toBe(0);
  });

  it('does not submit an overseas mobile number or a blank address', () => {
    component.deliveryForm.patchValue({ whatsappNumber: '+966501234567', address: '   ' });
    submitWithQuote();
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.deliveryForm.controls.whatsappNumber.touched).toBe(true);
    expect(component.deliveryForm.controls.address.invalid).toBe(true);
    expect(cart.itemCount()).toBe(2);
  });

  it('explains a checkout-session conflict without discarding the cart or retry identity', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('lost response'));
    submitWithQuote();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(
      {
        success: false,
        message: 'Checkout session conflict.',
        errors: { checkoutSession: ['Use the original checkout session.'] },
      },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.submitError()).toContain('الحساب أو وضع الزائر الذي بدأت به');
    expect(component.submitError()).not.toContain('توفّر المنتجات');
    expect(component.isSubmittingOrder()).toBe(false);
    expect(cart.itemCount()).toBe(2);
    expect(component.deliveryForm.controls.email.value).toBe('');
    expect(component.showReceipt()).toBe(false);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toContain(key);
  });

  it('keeps pending checkout fields and retry identity unchanged when a customer signs in', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    const body = first.request.body;
    first.error(new ProgressEvent('lost response'));
    sessionStorage.setItem(
      ORDER_STORAGE_KEYS.deliveryDraft,
      JSON.stringify(component.deliveryForm.getRawValue()),
    );
    restoreCustomer();
    expect(component.deliveryForm.controls.email.value).toBe('');
    component.ngOnInit();
    TestBed.tick();
    expect(component.deliveryForm.controls.email.value).toBe('');
    submitWithQuote();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(body);
    retry.error(new ProgressEvent('response still unavailable'));
    expect(cart.itemCount()).toBe(2);
  });

  it('blocks edited checkout details and preserves current cart and draft when the original receipt is recovered', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    const originalBody = first.request.body as CreateOrderPayload;
    first.error(new ProgressEvent('lost saved order response'));
    component.incrementQuantity('desk-organizer', 2);
    component.deliveryForm.controls.address.setValue('عنوان معدل، عمارة 30، شقة 4');
    submitWithQuote();
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.submitError()).toContain('تعديلاتك الحالية محفوظة ولم تُرسل');
    expect(component.canRetryPendingSubmission()).toBe(true);

    component.retryPreviousOrder();
    const wrongSession = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(wrongSession.request.headers.get('Idempotency-Key')).toBe(key);
    expect(wrongSession.request.body).toEqual(originalBody);
    wrongSession.flush(
      { success: false, errors: { checkoutSession: ['Original session required'] } },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    expect(component.submitError()).toContain('الحساب أو وضع الزائر الذي بدأت به');
    expect(orders.receipt()).toBeNull();
    expect(component.showReceipt()).toBe(false);
    expect(cart.itemCount()).toBe(3);

    component.retryPreviousOrder();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(originalBody);
    cart.updateQuantity('desk-organizer', 4);
    component.deliveryForm.controls.address.setValue('آخر تعديل أثناء الاستعادة، عمارة 40');
    const originalOrder: OrderApiRecord = {
      id: 'original-order',
      orderNumber: 'OTK-ORIGINAL',
      customer: originalBody.customer,
      items: [
        {
          productId: 'desk-organizer',
          name: product.name,
          quantity: 2,
          unitPrice: 250,
          lineTotal: 500,
        },
      ],
      subtotal: 500,
      total: 500,
      status: OrderStatus.PENDING,
      createdAt: '2026-09-17T00:00:00.000Z',
      trackingToken: 'original-guest-receipt-token',
    };
    retry.flush({ success: true, data: originalOrder });
    expect(orders.receipt()?.orderNumber).toBe('OTK-ORIGINAL');
    expect(orders.receipt()?.total).toBe(500);
    expect(cart.itemCount()).toBe(4);
    expect(component.deliveryForm.controls.address.value).toBe(
      'آخر تعديل أثناء الاستعادة، عمارة 40',
    );
    expect(component.receiptRetainsCheckout()).toBe(true);
    expect(component.showReceipt()).toBe(true);
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft)).toContain('عمارة 40');
    expect(sessionStorage.getItem(ORDER_STORAGE_KEYS.pendingSubmission)).toBeNull();
    component.returnToSavedCart();
    expect(component.showReceipt()).toBe(false);
    expect(cart.itemCount()).toBe(4);

    const restored = TestBed.runInInjectionContext(() => new CartPageComponent());
    restored.ngOnInit();
    restoreCustomer();
    expect(restored.deliveryForm.controls.address.value).toBe(
      'آخر تعديل أثناء الاستعادة، عمارة 40',
    );
    expect(restored.deliveryForm.controls.email.value).toBe('');
    expect(restored.receiptRetainsCheckout()).toBe(true);
    expect(restored.showReceipt()).toBe(false);
  });

  it('can retry the saved request after the current cart is emptied and the edited form is invalid', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const originalBody = first.request.body as CreateOrderPayload;
    first.error(new ProgressEvent('lost response'));
    component.removeItem('desk-organizer');
    component.deliveryForm.controls.address.setValue('');
    expect(component.deliveryForm.invalid).toBe(true);
    component.retryPreviousOrder();
    const recovery = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(recovery.request.body).toEqual(originalBody);
    recovery.flush({
      success: true,
      data: {
        id: 'original-order',
        orderNumber: 'OTK-EMPTY-CART',
        customer: originalBody.customer,
        items: [],
        subtotal: 500,
        total: 500,
        status: OrderStatus.PENDING,
        createdAt: '2026-09-17T00:00:00.000Z',
      },
    });
    expect(component.showReceipt()).toBe(true);
    expect(component.receiptRetainsCheckout()).toBe(true);
    expect(component.deliveryForm.controls.address.value).toBe('');
    component.returnToSavedCart();
    expect(component.showReceipt()).toBe(false);
    expect(cart.itemCount()).toBe(0);
  });

  it('uses a new key for confirmed validation correction and handles a server details conflict', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(
      { success: false, message: 'Address was rejected' },
      {
        status: 422,
        statusText: 'Unprocessable Entity',
      },
    );
    expect(component.submitError()).toContain('صحح الحقول');
    expect(component.canRetryPendingSubmission()).toBe(false);
    component.deliveryForm.controls.address.setValue('عنوان مصحح ومكتمل، عمارة 20');
    submitWithQuote();
    const corrected = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(corrected.request.headers.get('Idempotency-Key')).not.toBe(key);
    expect(corrected.request.body.customer.address).toBe('عنوان مصحح ومكتمل، عمارة 20');
    corrected.flush(
      { success: false, errors: { checkoutDetails: ['Restore original details'] } },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    expect(component.submitError()).toContain('إعادة محاولة الطلب السابق');
    expect(component.showReceipt()).toBe(false);
    expect(cart.itemCount()).toBe(2);
    expect(orders.hasPendingSubmission()).toBe(true);
  });

  it('shows changed per-item prices before posting and submits only after explicit review confirmation', async () => {
    const initialForm = component.deliveryForm.getRawValue();
    const fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.deliveryForm.setValue(initialForm);
    component.submitOrder();
    expect(component.isQuoting()).toBe(true);
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    flushQuote({
      items: [
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: '',
          quantity: 2,
          unitPrice: 300,
          discountPrice: null,
          lineTotal: 600,
          configuration: configurationFor(product),
          configurationFingerprint: 'c'.repeat(64),
        },
      ],
      subtotal: 600,
      total: 600,
    });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.pricingReview()?.items[0]).toMatchObject({
      previousUnitPrice: 250,
      unitPrice: 300,
      priceChanged: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const review: HTMLElement = fixture.nativeElement.querySelector('#checkout-price-review');
    expect(document.activeElement).toBe(review);
    expect(review.textContent).toContain('250 ج.م');
    expect(review.textContent).toContain('300 ج.م');
    expect(review.textContent).toContain('600 ج.م');
    expect(review.textContent).toContain('هذا الإجمالي لا يشمل الشحن');
    component.submitOrder();
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    component.confirmPricingReview();
    const created = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(created.request.body.expectedQuoteFingerprint).toBe('a'.repeat(64));
    expect(created.request.body.items).toEqual([{ productId: product.id, quantity: 2 }]);
    expect(component.pricingReview()?.quote.total).toBe(600);
    fixture.detectChanges();
    expect(review.textContent).toContain('600 ج.م');
    expect(review.querySelector('button')?.disabled).toBe(true);
    created.error(new ProgressEvent('deliberate unknown response'));
    expect(component.canRetryPendingSubmission()).toBe(true);
    expect(component.pricingReview()).toBeNull();
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#checkout-feedback'));
  });

  it('requires shipping review when unknown delivery becomes explicitly free', () => {
    expect(component.deliveryFee()).toBeNull();
    component.submitOrder();
    flushQuote({ deliveryFee: 0, deliveryFeeConfirmed: true });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.pricingReview()?.previous.deliveryFee).toBeNull();
    expect(component.pricingReview()?.quote.deliveryFeeConfirmed).toBe(true);
    expect(component.pricingReview()?.quote.deliveryFee).toBe(0);
    component.cancelPricingReview();
    expect(component.pricingReview()).toBeNull();
    expect(cart.itemCount()).toBe(2);
  });

  it('requires explicit consent to changed specifications at an unchanged price and renders the cached facts before purchase', async () => {
    const fixture = TestBed.createComponent(CartPageComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
    component.deliveryForm.patchValue({
      fullName: 'عميل الاختبار',
      whatsappNumber: '01012345678',
      governorate: 'القاهرة',
      city: 'القاهرة',
      address: 'عنوان اختبار واضح، عمارة 12',
    });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.cart-item summary')?.textContent).toContain(
      'مواصفات القطعة في السلة',
    );
    expect(element.querySelector('.cart-item app-order-item-configuration')?.textContent).toContain(
      '12 سم',
    );
    const current = {
      ...product,
      name: 'منظم بتفاصيل محدثة',
      image: '/updated.png',
      size: '20',
      configurationFingerprint: 'd'.repeat(64),
    };
    component.submitOrder();
    flushQuote({ items: [quotedItem(current)] });
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    const line = component.pricingReview()?.items[0];
    expect(line?.priceChanged).toBe(false);
    expect(line?.configurationChanged).toBe(true);
    expect(line?.nameChanged).toBe(true);
    expect(line?.imageChanged).toBe(true);
    expect(element.querySelector('.quote-review-item table')?.textContent).toContain('12 سم');
    expect(element.querySelector('.quote-review-item table')?.textContent).toContain(
      '20 (الوحدة غير مذكورة)',
    );
    const productLink = element.querySelector<HTMLAnchorElement>('.quote-review-item a');
    expect(productLink?.getAttribute('href')).toBe(`/products/${product.slug}`);
    expect(productLink?.target).toBe('_blank');
    expect(productLink?.rel).toContain('noopener');
    component.confirmPricingReview();
    const request = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(request.request.body.expectedQuoteVersion).toBe(CheckoutQuoteVersion.Current);
    expect(component.pricingReview()?.items[0].name).toBe(current.name);
    request.error(new ProgressEvent('reviewed submission outcome unknown'));
  });

  it('requires review for legacy missing fingerprints and for design changes with identical visible specifications', () => {
    cart.clearCart();
    cart.addItem({ ...product, configurationFingerprint: null }, 2);
    component.submitOrder();
    flushQuote({ items: [quotedItem(product)] });
    expect(component.pricingReview()?.items[0].configurationUnverified).toBe(true);
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    component.cancelPricingReview();
    cart.clearCart();
    cart.addItem(product, 2);
    component.submitOrder();
    flushQuote({ items: [quotedItem({ ...product, configurationFingerprint: 'd'.repeat(64) })] });
    expect(component.pricingReview()?.items[0].designChanged).toBe(true);
    expect(component.pricingReview()?.items[0].configurationChanges).toEqual([]);
    expect(component.pricingReview()?.items[0].productLink).toEqual(['/products', product.slug]);
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(orders.hasPendingSubmission()).toBe(false);
  });

  it('invalidates late quotes and open reviews when same-ID same-quantity cart specifications change', () => {
    component.submitOrder();
    cart.clearCart();
    const changed = { ...product, color: 'أزرق', configurationFingerprint: 'd'.repeat(64) };
    cart.addItem(changed, 2);
    flushQuote({ items: [quotedItem(product)] });
    expect(component.pricingReview()).toBeNull();
    expect(component.submitError()).toContain('تغيّرت السلة أو بيانات التوصيل');
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    component.submitOrder();
    flushQuote({ items: [quotedItem(product)] });
    expect(component.pricingReview()).not.toBeNull();
    cart.clearCart();
    cart.addItem({ ...changed, safetyNote: 'ملاحظة استخدام محدثة' }, 2);
    component.confirmPricingReview();
    expect(component.pricingReview()).toBeNull();
    expect(cart.items()[0].product.safetyNote).toBe('ملاحظة استخدام محدثة');
    expect(orders.hasPendingSubmission()).toBe(false);
    http.expectNone(`${environment.apiBaseUrl}/orders`);
  });

  it('retains newer cart specifications when the original purchase receipt arrives after submission', () => {
    submitWithQuote();
    const request = http.expectOne(`${environment.apiBaseUrl}/orders`);
    cart.clearCart();
    cart.addItem({ ...product, size: '22 cm', configurationFingerprint: 'd'.repeat(64) }, 2);
    request.flush({
      success: true,
      data: {
        id: 'configuration-receipt',
        orderNumber: 'OTK-CONFIGURATION',
        items: [quotedItem(product)],
        customer: request.request.body.customer,
        subtotal: 500,
        total: 500,
        deliveryFee: 0,
        deliveryFeeConfirmed: false,
        status: OrderStatus.PENDING,
        createdAt: '2026-09-17T03:00:00Z',
      },
    });
    expect(component.receiptRetainsCheckout()).toBe(true);
    expect(cart.itemCount()).toBe(2);
    expect(cart.items()[0].product.size).toBe('22 cm');
    expect(component.receipt()?.items[0].configuration?.size).toBe('12 cm');
    expect(component.showReceipt()).toBe(true);
  });

  it('maps invalid saved configuration to the affected row while preserving the cart and delivery form', () => {
    component.submitOrder();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/quote`)
      .flush(
        { success: false, errors: { 'items[0].configuration': ['Invalid saved configuration'] } },
        { status: 422, statusText: 'Unprocessable' },
      );
    expect(component.itemViews()[0].error).toContain('مواصفات');
    expect(component.itemViews()[0].error).not.toContain('غير متاح حاليًا');
    expect(cart.itemCount()).toBe(2);
    expect(component.deliveryForm.controls.address.value).toContain('عمارة 12');
    expect(orders.hasPendingSubmission()).toBe(false);
    http.expectNone(`${environment.apiBaseUrl}/orders`);
  });

  it('keeps unchanged fractional prices exact across quantities and multiple cart lines', () => {
    cart.clearCart();
    cart.addItem({ ...product, price: 0.1 }, 3);
    cart.addItem({ ...product, id: 'second-product', slug: 'second-product', price: 0.2 }, 2);
    expect(cart.subtotal()).toBe(0.7);
    expect(component.itemViews().map((item) => item.lineTotal)).toEqual([0.3, 0.4]);
    submitWithQuote();
    expect(component.pricingReview()).toBeNull();
    const submitted = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(submitted.request.body.items).toEqual([
      { productId: product.id, quantity: 3 },
      { productId: 'second-product', quantity: 2 },
    ]);
    submitted.error(new ProgressEvent('deliberate unknown outcome'));
  });

  it('fetches another quote after a definite first quote conflict but never posts it without a new confirmation', () => {
    component.submitOrder();
    flushQuote({ items: [quotedItem({ ...product, price: 300 })], subtotal: 600, total: 600 });
    expect(component.pricingReview()?.items[0].unitPrice).toBe(300);
    component.confirmPricingReview();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      {
        success: false,
        errors: { checkoutQuote: ['Changed before insertion'] },
      },
      { status: 409, statusText: 'Quote conflict' },
    );
    flushQuote({
      quoteFingerprint: 'b'.repeat(64),
      items: [quotedItem({ ...product, price: 320 })],
      subtotal: 640,
      total: 640,
    });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.pricingReview()?.quote.quoteFingerprint).toBe('b'.repeat(64));
    expect(component.pricingReview()?.items[0].previousUnitPrice).toBe(250);
    expect(component.pricingReview()?.items[0].unitPrice).toBe(320);
    expect(component.submitError()).toBe('');
    component.confirmPricingReview();
    const confirmed = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(confirmed.request.body.expectedQuoteFingerprint).toBe('b'.repeat(64));
    expect(confirmed.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    confirmed.error(new ProgressEvent('unknown revised outcome'));
  });

  it('marks the unavailable submitted product and retains valid delivery fields without creating an attempt', () => {
    const initialForm = component.deliveryForm.getRawValue();
    component.submitOrder();
    http.expectOne(`${environment.apiBaseUrl}/orders/quote`).flush(
      {
        success: false,
        errors: { 'items[0].productId': ['Product not found or unavailable.'] },
      },
      { status: 422, statusText: 'Unavailable' },
    );
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.itemViews()[0].error).toContain('هذا المنتج غير متاح');
    expect(component.submitError()).toContain('التنبيه بجوار كل قطعة');
    expect(component.submitError()).not.toContain('صحح الحقول');
    expect(component.deliveryForm.getRawValue()).toEqual(initialForm);
    expect(orders.hasPendingSubmission()).toBe(false);
    expect(cart.itemCount()).toBe(2);
    component.removeItem(product.id);
    expect(cart.itemCount()).toBe(0);
  });

  it('does not reprice or unlock an uncertain attempt when its exact retry gets a later 422', () => {
    submitWithQuote();
    const first = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const body = first.request.body;
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('original insertion may still be running'));
    component.retryPreviousOrder();
    const retry = http.expectOne(`${environment.apiBaseUrl}/orders`);
    retry.flush(
      { success: false, errors: { expectedQuoteFingerprint: ['Legacy missing quote'] } },
      { status: 422, statusText: 'Rejected retry' },
    );
    http.expectNone(`${environment.apiBaseUrl}/orders/quote`);
    expect(component.canRetryPendingSubmission()).toBe(true);
    expect(component.submitError()).toContain('نتيجة المحاولة السابقة لم تتأكد');
    expect(component.pricingReview()).toBeNull();
    component.retryPreviousOrder();
    const exact = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(exact.request.body).toEqual(body);
    expect(exact.request.headers.get('Idempotency-Key')).toBe(key);
    exact.error(new ProgressEvent('still unknown'));
  });

  it('requires a fresh explicit quote review after terminal recovery of an aborted quoted attempt and reload', () => {
    submitWithQuote();
    const original = http.expectOne(`${environment.apiBaseUrl}/orders`);
    const originalKey = original.request.headers.get('Idempotency-Key');
    const originalBody = original.request.body;
    original.error(new ProgressEvent('blocked before API delivery'));
    component.retryPreviousOrder();
    const recovery = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(recovery.request.body).toEqual(originalBody);
    recovery.flush(
      {
        success: false,
        errors: {
          checkoutNotRecorded: ['Saved quote no longer matches; attempt durably rejected'],
        },
      },
      { status: 409, statusText: 'Not recorded' },
    );
    expect(component.requiresFreshQuoteReview()).toBe(true);
    expect(component.pricingReview()).toBeNull();
    http.expectNone(`${environment.apiBaseUrl}/orders/quote`);
    component = TestBed.runInInjectionContext(() => new CartPageComponent());
    component.ngOnInit();
    expect(component.requiresFreshQuoteReview()).toBe(true);
    component.submitOrder();
    flushQuote({
      quoteFingerprint: 'b'.repeat(64),
      items: [
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: '',
          quantity: 2,
          unitPrice: 300,
          discountPrice: null,
          lineTotal: 600,
          configuration: configurationFor(product),
          configurationFingerprint: 'c'.repeat(64),
        },
      ],
      subtotal: 600,
      total: 600,
    });
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.pricingReview()?.introduction).toContain('المحاولة السابقة لم تُسجّل');
    component.confirmPricingReview();
    const reviewed = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(reviewed.request.headers.get('Idempotency-Key')).not.toBe(originalKey);
    expect(reviewed.request.body.expectedQuoteFingerprint).toBe('b'.repeat(64));
    reviewed.error(new ProgressEvent('new reviewed request outcome unknown'));
  });

  it('does not submit a late quote after delivery edits and fails closed on quote network errors', () => {
    component.submitOrder();
    component.deliveryForm.controls.address.setValue('تعديل العنوان أثناء المراجعة، عمارة 3');
    flushQuote();
    http.expectNone(`${environment.apiBaseUrl}/orders`);
    expect(component.submitError()).toContain('تغيّرت السلة أو بيانات التوصيل');
    expect(component.pricingReview()).toBeNull();
    component.submitOrder();
    http
      .expectOne(`${environment.apiBaseUrl}/orders/quote`)
      .error(new ProgressEvent('quote failed'));
    expect(component.submitError()).toContain('لم نسجّل طلبًا جديدًا');
    expect(component.checkoutBusy()).toBe(false);
    expect(orders.hasPendingSubmission()).toBe(false);
    expect(component.deliveryForm.controls.address.value).toContain('تعديل العنوان');
  });

  it('fills empty pristine checkout fields when the session arrives after the cart renders', () => {
    component.deliveryForm.patchValue({ fullName: '', email: 'saved-draft@example.test' });
    restoreCustomer();
    expect(component.deliveryForm.controls.fullName.value).toBe('عميل مسجل');
    expect(component.deliveryForm.controls.email.value).toBe('saved-draft@example.test');
  });

  it('preserves fields a customer edited or deliberately cleared while the session was loading', () => {
    component.deliveryForm.patchValue({ fullName: 'اسم كتبه العميل', email: '' });
    component.deliveryForm.controls.fullName.markAsDirty();
    component.deliveryForm.controls.email.markAsDirty();
    restoreCustomer();
    expect(component.deliveryForm.controls.fullName.value).toBe('اسم كتبه العميل');
    expect(component.deliveryForm.controls.email.value).toBe('');
  });

  function restoreCustomer(): void {
    TestBed.inject(TokenStorageService).saveAccessToken('local-unit-session');
    TestBed.inject(AuthService).loadCurrentUser().subscribe();
    http.expectOne(`${environment.apiBaseUrl}/auth/me`).flush({
      success: true,
      data: {
        id: 'customer-1',
        fullName: 'عميل مسجل',
        email: 'customer@example.test',
        role: UserRole.CUSTOMER,
        createdAt: '2026-09-17T00:00:00.000Z',
      },
    });
    TestBed.tick();
  }

  function submitWithQuote(): void {
    const recovering = component.canRetryPendingSubmission();
    component.submitOrder();
    if (recovering || component.deliveryForm.invalid) {
      http.expectNone(`${environment.apiBaseUrl}/orders/quote`);
      return;
    }
    flushQuote();
  }

  function flushQuote(patch: Partial<CheckoutQuote> = {}): void {
    const request = http.expectOne(`${environment.apiBaseUrl}/orders/quote`);
    const items = component.itemViews().map((view) => ({
      productId: view.id,
      slug: view.item.product.slug,
      name: view.item.product.name,
      image: view.item.product.image,
      quantity: view.item.quantity,
      unitPrice: view.item.product.price,
      discountPrice: view.item.product.discountPrice ?? null,
      lineTotal: view.lineTotal,
      configuration: configurationFor(view.item.product),
      configurationFingerprint: view.item.product.configurationFingerprint || 'c'.repeat(64),
    }));
    const quote: CheckoutQuote = {
      quoteVersion: CheckoutQuoteVersion.Current,
      quoteFingerprint: 'a'.repeat(64),
      currency: 'EGP',
      items,
      subtotal: component.subtotal(),
      discount: 0,
      deliveryFee: component.deliveryFee() ?? 0,
      deliveryFeeConfirmed: component.deliveryFee() !== null,
      total: component.totalEstimate(),
      estimatedDeliveryDays: '',
      ...patch,
    };
    expect(request.request.body).toEqual({
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
    request.flush({ success: true, message: 'Current quote', data: quote });
  }

  function configurationFor(value: Product): ProductConfiguration {
    const configuration = productConfiguration(value);
    if (!configuration) throw new Error('The cart test requires valid product specifications.');
    return configuration;
  }

  function quotedItem(value: Product): CheckoutQuoteItem {
    return {
      productId: value.id,
      slug: value.slug,
      name: value.name,
      image: value.image,
      quantity: 2,
      unitPrice: value.price,
      discountPrice: value.discountPrice ?? null,
      lineTotal: value.price * 2,
      configuration: configurationFor(value),
      configurationFingerprint: value.configurationFingerprint || 'c'.repeat(64),
    };
  }
});
