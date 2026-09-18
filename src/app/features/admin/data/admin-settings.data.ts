import { APP_CONSTANTS } from '@core/constants/app.constants';
import { AdminSettings } from '../models/admin-settings.model';
import { environment } from '../../../../environments/environment';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  brandName: APP_CONSTANTS.BRAND_NAME,
  slogan: '',
  whatsappNumber: environment.whatsAppNumber,
  whatsappDefaultMessage: '',
  email: '',
  phone: environment.storePhone,
  address: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  heroTitle: '',
  heroSubtitle: '',
  heroImageUrl: '',
  defaultCurrency: environment.defaultCurrency,
  deliveryNote: '',
  safetyNote: '',
  maintenanceMode: false,
  deliveryFee: null,
  deliveryDays: '',
};
