import { PaymentSummaryState } from '../enums/payment-summary-state.enum';
import { OrderPaymentSummary } from '../models/order-payment-summary.model';
import { normalizeOrderPaymentSummary } from './order-payment-summary.util';

describe('Payment summary validation', () => {
  const recorded: OrderPaymentSummary = {
    state: PaymentSummaryState.RecordedBalance,
    recordedCollected: 0.3,
    recordedRefunded: 0.1,
    recordedNet: 0.2,
    balanceDue: 349.8,
    credit: 0,
    shippingConfirmed: true,
  };

  it('validates exact decimal money without floating-point subtraction errors', () => {
    expect(normalizeOrderPaymentSummary(recorded)).toEqual(recorded);
  });

  it('withholds fractional piastres and amounts outside the safe integer range', () => {
    for (const recordedCollected of [0.301, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY]) {
      const result = normalizeOrderPaymentSummary({ ...recorded, recordedCollected });
      expect(result.state).toBe(PaymentSummaryState.Unavailable);
      expect(result.recordedCollected).toBeNull();
      expect(result.balanceDue).toBeNull();
    }
  });

  it('withholds an inconsistent recorded net or simultaneous debt and credit', () => {
    const wrongNet = normalizeOrderPaymentSummary({ ...recorded, recordedNet: 0.3 });
    const mixedBalance = normalizeOrderPaymentSummary({ ...recorded, credit: 20 });
    expect(wrongNet.state).toBe(PaymentSummaryState.Unavailable);
    expect(mixedBalance.state).toBe(PaymentSummaryState.Unavailable);
  });

  it('rejects a balance attached to provisional or cancelled totals', () => {
    for (const state of [PaymentSummaryState.ShippingUnconfirmed, PaymentSummaryState.SettlementReview]) {
      const result = normalizeOrderPaymentSummary({ ...recorded, state, shippingConfirmed: false });
      expect(result.state).toBe(PaymentSummaryState.Unavailable);
      expect(result.balanceDue).toBeNull();
    }
  });
});
