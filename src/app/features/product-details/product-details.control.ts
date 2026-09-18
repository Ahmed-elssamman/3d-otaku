import { ProductSpecField } from '@core/enums/product-spec-field.enum';
import { ProductImageView } from '@core/models/product-image.model';

export const GALLERY_THUMBNAIL_CONTENT_SIZE = '4.5rem - 2px';

export interface ProductGalleryImageView extends ProductImageView {
  sizes: string;
}

export enum ProductDisplayMode {
  IMAGE = 'image',
  MODEL = 'model',
}

export interface ProductDisplaySpec {
  id: ProductSpecField;
  label: string;
  value: string;
}

export interface ProductSpecDefinition {
  key: ProductSpecField;
  label: string;
}

export const CUSTOMER_SPEC_FIELDS: ProductSpecDefinition[] = [
  { key: ProductSpecField.MATERIAL, label: 'الخامة المذكورة' },
  { key: ProductSpecField.FINISH, label: 'التشطيب المذكور' },
  { key: ProductSpecField.COLOR, label: 'الألوان المذكورة' },
  { key: ProductSpecField.SIZE, label: 'المقاسات المذكورة' },
  { key: ProductSpecField.WEIGHT, label: 'الوزن المذكور' },
];

export const TECHNICAL_SPEC_FIELDS: ProductSpecDefinition[] = [
  { key: ProductSpecField.PRINT_TIME, label: 'وقت الطباعة المذكور' },
  { key: ProductSpecField.LAYER_HEIGHT, label: 'ارتفاع الطبقة المذكور' },
  { key: ProductSpecField.INFILL, label: 'نسبة الملء المذكورة' },
];
