import { Product } from './product.model';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  notes?: string;
}

export interface CustomerDeliveryInfo {
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  secondaryPhone?: string;
  governorate?: string;
  city?: string;
  address: string;
  notes?: string;
}
