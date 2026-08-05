import { APP_CONSTANTS } from '@core/constants/app.constants';
import { AdminSettings } from '../models/admin-settings.model';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  brandName: APP_CONSTANTS.BRAND_NAME,
  slogan: APP_CONSTANTS.BRAND_SLOGAN,
  whatsappNumber: APP_CONSTANTS.WHATSAPP_NUMBER,
  whatsappDefaultMessage: 'Hello 3D Otaku, I want to place an order.',
  email: 'hello@3dotaku.com',
  phone: '+20 100 123 4567',
  address: 'Cairo, Egypt',
  facebookUrl: 'https://facebook.com/3dotaku',
  instagramUrl: 'https://instagram.com/3dotaku',
  tiktokUrl: 'https://tiktok.com/@3dotaku',
  youtubeUrl: 'https://youtube.com/@3dotaku',
  heroTitle: 'Bring Anime Fantasy Into Tangible 3D Reality',
  heroSubtitle: 'Explore high-density PLA+ 3D printed anime katanas, demon daggers, cosplay masks, and desk collectibles. Inspect every model in 360° 3D before ordering.',
  heroImageUrl: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=1200&q=80',
  defaultCurrency: 'USD',
  deliveryNote: 'Production starts after order confirmation. Delivery windows vary by model size and finish.',
  safetyNote: APP_CONSTANTS.SAFETY_DISCLAIMER,
  maintenanceMode: false
};
