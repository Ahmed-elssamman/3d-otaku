export interface AdminSettings {
  brandName: string;
  slogan: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  email: string;
  phone: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  defaultCurrency: string;
  deliveryNote: string;
  safetyNote: string;
  maintenanceMode: boolean;
  deliveryFee?: number | null;
  deliveryDays?: string;
  deliveryInfoNote?: string;
}
