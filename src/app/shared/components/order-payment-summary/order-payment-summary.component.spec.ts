import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { OrderPaymentSummary } from '@core/models/order-payment-summary.model';
import { OrderPaymentSummaryComponent } from './order-payment-summary.component';

describe('Public recorded payment summary', () => {
  const recorded: OrderPaymentSummary = {
    state: PaymentSummaryState.RecordedBalance,
    recordedCollected: 100,
    recordedRefunded: 20.25,
    recordedNet: 79.75,
    balanceDue: 270.25,
    credit: 0,
    shippingConfirmed: true,
  };

  function render(summary: OrderPaymentSummary | null): ComponentFixture<OrderPaymentSummaryComponent> {
    const fixture = TestBed.createComponent(OrderPaymentSummaryComponent);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps absent legacy data unavailable without inventing zero payments or a debt', () => {
    const element = render(null).nativeElement as HTMLElement;
    expect(element.textContent).toContain('ملخص الدفعات غير متاح');
    expect(element.querySelector('dl')).toBeNull();
    expect(element.textContent).not.toContain('0 ج.م');
    expect(element.textContent).not.toContain('غير مدفوع');
  });

  it('does not label an empty or fully corrected ledger as an unpaid order', () => {
    const element = render({
      ...recorded,
      state: PaymentSummaryState.NoRecords,
      recordedCollected: 0,
      recordedRefunded: 0,
      recordedNet: 0,
      balanceDue: null,
      credit: null,
    }).nativeElement as HTMLElement;
    expect(element.textContent).toContain('لا توجد دفعات مسجلة');
    expect(element.textContent).toContain('غياب السجل لا يثبت أن الطلب غير مدفوع');
    expect(element.querySelector('dl')).toBeNull();
  });

  it('shows recorded movements while withholding a final balance until shipping is confirmed', () => {
    const element = render({
      ...recorded,
      state: PaymentSummaryState.ShippingUnconfirmed,
      shippingConfirmed: false,
      balanceDue: null,
      credit: null,
    }).nativeElement as HTMLElement;
    expect(element.textContent).toContain('تكلفة الشحن لم تتأكد بعد');
    expect(element.textContent).toContain('20.25 ج.م');
    expect(element.textContent).toContain('79.75 ج.م');
    expect(element.textContent).not.toContain('المتبقي حسب السجل');
    expect(element.textContent).not.toContain('المبلغ الزائد حسب السجل');
  });

  it('shows exact recorded balance and updates to credit without claiming a completed refund', () => {
    const fixture = render(recorded);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('270.25 ج.م');
    expect(element.textContent).not.toContain('المبلغ الزائد حسب السجل');
    fixture.componentRef.setInput('summary', {
      ...recorded,
      recordedCollected: 400,
      recordedRefunded: 0,
      recordedNet: 400,
      balanceDue: 0,
      credit: 50,
    });
    fixture.detectChanges();
    expect(element.textContent).toContain('المبلغ الزائد حسب السجل');
    expect(element.textContent).toContain('50 ج.م');
    expect(element.textContent).toContain('ظهوره لا يعني إتمام استرداده');
    expect(element.textContent).toContain('ليس تحققًا إلكترونيًا من التحويلات');
    expect(element.textContent).not.toContain('270.25 ج.م');
  });

  it('keeps cancelled orders in settlement review without calculating a payable invoice', () => {
    const element = render({
      ...recorded,
      state: PaymentSummaryState.SettlementReview,
      balanceDue: null,
      credit: null,
    }).nativeElement as HTMLElement;
    expect(element.textContent).toContain('الطلب الملغى يحتاج مراجعة التسوية');
    expect(element.textContent).toContain('79.75 ج.م');
    expect(element.textContent).not.toContain('المتبقي حسب السجل');
    expect(element.textContent).not.toContain('المبلغ الزائد حسب السجل');
  });

  it('withholds non-finite or shipping-inconsistent monetary data', () => {
    const fixture = render({ ...recorded, recordedNet: Number.NaN });
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ملخص الدفعات غير متاح');
    fixture.componentRef.setInput('summary', { ...recorded, shippingConfirmed: false });
    fixture.detectChanges();
    expect(element.querySelector('dl')).toBeNull();
    expect(element.textContent).not.toContain('270.25');
  });
});
