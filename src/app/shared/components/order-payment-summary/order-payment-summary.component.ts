import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { OrderPaymentSummary } from '@core/models/order-payment-summary.model';
import { normalizeOrderPaymentSummary } from '@core/utils/order-payment-summary.util';
import { PAYMENT_SUMMARY_COPY, PAYMENT_SUMMARY_PRESENTATIONS } from './order-payment-summary.control';

@Component({
  selector: 'app-order-payment-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './order-payment-summary.component.html',
  styleUrl: './order-payment-summary.component.scss',
})
export class OrderPaymentSummaryComponent {
  summary = input.required<OrderPaymentSummary | null>();
  copy = PAYMENT_SUMMARY_COPY;
  payment = computed(() => normalizeOrderPaymentSummary(this.summary()));
  presentation = computed(() => PAYMENT_SUMMARY_PRESENTATIONS[this.payment().state]);
  hasCredit = computed(() => (this.payment().credit ?? 0) > 0);
}
