import { CustomerDeliveryInfo } from './cart-item.model';
import { OrderStatus } from '../enums/order-status.enum';
import { PendingOrderState } from '../enums/pending-order-state.enum';
import { OrderPaymentSummary } from './order-payment-summary.model';
import { CheckoutQuoteVersion } from '../enums/checkout-quote-version.enum';
import { ProductConfiguration } from './product-configuration.model';

export interface OrderItem {
  productId: string;
  slug?: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  discountPrice?: number | null;
  lineTotal: number;
  configuration?: ProductConfiguration | null;
  configurationFingerprint?: string | null;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  createdAt: string;
  publicNote?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  customer: CustomerDeliveryInfo;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeConfirmed?: boolean;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentSummary?: OrderPaymentSummary;
  estimatedDeliveryDays?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
  trackingToken?: string;
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
  customer: CustomerDeliveryInfo;
  expectedQuoteFingerprint?: string;
  expectedQuoteVersion?: CheckoutQuoteVersion;
  subtotal?: number;
  deliveryFee?: number;
  totalAmount?: number;
  deliveryDays?: string;
  currency?: string;
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CheckoutQuoteRequest {
  items: CreateOrderItemPayload[];
}

export interface CheckoutQuoteItem extends OrderItem {
  slug: string;
  discountPrice: number | null;
  configuration: ProductConfiguration;
  configurationFingerprint: string;
}

export interface CheckoutQuote {
  quoteVersion: CheckoutQuoteVersion;
  quoteFingerprint: string;
  currency: string;
  items: CheckoutQuoteItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  deliveryFeeConfirmed: boolean;
  total: number;
  estimatedDeliveryDays: string;
}

export interface OrderApiItem {
  productId: string;
  slug?: string;
  name?: string;
  productName?: string;
  image?: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  discountPrice?: number | null;
  lineTotal: number;
  configuration?: ProductConfiguration | null;
  configurationFingerprint?: string | null;
}

export interface OrderApiRecord {
  id?: string;
  _id?: string;
  orderNumber: string;
  items: OrderApiItem[];
  customer: CustomerDeliveryInfo;
  subtotal: number;
  deliveryFee?: number;
  deliveryFeeConfirmed?: boolean;
  discount?: number;
  total?: number;
  totalAmount?: number;
  currency?: string;
  status: OrderStatus;
  paymentMethod?: string;
  paymentSummary?: OrderPaymentSummary;
  estimatedDeliveryDays?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt?: string;
  trackingToken?: string;
}

export interface PendingOrderSubmission {
  key: string;
  payload: string;
  state: PendingOrderState;
}
