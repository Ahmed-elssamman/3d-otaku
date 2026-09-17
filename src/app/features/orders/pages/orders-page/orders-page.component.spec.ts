import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { OrderStatus } from '@core/enums/order-status.enum';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { OrderApiRecord } from '@core/models/order.model';
import { environment } from '../../../../../environments/environment';
import { OrdersPageComponent } from './orders-page.component';

describe('Account order payment details', () => {
  it('renders the current public summary after expanding an order without exposing private evidence', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const order: OrderApiRecord = {
      id: 'account-order-1',
      orderNumber: 'OTK-ACCOUNT-PAYMENT',
      items: [],
      customer: { fullName: 'عميل الاختبار', phone: '+201012345678', address: 'عنوان الاختبار' },
      subtotal: 250,
      total: 275.5,
      deliveryFee: 25.5,
      deliveryFeeConfirmed: true,
      status: OrderStatus.CONFIRMED,
      createdAt: '2026-09-17T00:00:00Z',
      paymentSummary: {
        state: PaymentSummaryState.RecordedBalance,
        recordedCollected: 150,
        recordedRefunded: 0,
        recordedNet: 150,
        balanceDue: 125.5,
        credit: 0,
        shippingConfirmed: true,
      },
    };
    const fixture = TestBed.createComponent(OrdersPageComponent);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/orders`)
      .flush({
        success: true,
        data: [
          {
            ...order,
            paymentSummary: { ...order.paymentSummary, reference: 'private-transfer-reference' },
            paymentEvents: [{ note: 'private-ledger-note' }],
          },
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
    fixture.componentInstance.showOrderDetails('account-order-1');
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('المتبقي حسب السجل');
    expect(element.textContent).toContain('125.5 ج.م');
    expect(element.textContent).toContain('150 ج.م');
    expect(element.textContent).not.toContain('private-transfer-reference');
    expect(element.textContent).not.toContain('private-ledger-note');
    expect(element.textContent).not.toContain('مدفوع بالكامل');
    http.verify();
  });

  it('recovers an out-of-range account page to page one and preserves the existing order', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ page: '999' }) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OrdersPageComponent);
    fixture.detectChanges();
    http
      .expectOne(
        (request) =>
          request.url === `${environment.apiBaseUrl}/orders` &&
          request.params.get('page') === '999',
      )
      .flush({
        success: true,
        data: [],
        meta: {
          page: 999,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      });
    expect(fixture.componentInstance.isLoading()).toBe(true);
    http
      .expectOne(
        (request) =>
          request.url === `${environment.apiBaseUrl}/orders` && request.params.get('page') === '1',
      )
      .flush({
        success: true,
        data: [
          {
            id: 'existing-account-order',
            orderNumber: 'OTK-EXISTING',
            items: [],
            customer: { fullName: 'عميل', phone: '+201012345678', address: 'عنوان' },
            subtotal: 100,
            total: 100,
            status: OrderStatus.PENDING,
            createdAt: '2026-09-17T05:00:00Z',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('OTK-EXISTING');
    expect(fixture.nativeElement.textContent).not.toContain('أول قطعة لسه مستنياك');
    expect(fixture.componentInstance.meta().page).toBe(1);
    expect(navigation).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: 1 }, replaceUrl: true }),
    );
    http.verify();
  });

  it('keeps a failed first-page recovery retryable and does not claim the account is empty', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ page: '999' }) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OrdersPageComponent);
    fixture.detectChanges();
    http
      .expectOne((request) => request.params.get('page') === '999')
      .flush({
        success: true,
        data: [],
        meta: {
          page: 999,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      });
    http
      .expectOne((request) => request.params.get('page') === '1')
      .error(new ProgressEvent('temporary account read failure'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('مش قادرين نحمل الطلبات دلوقتي');
    expect(fixture.nativeElement.textContent).not.toContain('أول قطعة لسه مستنياك');
    fixture.componentInstance.loadOrders();
    http
      .expectOne((request) => request.params.get('page') === '1')
      .flush({
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('أول قطعة لسه مستنياك');
    http.verify();
  });
});
