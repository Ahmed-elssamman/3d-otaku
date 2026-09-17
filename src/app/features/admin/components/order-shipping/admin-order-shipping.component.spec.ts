import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { environment } from '../../../../../environments/environment';
import { AdminOperationKind, AdminOperationStatus } from '../../enums/admin-operation.enum';
import { AdminOrderRecord } from '../../models/admin-operation.model';
import {
  AdminOrderShippingHistory,
  AdminOrderShippingSnapshot,
} from '../../models/admin-order-shipping.model';
import { AdminOperationsPageComponent } from '../../pages/operations/admin-operations-page.component';
import { AdminOrderShippingComponent } from './admin-order-shipping.component';

function shippingSnapshot(): AdminOrderShippingSnapshot {
  return {
    orderId: 'order-shipping-unit',
    status: AdminOperationStatus.Pending,
    shippingRevision: 0,
    canConfirmShipping: true,
    deliveryFee: 0,
    deliveryFeeConfirmed: false,
    subtotal: 250.25,
    discount: 10.25,
    total: 240,
    history: [],
  };
}

function savedShipping(fee: number, revision: number, note = ''): AdminOrderShippingSnapshot {
  const original = shippingSnapshot();
  const history: AdminOrderShippingHistory = {
    revision,
    previousDeliveryFee: 0,
    previousDeliveryFeeConfirmed: false,
    deliveryFee: fee,
    previousTotal: 240,
    total: 240 + fee,
    customerAgreementConfirmed: true,
    createdAt: '2026-09-17T01:00:00Z',
    actorId: 'private-admin-identifier',
    note,
  };
  return {
    ...original,
    shippingRevision: revision,
    deliveryFee: fee,
    deliveryFeeConfirmed: true,
    total: history.total,
    history: [history],
  };
}

function serverOrder(shipping = shippingSnapshot()): AdminOrderRecord {
  return {
    id: shipping.orderId,
    orderNumber: 'OTK-SHIPPING-UNIT',
    customer: { fullName: 'عميل الاختبار', phone: '+201012345678', address: 'عنوان الاختبار' },
    items: [],
    subtotal: shipping.subtotal,
    discount: shipping.discount,
    deliveryFee: shipping.deliveryFee,
    deliveryFeeConfirmed: shipping.deliveryFeeConfirmed,
    total: shipping.total,
    currency: 'EGP',
    status: shipping.status,
    allowedNextStatuses: [AdminOperationStatus.Processing, AdminOperationStatus.Cancelled],
    statusHistory: [{ status: AdminOperationStatus.Pending, createdAt: '2026-09-17T00:00:00Z' }],
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T01:00:00Z',
    shippingRevision: shipping.shippingRevision,
    canConfirmShipping: shipping.canConfirmShipping,
    shippingHistory: shipping.history,
    paymentRevision: 0,
    paymentHistory: [],
    paymentSummary: {
      state: PaymentSummaryState.NoRecords,
      recordedCollected: 0,
      recordedRefunded: 0,
      recordedNet: 0,
      balanceDue: null,
      credit: null,
      shippingConfirmed: shipping.deliveryFeeConfirmed,
    },
  };
}

describe('Admin agreed shipping editor', () => {
  let fixture: ComponentFixture<AdminOrderShippingComponent>;
  let component: AdminOrderShippingComponent;
  let http: HttpTestingController;
  const detailUrl = `${environment.apiBaseUrl}/admin/orders/order-shipping-unit`;
  const shippingUrl = `${detailUrl}/shipping`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminOrderShippingComponent, AdminOperationsPageComponent],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { operationKind: AdminOperationKind.Orders } } },
        },
      ],
    });
    fixture = TestBed.createComponent(AdminOrderShippingComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('order', shippingSnapshot());
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function reviewFee(fee: number, note = ''): void {
    component.form.controls.deliveryFee.setValue(fee);
    component.form.controls.note.setValue(note);
    component.form.controls.agreement.setValue(true);
    component.requestReview();
  }

  it('requires an explicit valid fee and fresh agreement, accepting zero but rejecting unsupported decimal precision', async () => {
    expect(component.form.controls.deliveryFee.value).toBeNull();
    expect(component.isDirty()).toBe(false);
    for (const fee of [-1, 10000000.01, 1.001, 1.000000001, Infinity, NaN]) {
      reviewFee(fee);
      expect(component.canReview()).toBe(false);
      expect(component.review()).toBeNull();
    }
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('بحد أقصى منزلتين عشريتين');
    reviewFee(0);
    await fixture.whenStable();
    expect(component.review()?.total).toBe(240);
    expect(component.canConfirm()).toBe(true);
    component.form.controls.note.setValue('تم الاتفاق على توصيل مجاني');
    expect(component.form.controls.agreement.value).toBe(false);
    expect(component.review()).toBeNull();
    expect(component.canConfirm()).toBe(false);
    http.expectNone(shippingUrl);
  });

  it('submits only the reviewed snapshot with an idempotency key and renders private shipping history separately', async () => {
    reviewFee(49.75, '  اتفاق موثّق  ');
    expect(component.review()?.total).toBe(289.75);
    component.saveShipping();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const request = http.expectOne(shippingUrl);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9-]{16,128}$/);
    expect(request.request.body).toEqual({
      expectedShippingRevision: 0,
      expectedStatus: AdminOperationStatus.Pending,
      deliveryFee: 49.75,
      customerAgreementConfirmed: true,
      note: 'اتفاق موثّق',
    });
    request.flush({
      success: true,
      message: 'Saved',
      data: serverOrder(savedShipping(49.75, 1, 'اتفاق موثّق')),
    });
    await fixture.whenStable();
    expect(component.isBusy()).toBe(false);
    expect(component.isDirty()).toBe(false);
    expect(component.snapshot()?.total).toBe(289.75);
    expect(fixture.nativeElement.textContent).toContain('تم حفظ رسوم الشحن');
    expect(fixture.nativeElement.textContent).toContain('سجل تغييرات الشحن — للإدارة فقط');
    expect(fixture.nativeElement.textContent).toContain('اتفاق موثّق');
    expect(fixture.nativeElement.textContent).not.toContain('private-admin-identifier');
    expect(component.canReview()).toBe(false);
  });

  it('keeps a conflicting draft and requires an explicit read plus new agreement before saving the latest revision', async () => {
    reviewFee(65.25, 'ملاحظة محفوظة');
    component.saveShipping();
    const first = http.expectOne(shippingUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(
      { success: false, errors: { shippingConflict: ['stale'] } },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(component.isStale()).toBe(true);
    expect(component.form.getRawValue()).toEqual({
      deliveryFee: 65.25,
      note: 'ملاحظة محفوظة',
      agreement: false,
    });
    expect(fixture.nativeElement.textContent).toContain('مسودتك محفوظة');
    reviewFee(65.25, 'ملاحظة محفوظة');
    component.saveShipping();
    http.expectNone(shippingUrl);
    component.reloadOrder();
    http
      .expectOne(detailUrl)
      .flush({ success: true, message: 'Latest', data: serverOrder(savedShipping(40, 2)) });
    await fixture.whenStable();
    expect(component.snapshot()?.shippingRevision).toBe(2);
    expect(component.form.getRawValue()).toEqual({
      deliveryFee: 65.25,
      note: 'ملاحظة محفوظة',
      agreement: false,
    });
    expect(component.canReview()).toBe(false);
    component.form.controls.agreement.setValue(true);
    component.requestReview();
    component.saveShipping();
    const retry = http.expectOne(shippingUrl);
    expect(retry.request.body.expectedShippingRevision).toBe(2);
    expect(retry.request.headers.get('Idempotency-Key')).not.toBe(key);
    retry.flush({
      success: true,
      message: 'Saved',
      data: serverOrder(savedShipping(65.25, 3, 'ملاحظة محفوظة')),
    });
    await fixture.whenStable();
    expect(component.snapshot()?.total).toBe(305.25);
  });

  it('recognizes a committed zero fee after a lost response using a read only and does not duplicate the write', async () => {
    fixture.componentRef.setInput('order', savedShipping(49.75, 1));
    await fixture.whenStable();
    reviewFee(0, 'توصيل مجاني');
    component.saveShipping();
    http.expectOne(shippingUrl).error(new ProgressEvent('lost response'));
    await fixture.whenStable();
    expect(component.isStale()).toBe(true);
    expect(component.form.controls.deliveryFee.value).toBe(0);
    component.reloadOrder();
    const reload = http.expectOne(detailUrl);
    expect(reload.request.method).toBe('GET');
    reload.flush({
      success: true,
      message: 'Latest',
      data: serverOrder(savedShipping(0, 2, 'توصيل مجاني')),
    });
    await fixture.whenStable();
    expect(component.form.getRawValue()).toEqual({
      deliveryFee: 0,
      note: 'توصيل مجاني',
      agreement: false,
    });
    expect(component.isDirty()).toBe(false);
    expect(component.canReview()).toBe(false);
    expect(component.snapshot()?.history).toHaveLength(1);
    expect(component.agreementError()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain(
      'يلزم تأكيد الاتفاق مع العميل قبل الحفظ',
    );
    component.requestReview();
    component.saveShipping();
    http.expectNone(shippingUrl);
  });

  it('keeps the same request key after an uncommitted response loss followed by an explicit unchanged reload', async () => {
    reviewFee(49.75);
    component.saveShipping();
    const first = http.expectOne(shippingUrl);
    const key = first.request.headers.get('Idempotency-Key');
    const body = first.request.body;
    first.error(new ProgressEvent('unreachable'));
    component.reloadOrder();
    http.expectOne(detailUrl).flush({ success: true, message: 'Latest', data: serverOrder() });
    await fixture.whenStable();
    component.form.controls.agreement.setValue(true);
    component.requestReview();
    component.saveShipping();
    const retry = http.expectOne(shippingUrl);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(body);
    retry.flush({ success: true, message: 'Saved', data: serverOrder(savedShipping(49.75, 1)) });
    await fixture.whenStable();
    expect(component.isStale()).toBe(false);
  });

  it('preserves an invalidated draft and disables writes if a newer terminal snapshot arrives', async () => {
    reviewFee(65.25, 'مسودة');
    fixture.componentRef.setInput('order', {
      ...savedShipping(40, 2),
      status: AdminOperationStatus.Cancelled,
      canConfirmShipping: false,
    });
    await fixture.whenStable();
    expect(component.form.getRawValue()).toEqual({
      deliveryFee: 65.25,
      note: 'مسودة',
      agreement: false,
    });
    expect(component.review()).toBeNull();
    expect(component.canConfirm()).toBe(false);
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    component.saveShipping();
    http.expectNone(shippingUrl);
  });

  it('keeps a failed reload blocked with the draft intact and no automatic retry', async () => {
    reviewFee(65.25, 'مسودة');
    component.reloadOrder();
    http.expectOne(detailUrl).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    expect(component.isBusy()).toBe(false);
    expect(component.isStale()).toBe(true);
    expect(component.form.getRawValue()).toEqual({
      deliveryFee: 65.25,
      note: 'مسودة',
      agreement: false,
    });
    expect(fixture.nativeElement.textContent).toContain('الحفظ متوقف');
    http.expectNone(detailUrl);
    http.expectNone(shippingUrl);
  });

  it('ignores an old order save and its finalizer while another order save is pending', async () => {
    reviewFee(49.75);
    component.saveShipping();
    const oldSave = http.expectOne(shippingUrl);
    const nextOrder = { ...shippingSnapshot(), orderId: 'another-order' };
    fixture.componentRef.setInput('order', nextOrder);
    await fixture.whenStable();
    reviewFee(65.25);
    component.saveShipping();
    const newSave = http.expectOne(`${environment.apiBaseUrl}/admin/orders/another-order/shipping`);
    oldSave.flush({
      success: true,
      message: 'Old response',
      data: serverOrder(savedShipping(49.75, 1)),
    });
    await fixture.whenStable();
    expect(component.isSaving()).toBe(true);
    expect(component.isStale()).toBe(false);
    expect(component.snapshot()?.orderId).toBe('another-order');
    newSave.flush({
      success: true,
      message: 'Saved',
      data: serverOrder({ ...savedShipping(65.25, 1), orderId: 'another-order' }),
    });
    await fixture.whenStable();
    expect(component.isBusy()).toBe(false);
    expect(component.snapshot()?.deliveryFee).toBe(65.25);
  });

  it('ignores an old reload error and finalizer while the new order reload is pending', async () => {
    component.reloadOrder();
    const oldRead = http.expectOne(detailUrl);
    fixture.componentRef.setInput('order', { ...shippingSnapshot(), orderId: 'another-order' });
    await fixture.whenStable();
    component.reloadOrder();
    const newRead = http.expectOne(`${environment.apiBaseUrl}/admin/orders/another-order`);
    oldRead.error(new ProgressEvent('old request failed'));
    await fixture.whenStable();
    expect(component.isReloading()).toBe(true);
    expect(component.error()).toBe('');
    newRead.flush({
      success: true,
      message: 'Latest',
      data: serverOrder({ ...shippingSnapshot(), orderId: 'another-order' }),
    });
    await fixture.whenStable();
    expect(component.isBusy()).toBe(false);
    expect(component.isStale()).toBe(false);
  });

  it('blocks parent navigation and status updates for shipping drafts or writes, and blocks shipping after a stale status response', async () => {
    const parentFixture = TestBed.createComponent(AdminOperationsPageComponent);
    const parent = parentFixture.componentInstance;
    const listUrl = `${environment.apiBaseUrl}/admin/orders`;
    http
      .expectOne((request) => request.url === listUrl)
      .flush({
        success: true,
        message: 'List',
        data: [serverOrder()],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    parent.openDetail('order-shipping-unit');
    http.expectOne(detailUrl).flush({ success: true, message: 'Detail', data: serverOrder() });
    parentFixture.detectChanges();
    await parentFixture.whenStable();
    parent.nextStatusControl.setValue(AdminOperationStatus.Processing);
    parent.requestConfirmation();
    expect(parent.confirmRequested()).toBe(true);
    parent.shippingDraftChanged(true);
    parent.closeDetail();
    parent.openDetail('another-order');
    parent.saveStatus();
    expect(parent.selectedId()).toBe('order-shipping-unit');
    expect(parent.confirmRequested()).toBe(false);
    expect(parent.canSave()).toBe(false);
    http.expectNone(`${detailUrl}/status`);
    parent.shippingDraftChanged(false);
    parent.shippingBusyChanged(true);
    parent.closeDetail();
    expect(parent.selectedId()).toBe('order-shipping-unit');
    parent.shippingBusyChanged(false);
    parent.requestConfirmation();
    parent.saveStatus();
    http
      .expectOne(`${detailUrl}/status`)
      .flush(
        { success: false, errors: { status: ['stale'] } },
        { status: 409, statusText: 'Conflict' },
      );
    await parentFixture.whenStable();
    expect(parent.shippingDisabled()).toBe(true);
    expect(
      parentFixture.nativeElement.querySelector('app-admin-order-shipping fieldset').disabled,
    ).toBe(true);
    parent.retryDetail();
    http.expectOne(detailUrl).flush({ success: true, message: 'Latest', data: serverOrder() });
    await parentFixture.whenStable();
    expect(parent.shippingDisabled()).toBe(false);
  });
});
