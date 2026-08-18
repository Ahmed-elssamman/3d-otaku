import { APP_CONSTANTS } from '@core/constants/app.constants';
import { AdminSettings } from '../models/admin-settings.model';
import { environment } from '../../../../environments/environment';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  brandName: APP_CONSTANTS.BRAND_NAME,
  slogan: '',
  whatsappNumber: environment.whatsAppNumber,
  whatsappDefaultMessage: 'Hello 3D Otaku, I would like to ask about an order.',
  email: '',
  phone: environment.storePhone,
  address: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  heroTitle: 'Your favorite character, made for your world.',
  heroSubtitle: 'Browse available designs or send your idea for a feasibility review.',
  heroImageUrl: '',
  defaultCurrency: environment.defaultCurrency,
  deliveryNote: '',
  safetyNote: '',
  maintenanceMode: false,
  deliveryFee: null,
  deliveryDays: '',
  deliveryInfoNote: ''
};
