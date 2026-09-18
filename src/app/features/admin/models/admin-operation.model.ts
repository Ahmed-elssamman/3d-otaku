import { CustomerDeliveryInfo } from '@core/models/cart-item.model';
import { AdminOrderItem, AdminOrderItemRecord } from './admin-order-manufacturing.model';
import { OrderPaymentSummary } from '@core/models/order-payment-summary.model';
import { AdminPaymentEntry, AdminPaymentSnapshot } from './admin-order-payment.model';
import {
  AdminOrderShippingHistory,
  AdminOrderShippingSnapshot,
} from './admin-order-shipping.model';
import {
  AdminOperationKind,
  AdminOperationSort,
  AdminOperationStatus,
} from '../enums/admin-operation.enum';

export interface AdminStatusHistory {
  status: AdminOperationStatus;
  createdAt: string;
  publicNote?: string;
  note?: string;
}

export interface AdminOrderRecord {
  id: string;
  orderNumber: string;
  customer: CustomerDeliveryInfo;
  items: AdminOrderItemRecord[];
  subtotal: number;
  deliveryFee: number;
  deliveryFeeConfirmed: boolean;
  discount: number;
  total: number;
  currency: string;
  status: AdminOperationStatus;
  allowedNextStatuses: AdminOperationStatus[];
  statusHistory: AdminStatusHistory[];
  createdAt: string;
  updatedAt: string;
  shippingRevision: number;
  canConfirmShipping: boolean;
  shippingHistory: AdminOrderShippingHistory[];
  paymentRevision: number;
  paymentHistory: AdminPaymentEntry[];
  paymentSummary: OrderPaymentSummary;
}

export interface AdminCustomOrderRecord {
  id: string;
  requestNumber: string;
  fullName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  productIdea: string;
  description: string;
  preferredColor: string;
  estimatedSize: string;
  preferredMaterial: string;
  quantity: number;
  designSource: string;
  rightsConfirmed: boolean;
  referenceImageUrl: string | null;
  notes: string;
  status: AdminOperationStatus;
  allowedNextStatuses: AdminOperationStatus[];
  statusHistory: AdminStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminContactMessageRecord {
  id: string;
  messageNumber: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: AdminOperationStatus;
  allowedNextStatuses: AdminOperationStatus[];
  statusHistory: AdminStatusHistory[];
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOperationQuery {
  page: number;
  limit: number;
  search: string;
  status: AdminOperationStatus | null;
  sort: AdminOperationSort;
}

export interface AdminOperationStatusRequest {
  status: AdminOperationStatus;
  expectedStatus: AdminOperationStatus;
  publicNote?: string;
  note?: string;
}

export interface AdminStatusOption {
  value: AdminOperationStatus;
  label: string;
}

export interface AdminOperationConfig {
  kind: AdminOperationKind;
  title: string;
  description: string;
  searchLabel: string;
  emptyText: string;
  statuses: AdminStatusOption[];
  noteLabel: string;
  noteHint: string;
}

export interface AdminOperationSummary {
  id: string;
  reference: string;
  customerName: string;
  summary: string;
  status: AdminOperationStatus;
  statusLabel: string;
  createdAt: string;
}

export interface AdminDetailField {
  label: string;
  value: string;
  ltr?: boolean;
}

export interface AdminHistoryView {
  statusLabel: string;
  createdAt: string;
  note: string;
}

export interface AdminOrderTotals {
  subtotal: number;
  deliveryFee: number;
  deliveryFeeConfirmed: boolean;
  discount: number;
  total: number;
}

export interface AdminOperationDetail extends AdminOperationSummary {
  fields: AdminDetailField[];
  items: AdminOrderItem[];
  totals: AdminOrderTotals | null;
  history: AdminHistoryView[];
  nextStatuses: AdminStatusOption[];
  referenceUrl: string;
  shipping: AdminOrderShippingSnapshot | null;
  payments: AdminPaymentSnapshot | null;
}
