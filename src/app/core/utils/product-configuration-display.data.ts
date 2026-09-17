import { ProductConfigurationField } from '../enums/product-configuration-field.enum';
import { ProductSpecField } from '../enums/product-spec-field.enum';
import { ProductConfigurationDisplayField } from '../models/product-configuration-display.model';

export const CONFIGURATION_SPEC_FIELDS: ProductConfigurationDisplayField[] = [
  { id: ProductConfigurationField.Material, field: ProductSpecField.MATERIAL, label: 'الخامة' },
  { id: ProductConfigurationField.Finish, field: ProductSpecField.FINISH, label: 'التشطيب' },
  { id: ProductConfigurationField.Color, field: ProductSpecField.COLOR, label: 'اللون' },
  { id: ProductConfigurationField.Size, field: ProductSpecField.SIZE, label: 'المقاسات المذكورة' },
  { id: ProductConfigurationField.Weight, field: ProductSpecField.WEIGHT, label: 'الوزن المذكور' },
  {
    id: ProductConfigurationField.PrintTime,
    field: ProductSpecField.PRINT_TIME,
    label: 'وقت الطباعة المذكور',
  },
  {
    id: ProductConfigurationField.LayerHeight,
    field: ProductSpecField.LAYER_HEIGHT,
    label: 'ارتفاع الطبقة المذكور',
  },
  {
    id: ProductConfigurationField.Infill,
    field: ProductSpecField.INFILL,
    label: 'نسبة الملء المذكورة',
  },
];

export const CONFIGURATION_DISPLAY_TEXT = {
  title: 'المواصفات المسجّلة مع الطلب',
  missing: 'غير مذكور',
  legacy:
    'لا تتوفر مواصفات محفوظة قابلة للعرض لهذه القطعة. تفاصيل المنتج الحالية لا تثبت مواصفات الطلب السابق.',
  madeToOrderLabel: 'التجهيز حسب الطلب',
  madeToOrder: 'مسجّل كتصنيع حسب الطلب',
  notMadeToOrder: 'غير مصنّف كتصنيع حسب الطلب',
  productionTime: 'مدة التصنيع المذكورة',
  safetyNote: 'ملاحظات الاستخدام',
};
