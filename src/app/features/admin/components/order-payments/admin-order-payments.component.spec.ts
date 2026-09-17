import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { environment } from '../../../../../environments/environment';
import { AdminOperationKind, AdminOperationStatus } from '../../enums/admin-operation.enum';
import {
  PaymentAttemptOutcome,
  PaymentEditorMode,
  PaymentEntryKind,
  PaymentEntryMethod,
} from '../../enums/order-payment.enum';
import { AdminOrderRecord } from '../../models/admin-operation.model';
import { AdminPaymentEntry, AdminPaymentSnapshot } from '../../models/admin-order-payment.model';
import { AdminOperationsPageComponent } from '../../pages/operations/admin-operations-page.component';
import { AdminOrderPaymentsComponent } from './admin-order-payments.component';
import { PAYMENT_STORAGE_PREFIX, parsePaymentAttempt } from './admin-order-payments.control';

function paymentEntry(amount = 75.25, revision = 1, id = 'entry-1'): AdminPaymentEntry {
  return {
    id,
    revision,
    kind: PaymentEntryKind.Collection,
    amount,
    method: PaymentEntryMethod.BankTransfer,
    reference: 'BANK-LOCAL-1',
    note: 'ملاحظة خاصة',
    transactionCompletedConfirmed: true,
    correctionConfirmed: false,
    noMoneyMovedConfirmed: false,
    correctionOfEntryId: null,
    isCorrected: false,
    createdAt: '2026-09-17T01:00:00Z',
    actorId: 'private-operator-id',
  };
}

function paymentSnapshot(): AdminPaymentSnapshot {
  return {
    orderId: 'payment-unit-order',
    paymentRevision: 0,
    shippingRevision: 0,
    status: AdminOperationStatus.Pending,
    total: 250,
    deliveryFeeConfirmed: false,
    summary: {
      state: PaymentSummaryState.NoRecords,
      recordedCollected: 0,
      recordedRefunded: 0,
      recordedNet: 0,
      balanceDue: null,
      credit: null,
      shippingConfirmed: false,
    },
    history: [],
  };
}

function collectedSnapshot(amount = 75.25, revision = 1): AdminPaymentSnapshot {
  return {
    ...paymentSnapshot(),
    paymentRevision: revision,
    history: [paymentEntry(amount, revision)],
    summary: {
      state: PaymentSummaryState.ShippingUnconfirmed,
      recordedCollected: amount,
      recordedRefunded: 0,
      recordedNet: amount,
      balanceDue: null,
      credit: null,
      shippingConfirmed: false,
    },
  };
}

function serverOrder(snapshot = paymentSnapshot()): AdminOrderRecord {
  return {
    id: snapshot.orderId,
    orderNumber: 'OTK-PAYMENT-UNIT',
    items: [],
    customer: { fullName: 'عميل اختبار', phone: '+201012345678', address: 'عنوان محلي' },
    subtotal: 250,
    deliveryFee: 0,
    deliveryFeeConfirmed: snapshot.deliveryFeeConfirmed,
    discount: 0,
    total: snapshot.total,
    currency: 'EGP',
    status: snapshot.status,
    allowedNextStatuses: [AdminOperationStatus.Processing, AdminOperationStatus.Cancelled],
    statusHistory: [{ status: AdminOperationStatus.Pending, createdAt: '2026-09-17T00:00:00Z' }],
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T01:00:00Z',
    shippingRevision: snapshot.shippingRevision,
    canConfirmShipping: true,
    shippingHistory: [],
    paymentRevision: snapshot.paymentRevision,
    paymentHistory: snapshot.history,
    paymentSummary: snapshot.summary,
  };
}

describe('Admin recorded payment workflow', () => {
  let fixture: ComponentFixture<AdminOrderPaymentsComponent>;
  let component: AdminOrderPaymentsComponent;
  let http: HttpTestingController;
  const orderUrl = `${environment.apiBaseUrl}/admin/orders/payment-unit-order`;
  const paymentUrl = `${orderUrl}/payments`;
  const recoveryUrl = `${paymentUrl}/attempt`;
  const storageKey = `${PAYMENT_STORAGE_PREFIX}payment-unit-order`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminOrderPaymentsComponent, AdminOperationsPageComponent],
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
    fixture = TestBed.createComponent(AdminOrderPaymentsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('order', paymentSnapshot());
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function prepare(
    amount = 75.25,
    kind = PaymentEntryKind.Collection,
    method = PaymentEntryMethod.BankTransfer,
    reference = 'BANK-LOCAL-1',
  ): void {
    component.form.controls.kind.setValue(kind);
    component.form.controls.amount.setValue(amount);
    component.form.controls.method.setValue(method);
    component.form.controls.reference.setValue(reference);
    component.form.controls.note.setValue('ملاحظة خاصة');
    component.form.controls.completed.setValue(true);
    component.requestReview();
  }

  it('requires a positive exact-decimal amount, method reference and completed-operation attestation', async () => {
    expect(component.form.controls.amount.value).toBeNull();
    expect(component.canReview()).toBe(false);
    for (const amount of [0, -1, 1.001, 1.000000001, 10000000.01]) {
      prepare(amount);
      expect(component.review()).toBeNull();
    }
    prepare(75.25, PaymentEntryKind.Collection, PaymentEntryMethod.BankTransfer, 'x');
    expect(component.canReview()).toBe(false);
    prepare(75.25, PaymentEntryKind.Collection, PaymentEntryMethod.Cash, '');
    expect(component.canSave()).toBe(true);
    component.form.controls.amount.setValue(75.26);
    expect(component.form.controls.completed.value).toBe(false);
    expect(component.review()).toBeNull();
    await fixture.whenStable();
    http.expectNone(paymentUrl);
  });

  it('posts only the reviewed context and records a private ledger without a fulfillment or shipping write', async () => {
    prepare();
    component.savePayment();
    const request = http.expectOne(paymentUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toMatch(/^[A-Za-z0-9-]{16,128}$/);
    expect(request.request.body).toEqual({
      expectedPaymentRevision: 0,
      expectedShippingRevision: 0,
      expectedStatus: AdminOperationStatus.Pending,
      expectedTotal: 250,
      expectedDeliveryFeeConfirmed: false,
      kind: PaymentEntryKind.Collection,
      amount: 75.25,
      method: PaymentEntryMethod.BankTransfer,
      transactionCompletedConfirmed: true,
      reference: 'BANK-LOCAL-1',
      note: 'ملاحظة خاصة',
    });
    expect(sessionStorage.getItem(storageKey)).toContain(
      request.request.headers.get('Idempotency-Key'),
    );
    request.flush(
      {
        success: true,
        message: 'Recorded',
        data: { order: serverOrder(collectedSnapshot()), entryId: 'entry-1', replayed: false },
      },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    expect(component.isDirty()).toBe(false);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-entry-id="entry-1"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('BANK-LOCAL-1');
    expect(fixture.nativeElement.textContent).not.toContain('private-operator-id');
    http.expectNone(`${orderUrl}/status`);
    http.expectNone(`${orderUrl}/shipping`);
  });

  it('restores an unresolved tab attempt and resolves a committed response loss using only its keyed GET', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('lost response'));
    fixture.destroy();
    fixture = TestBed.createComponent(AdminOrderPaymentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', collectedSnapshot());
    fixture.detectChanges();
    expect(component.isUncertain()).toBe(true);
    expect(component.canReview()).toBe(false);
    component.recoverAttempt();
    const recovery = http.expectOne(recoveryUrl);
    expect(recovery.request.headers.get('Idempotency-Key')).toBe(key);
    expect(recovery.request.urlWithParams).not.toContain(key);
    recovery.flush({
      success: true,
      message: 'Found',
      data: { order: serverOrder(collectedSnapshot()), recorded: true, entryId: 'entry-1' },
    });
    await fixture.whenStable();
    expect(component.attempt()).toBeNull();
    expect(component.snapshot()?.history).toHaveLength(1);
    expect(component.isDirty()).toBe(false);
    http.expectNone(paymentUrl);
  });

  it('retains uncertainty after a negative recovery and a later409, allowing only the exact original retry', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    const key = first.request.headers.get('Idempotency-Key');
    const body = first.request.body;
    first.error(new ProgressEvent('not delivered yet'));
    component.recoverAttempt();
    http.expectOne(recoveryUrl).flush({
      success: true,
      message: 'Not recorded',
      data: { order: serverOrder(), entryId: null, recorded: false },
    });
    await fixture.whenStable();
    expect(component.canRetry()).toBe(true);
    expect(component.fieldsDisabled()).toBe(true);
    expect(component.canDiscard()).toBe(false);
    component.form.controls.amount.setValue(99);
    component.requestReview();
    component.savePayment();
    http.expectNone(paymentUrl);
    component.retryAttempt();
    const retry = http.expectOne(paymentUrl);
    expect(retry.request.body).toEqual(body);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(
      { success: false, errors: { paymentConflict: ['stale'] } },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(component.attempt()?.outcome).toBe(PaymentAttemptOutcome.Uncertain);
    expect(component.canReview()).toBe(false);
    component.recoverAttempt();
    http.expectOne(recoveryUrl).flush({
      success: true,
      message: 'Found delayed write',
      data: { order: serverOrder(collectedSnapshot()), entryId: 'entry-1', recorded: true },
    });
    await fixture.whenStable();
    expect(component.attempt()).toBeNull();
    expect(component.snapshot()?.summary.recordedNet).toBe(75.25);
  });

  it('requires explicit recovery and fresh review after a definite initial conflict while retaining the draft', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(
      { success: false, errors: { paymentConflict: ['stale'] } },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(component.form.controls.amount.value).toBe(75.25);
    expect(component.canReview()).toBe(false);
    expect(component.form.controls.completed.value).toBe(false);
    component.recoverAttempt();
    http.expectOne(recoveryUrl).flush({
      success: true,
      message: 'Latest',
      data: { order: serverOrder(collectedSnapshot(10, 1)), entryId: null, recorded: false },
    });
    await fixture.whenStable();
    expect(component.form.controls.amount.value).toBe(75.25);
    expect(component.form.controls.completed.value).toBe(false);
    prepare(70.25);
    component.savePayment();
    const revised = http.expectOne(paymentUrl);
    expect(revised.request.body.expectedPaymentRevision).toBe(1);
    expect(revised.request.body.amount).toBe(70.25);
    expect(revised.request.headers.get('Idempotency-Key')).not.toBe(key);
    revised.flush({
      success: true,
      message: 'Saved',
      data: {
        order: serverOrder(collectedSnapshot(80.25, 2)),
        entryId: 'entry-2',
        replayed: false,
      },
    });
    await fixture.whenStable();
  });

  it.each([PaymentEditorMode.Transaction, PaymentEditorMode.Correction])(
    'releases a previously uncertain %s only after terminal proof and explicit recovery with fresh attestations',
    async (mode) => {
      const correction = mode === PaymentEditorMode.Correction;
      const endpoint = correction ? `${paymentUrl}/entry-1/correction` : paymentUrl;
      const initial = correction ? collectedSnapshot() : paymentSnapshot();
      fixture.componentRef.setInput('order', initial);
      await fixture.whenStable();
      if (correction) {
        component.startCorrection('entry-1');
        component.correctionForm.setValue({
          reason: 'خطأ إداري موثق',
          confirmed: true,
          noMoneyMoved: true,
        });
        component.requestReview();
      } else prepare();
      component.savePayment();
      const first = http.expectOne(endpoint);
      const key = first.request.headers.get('Idempotency-Key');
      const body = first.request.body;
      first.error(new ProgressEvent('uncertain original request'));
      const current: AdminPaymentSnapshot = correction
        ? { ...collectedSnapshot(), shippingRevision: 1 }
        : collectedSnapshot(10, 1);
      component.recoverAttempt();
      http.expectOne(recoveryUrl).flush({
        success: true,
        message: 'Latest records, attempt absent',
        data: { order: serverOrder(current), entryId: null, recorded: false },
      });
      await fixture.whenStable();
      expect(component.isUncertain()).toBe(true);
      expect(component.canReview()).toBe(false);
      component.retryAttempt();
      const retry = http.expectOne(endpoint);
      expect(retry.request.body).toEqual(body);
      expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
      retry.flush(
        {
          success: false,
          errors: { paymentNotRecorded: ['The bound attempt can no longer commit.'] },
        },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();
      expect(component.attempt()?.outcome).toBe(PaymentAttemptOutcome.Rejected);
      expect(component.canReview()).toBe(false);
      expect(component.canRetry()).toBe(false);
      expect(component.error()).toContain('لن تُسجّل لاحقًا بهذه البيانات');
      expect(component.error()).toContain('حركة أموال خارج المتجر');
      fixture.destroy();
      fixture = TestBed.createComponent(AdminOrderPaymentsComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('order', current);
      fixture.detectChanges();
      expect(component.isUncertain()).toBe(false);
      expect(component.canReview()).toBe(false);
      expect(component.message()).toContain('لم تُقبل محاولة التسجيل السابقة');
      component.recoverAttempt();
      http.expectOne(recoveryUrl).flush({
        success: true,
        message: 'Latest records',
        data: { order: serverOrder(current), entryId: null, recorded: false },
      });
      await fixture.whenStable();
      expect(component.canReview()).toBe(false);
      if (correction) {
        expect(component.correctionForm.controls.reason.value).toBe('خطأ إداري موثق');
        expect(component.correctionForm.controls.confirmed.value).toBe(false);
        expect(component.correctionForm.controls.noMoneyMoved.value).toBe(false);
        component.correctionForm.controls.confirmed.setValue(true);
        expect(component.canReview()).toBe(false);
        component.correctionForm.controls.noMoneyMoved.setValue(true);
      } else {
        expect(component.form.controls.amount.value).toBe(75.25);
        expect(component.form.controls.completed.value).toBe(false);
        component.form.controls.completed.setValue(true);
      }
      component.requestReview();
      component.savePayment();
      const fresh = http.expectOne(endpoint);
      expect(fresh.request.headers.get('Idempotency-Key')).not.toBe(key);
      expect(fresh.request.body.expectedPaymentRevision).toBe(current.paymentRevision);
      expect(fresh.request.body.expectedShippingRevision).toBe(current.shippingRevision);
      fresh.flush(
        { success: false, errors: { paymentConflict: ['Another concurrent change.'] } },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();
    },
  );

  it.each([
    { status: 500, reasons: ['not a terminal response'], requestErrors: [] },
    { status: 409, reasons: [], requestErrors: [] },
    { status: 409, reasons: [' '], requestErrors: [] },
    { status: 409, reasons: ['untrusted proof'], requestErrors: ['Different reserved body.'] },
  ])('keeps uncertainty for an invalid terminal response: %j', async (response) => {
    prepare();
    component.savePayment();
    http.expectOne(paymentUrl).error(new ProgressEvent('uncertain'));
    component.recoverAttempt();
    http.expectOne(recoveryUrl).flush({
      success: true,
      message: 'Not found',
      data: { order: serverOrder(), entryId: null, recorded: false },
    });
    component.retryAttempt();
    http.expectOne(paymentUrl).flush(
      {
        success: false,
        errors: { paymentNotRecorded: response.reasons, paymentRequest: response.requestErrors },
      },
      { status: response.status, statusText: 'Error' },
    );
    await fixture.whenStable();
    expect(component.isUncertain()).toBe(true);
    expect(component.canDiscard()).toBe(false);
    expect(component.canReview()).toBe(false);
  });

  it('caps a recorded refund at net funds and sends correction as a separate no-money-moved action', async () => {
    fixture.componentRef.setInput('order', collectedSnapshot());
    await fixture.whenStable();
    prepare(80, PaymentEntryKind.Refund, PaymentEntryMethod.Cash, '');
    expect(component.refundError()).toBe(true);
    expect(component.canSave()).toBe(false);
    component.discardDraft();
    component.startCorrection('entry-1');
    component.correctionForm.controls.reason.setValue('قيد إداري مكرر لم تحدث له حركة أموال');
    component.correctionForm.controls.confirmed.setValue(true);
    expect(component.canReview()).toBe(false);
    component.correctionForm.controls.noMoneyMoved.setValue(true);
    component.requestReview();
    component.savePayment();
    const correction = http.expectOne(`${paymentUrl}/entry-1/correction`);
    expect(correction.request.body).toEqual({
      expectedPaymentRevision: 1,
      expectedShippingRevision: 0,
      expectedStatus: AdminOperationStatus.Pending,
      expectedTotal: 250,
      expectedDeliveryFeeConfirmed: false,
      reason: 'قيد إداري مكرر لم تحدث له حركة أموال',
      correctionConfirmed: true,
      noMoneyMovedConfirmed: true,
    });
    const snapshot = paymentSnapshot();
    snapshot.paymentRevision = 2;
    snapshot.history = [
      { ...paymentEntry(), isCorrected: true },
      {
        ...paymentEntry(75.25, 2, 'correction-1'),
        kind: PaymentEntryKind.Correction,
        transactionCompletedConfirmed: false,
        correctionConfirmed: true,
        noMoneyMovedConfirmed: true,
        correctionOfEntryId: 'entry-1',
      },
    ];
    correction.flush({
      success: true,
      message: 'Corrected',
      data: { order: serverOrder(snapshot), entryId: 'correction-1', replayed: false },
    });
    await fixture.whenStable();
    expect(component.snapshot()?.summary.recordedRefunded).toBe(0);
    expect(component.snapshot()?.history[0].isCorrected).toBe(true);
    expect(component.history()[0].correctionAvailable).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('تصحيح قيد إداري دون حركة أموال');
    http.expectNone(paymentUrl);
  });

  it('keeps a lost correction targeted at the same original entry during exact retry', async () => {
    fixture.componentRef.setInput('order', collectedSnapshot());
    await fixture.whenStable();
    component.startCorrection('entry-1');
    component.correctionForm.setValue({
      reason: 'خطأ إداري موثق',
      confirmed: true,
      noMoneyMoved: true,
    });
    component.requestReview();
    component.savePayment();
    const first = http.expectOne(`${paymentUrl}/entry-1/correction`);
    const key = first.request.headers.get('Idempotency-Key');
    const body = first.request.body;
    first.error(new ProgressEvent('lost'));
    component.recoverAttempt();
    http.expectOne(recoveryUrl).flush({
      success: true,
      message: 'Not yet',
      data: { order: serverOrder(collectedSnapshot()), entryId: null, recorded: false },
    });
    component.retryAttempt();
    const retry = http.expectOne(`${paymentUrl}/entry-1/correction`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(body);
    retry.error(new ProgressEvent('still offline'));
    await fixture.whenStable();
    expect(component.attempt()?.mode).toBe(PaymentEditorMode.Correction);
    http.expectNone(paymentUrl);
  });

  it('invalidates a reviewed transaction when shipping/status changes without dropping typed data', async () => {
    prepare();
    fixture.componentRef.setInput('order', {
      ...paymentSnapshot(),
      shippingRevision: 1,
      total: 299.75,
      deliveryFeeConfirmed: true,
    });
    await fixture.whenStable();
    expect(component.form.controls.amount.value).toBe(75.25);
    expect(component.form.controls.reference.value).toBe('BANK-LOCAL-1');
    expect(component.form.controls.completed.value).toBe(false);
    expect(component.review()).toBeNull();
    expect(component.canReview()).toBe(false);
    http.expectNone(paymentUrl);
  });

  it('ignores late save callbacks and finalizers for a previously displayed order', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    fixture.componentRef.setInput('order', {
      ...paymentSnapshot(),
      orderId: 'another-payment-order',
    });
    await fixture.whenStable();
    prepare(10, PaymentEntryKind.Collection, PaymentEntryMethod.Cash, '');
    component.savePayment();
    const second = http.expectOne(
      `${environment.apiBaseUrl}/admin/orders/another-payment-order/payments`,
    );
    first.error(new ProgressEvent('late error'));
    await fixture.whenStable();
    expect(component.isSaving()).toBe(true);
    expect(component.error()).toBe('');
    second.flush({
      success: true,
      message: 'Saved',
      data: {
        order: serverOrder({ ...collectedSnapshot(10), orderId: 'another-payment-order' }),
        entryId: 'entry-other',
        replayed: false,
      },
    });
    await fixture.whenStable();
    expect(component.isBusy()).toBe(false);
    expect(component.snapshot()?.orderId).toBe('another-payment-order');
  });

  it('fails closed for a malformed stored body while retaining a valid key for read-only recovery', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('lost'));
    const saved = component.attempt();
    const malformed = JSON.stringify({ ...saved, transaction: { amount: 'invalid' } });
    expect(parsePaymentAttempt(malformed, 'payment-unit-order')).toBeNull();
    sessionStorage.setItem(storageKey, malformed);
    fixture.destroy();
    fixture = TestBed.createComponent(AdminOrderPaymentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', paymentSnapshot());
    fixture.detectChanges();
    expect(component.storageInvalid()).toBe(true);
    expect(component.canRecover()).toBe(true);
    expect(component.canDiscard()).toBe(false);
    prepare();
    component.savePayment();
    http.expectNone(paymentUrl);
    component.recoverAttempt();
    const recovery = http.expectOne(recoveryUrl);
    expect(recovery.request.headers.get('Idempotency-Key')).toBe(key);
    recovery.flush({
      success: true,
      message: 'Not found',
      data: { order: serverOrder(), entryId: null, recorded: false },
    });
    await fixture.whenStable();
    expect(component.storageInvalid()).toBe(true);
    expect(component.canRetry()).toBe(false);
    expect(component.canReview()).toBe(false);
    expect(sessionStorage.getItem(storageKey)).toBe(malformed);
  });

  it('keeps a cross-administrator recovery conflict private and unresolved', async () => {
    prepare();
    component.savePayment();
    const first = http.expectOne(paymentUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('lost'));
    component.recoverAttempt();
    http
      .expectOne(recoveryUrl)
      .flush(
        { success: false, errors: { paymentRequest: ['wrong administrator'] } },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(component.attempt()?.key).toBe(key);
    expect(component.snapshot()?.history).toHaveLength(0);
    expect(component.canReview()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('جلسة المسؤول الأصلي');
    http.expectNone(paymentUrl);
  });

  it('blocks sibling writes/navigation while leaving discard and recovery available without a request deadlock', async () => {
    const parentFixture = TestBed.createComponent(AdminOperationsPageComponent);
    const parent = parentFixture.componentInstance;
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/orders`)
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
    parent.openDetail('payment-unit-order');
    http.expectOne(orderUrl).flush({ success: true, message: 'Detail', data: serverOrder() });
    parentFixture.detectChanges();
    await parentFixture.whenStable();
    parent.paymentDraftChanged(true);
    expect(parent.shippingDisabled()).toBe(true);
    expect(parent.shippingRecoveryDisabled()).toBe(false);
    expect(parent.navigationLocked()).toBe(true);
    expect(parent.statusLocked()).toBe(true);
    parent.closeDetail();
    expect(parent.selectedId()).toBe('payment-unit-order');
    parent.shippingDraftChanged(true);
    expect(parent.paymentDisabled()).toBe(true);
    expect(parent.paymentRecoveryDisabled()).toBe(false);
    parent.paymentBusyChanged(true);
    expect(parent.shippingRecoveryDisabled()).toBe(true);
    parent.paymentBusyChanged(false);
    parent.shippingBusyChanged(true);
    expect(parent.paymentRecoveryDisabled()).toBe(true);
    parent.shippingBusyChanged(false);
    parent.paymentDraftChanged(false);
    parent.shippingDraftChanged(false);
    parent.paymentStaleChanged(true);
    expect(parent.shippingDisabled()).toBe(true);
    expect(parent.paymentRecoveryDisabled()).toBe(false);
  });
});
