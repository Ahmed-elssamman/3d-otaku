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
}

export interface CustomOrder extends CreateCustomOrderRequest {
  id: string;
  status: 'pending' | 'contacted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}
