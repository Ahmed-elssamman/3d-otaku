import { AdminOperationStatus } from '../enums/admin-operation.enum';

export interface AdminOrderShippingHistory {
  revision: number;
  previousDeliveryFee: number;
  previousDeliveryFeeConfirmed: boolean;
  deliveryFee: number;
  previousTotal: number;
  total: number;
  customerAgreementConfirmed: boolean;
  createdAt: string;
  actorId: string;
  note: string;
}

export interface AdminOrderShippingSnapshot {
  orderId: string;
  status: AdminOperationStatus;
  shippingRevision: number;
  canConfirmShipping: boolean;
  deliveryFee: number;
  deliveryFeeConfirmed: boolean;
  subtotal: number;
  discount: number;
  total: number;
  history: AdminOrderShippingHistory[];
}

export interface UpdateAdminOrderShippingRequest {
  expectedShippingRevision: number;
  expectedStatus: AdminOperationStatus;
  deliveryFee: number;
  customerAgreementConfirmed: boolean;
  note?: string;
}

export interface AdminOrderShippingAttempt {
  key: string;
  request: UpdateAdminOrderShippingRequest;
}

export interface AdminOrderShippingReview {
  request: UpdateAdminOrderShippingRequest;
  total: number;
}
