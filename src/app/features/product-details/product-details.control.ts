import { APP_CONSTANTS } from '@core/constants/app.constants';

export interface ProductSpecItem {
  label: string;
  valueKey: 'material' | 'size' | 'weight' | 'printTime';
  icon: string;
}

export const PRODUCT_SPECS_CONFIG: ProductSpecItem[] = [
  { label: 'Print Material', valueKey: 'material', icon: 'pi pi-box' },
  { label: 'Dimensions / Length', valueKey: 'size', icon: 'pi pi-compass' },
  { label: 'Total Weight', valueKey: 'weight', icon: 'pi pi-scale' },
  { label: '3D Print Duration', valueKey: 'printTime', icon: 'pi pi-clock' }
];

export const SAFETY_NOTE_TEXT = APP_CONSTANTS.SAFETY_DISCLAIMER;
