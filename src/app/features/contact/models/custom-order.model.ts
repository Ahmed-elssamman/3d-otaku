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
  designSource?: string;
  quantity?: number;
  preferredMaterial?: string;
  rightsConfirmed?: boolean;
}

export interface CustomOrder extends CreateCustomOrderRequest {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}
