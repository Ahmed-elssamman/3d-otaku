import { CustomerDeliveryInfo } from './cart-item.model';

export type OrderStatus = 'pending' | 'processing' | 'printed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id?: string;
  _id?: string;
  orderNumber: string;
  items: OrderItem[];
  customer: CustomerDeliveryInfo;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  estimatedDeliveryDays: string;
  createdAt: string;
  whatsappMessageSent: boolean;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  customer: CustomerDeliveryInfo;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryDays: string;
}
