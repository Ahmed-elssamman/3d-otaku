export interface CustomOrderRequest {
  fullName: string;
  email?: string;
  phone: string;
  designSource: string;
  productType: string;
  referenceUrl?: string;
  dimensions: string;
  material?: string;
  colorFinish: string;
  quantity: number;
  details: string;
  rightsConfirmed: boolean;
}
