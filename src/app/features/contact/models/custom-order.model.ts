import { CustomOrderStatus, DesignSource } from '../enums/contact.enum';

export interface CreateCustomOrderRequest {
  fullName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  productIdea: string;
  description: string;
  preferredColor?: string;
  estimatedSize?: string;
  referenceImageUrl?: string;
  notes?: string;
  designSource?: DesignSource;
  quantity?: number;
  preferredMaterial?: string;
  rightsConfirmed?: boolean;
}

export interface CustomOrder extends CreateCustomOrderRequest {
  id: string;
  requestNumber: string;
  status: CustomOrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomOrderQuery {
  page?: number;
  limit?: number;
  status?: CustomOrderStatus;
  search?: string;
}

export interface CustomOrderStatusRequest {
  status: CustomOrderStatus;
}
