import { PaymentSummaryState } from '../enums/payment-summary-state.enum';
import { OrderPaymentSummary } from '../models/order-payment-summary.model';
import {
  PAYMENT_AMOUNT_PATTERN,
  PAYMENT_DECIMAL_PLACES,
  PAYMENT_PIASTRES_PER_POUND,
} from './order-payment-summary.data';

export function normalizeOrderPaymentSummary(
  summary: OrderPaymentSummary | null,
  shippingConfirmed: boolean = summary?.shippingConfirmed === true,
): OrderPaymentSummary {
  const unavailable: OrderPaymentSummary = {
    state: PaymentSummaryState.Unavailable,
    recordedCollected: null,
    recordedRefunded: null,
    recordedNet: null,
    balanceDue: null,
    credit: null,
    shippingConfirmed,
  };
  if (!summary || summary.shippingConfirmed !== shippingConfirmed) return unavailable;
  if (summary.state === PaymentSummaryState.Unavailable) return unavailable;
  const collected = exactPiastres(summary.recordedCollected);
  const refunded = exactPiastres(summary.recordedRefunded);
  const net = exactPiastres(summary.recordedNet);
  if (
    collected === null ||
    refunded === null ||
    net === null ||
    collected - refunded !== net
  ) {
    return unavailable;
  }
  if (
    summary.state !== PaymentSummaryState.RecordedBalance &&
    (summary.balanceDue !== null || summary.credit !== null)
  ) {
    return unavailable;
  }

  switch (summary.state) {
    case PaymentSummaryState.NoRecords:
      if (collected !== 0 || refunded !== 0 || net !== 0)
        return unavailable;
      break;
    case PaymentSummaryState.ShippingUnconfirmed:
      if (shippingConfirmed) return unavailable;
      break;
    case PaymentSummaryState.SettlementReview:
      break;
    case PaymentSummaryState.RecordedBalance: {
      const due = exactPiastres(summary.balanceDue);
      const credit = exactPiastres(summary.credit);
      if (!shippingConfirmed || due === null || credit === null || (due > 0 && credit > 0))
        return unavailable;
      break;
    }
    default:
      return unavailable;
  }

  return {
    state: summary.state,
    recordedCollected: summary.recordedCollected,
    recordedRefunded: summary.recordedRefunded,
    recordedNet: summary.recordedNet,
    balanceDue: summary.state === PaymentSummaryState.RecordedBalance ? summary.balanceDue : null,
    credit: summary.state === PaymentSummaryState.RecordedBalance ? summary.credit : null,
    shippingConfirmed,
  };
}

function exactPiastres(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const text = String(value);
  if (!PAYMENT_AMOUNT_PATTERN.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const minor =
    BigInt(whole) * BigInt(PAYMENT_PIASTRES_PER_POUND) +
    BigInt(fraction.padEnd(PAYMENT_DECIMAL_PLACES, '0'));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}
