import { CustomerDeliveryInfo } from './cart-item.model';
import { OrderStatus } from '../enums/order-status.enum';

export interface OrderItem {
  productId: string;
  slug?: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  discountPrice?: number | null;
  lineTotal: number;
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
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  estimatedDeliveryDays?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: CreateOrderItemPayload[];
  customer: CustomerDeliveryInfo;
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
}

export interface OrderApiRecord {
  id?: string;
  _id?: string;
  orderNumber: string;
  items: OrderApiItem[];
  customer: CustomerDeliveryInfo;
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total?: number;
  totalAmount?: number;
  currency?: string;
  status: OrderStatus;
  paymentMethod?: string;
  estimatedDeliveryDays?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt?: string;
}
