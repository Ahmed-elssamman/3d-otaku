import { PaymentSummaryState } from '../enums/payment-summary-state.enum';

export interface OrderPaymentSummary {
  state: PaymentSummaryState;
  recordedCollected: number | null;
  recordedRefunded: number | null;
  recordedNet: number | null;
  balanceDue: number | null;
  credit: number | null;
  shippingConfirmed: boolean;
}
