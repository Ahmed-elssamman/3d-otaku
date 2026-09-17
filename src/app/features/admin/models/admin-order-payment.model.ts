import { OrderPaymentSummary } from '@core/models/order-payment-summary.model';
import { AdminOperationStatus } from '../enums/admin-operation.enum';
import {
  PaymentAttemptOutcome,
  PaymentEditorMode,
  PaymentEntryKind,
  PaymentEntryMethod,
} from '../enums/order-payment.enum';
import { AdminOperationDetail, AdminOrderRecord } from './admin-operation.model';

export interface AdminPaymentEntry {
  id: string;
  revision: number;
  kind: PaymentEntryKind;
  amount: number;
  method: PaymentEntryMethod;
  reference: string;
  note: string;
  transactionCompletedConfirmed: boolean;
  correctionConfirmed: boolean;
  noMoneyMovedConfirmed: boolean;
  correctionOfEntryId: string | null;
  isCorrected: boolean;
  createdAt: string;
  actorId: string;
}

export interface AdminPaymentSnapshot {
  orderId: string;
  paymentRevision: number;
  shippingRevision: number;
  status: AdminOperationStatus;
  total: number;
  deliveryFeeConfirmed: boolean;
  summary: OrderPaymentSummary;
  history: AdminPaymentEntry[];
}

export interface AdminPaymentContext {
  expectedPaymentRevision: number;
  expectedShippingRevision: number;
  expectedStatus: AdminOperationStatus;
  expectedTotal: number;
  expectedDeliveryFeeConfirmed: boolean;
}

export interface RecordAdminPaymentRequest extends AdminPaymentContext {
  kind: PaymentEntryKind;
  amount: number;
  method: PaymentEntryMethod;
  transactionCompletedConfirmed: true;
  reference?: string;
  note?: string;
}

export interface CorrectAdminPaymentRequest extends AdminPaymentContext {
  reason: string;
  correctionConfirmed: true;
  noMoneyMovedConfirmed: true;
}

export interface AdminPaymentResult {
  order: AdminOrderRecord;
  entryId: string;
  replayed: boolean;
}

export interface AdminPaymentRecoveryResult {
  order: AdminOrderRecord;
  entryId: string | null;
  recorded: boolean;
}

export interface AdminPaymentDetailResult {
  order: AdminOperationDetail;
  entryId: string;
  replayed: boolean;
}

export interface AdminPaymentDetailRecoveryResult {
  order: AdminOperationDetail;
  entryId: string | null;
  recorded: boolean;
}

export interface AdminPaymentAttempt {
  orderId: string;
  key: string;
  mode: PaymentEditorMode;
  targetEntryId: string;
  transaction: RecordAdminPaymentRequest | null;
  correction: CorrectAdminPaymentRequest | null;
  outcome: PaymentAttemptOutcome;
}

export interface AdminPaymentReview {
  mode: PaymentEditorMode;
  targetEntryId: string;
  transaction: RecordAdminPaymentRequest | null;
  correction: CorrectAdminPaymentRequest | null;
  actionLabel: string;
  methodLabel: string;
  amount: number;
  reference: string;
  note: string;
}

export interface AdminPaymentEntryView extends AdminPaymentEntry {
  kindLabel: string;
  methodLabel: string;
  correctionAvailable: boolean;
}
