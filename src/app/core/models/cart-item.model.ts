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
  secondaryPhone?: string;
  governorate: string;
  address: string;
  notes?: string;
}
