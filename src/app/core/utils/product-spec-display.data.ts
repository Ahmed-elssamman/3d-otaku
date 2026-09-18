import { ProductSpecField } from '../enums/product-spec-field.enum';
import { ProductSpecLabel, ProductSpecUnit } from '../models/product-spec-display.model';

export const PRODUCT_FINISH_LABELS: ProductSpecLabel[] = [
  { source: 'matte', label: 'مطفي' },
  { source: 'glossy', label: 'لامع' },
  { source: 'smooth', label: 'ناعم' },
  { source: 'metallic', label: 'مظهر معدني' },
  { source: 'hand', label: 'غير موضح' },
];

export const PRODUCT_COLOR_LABELS: ProductSpecLabel[] = [
  { source: 'black', label: 'أسود' },
  { source: 'white', label: 'أبيض' },
  { source: 'gray', label: 'رمادي' },
  { source: 'grey', label: 'رمادي' },
  { source: 'red', label: 'أحمر' },
  { source: 'blue', label: 'أزرق' },
  { source: 'green', label: 'أخضر' },
  { source: 'pink', label: 'وردي' },
  { source: 'yellow', label: 'أصفر' },
  { source: 'orange', label: 'برتقالي' },
  { source: 'purple', label: 'بنفسجي' },
  { source: 'brown', label: 'بني' },
  { source: 'gold', label: 'ذهبي' },
  { source: 'silver', label: 'فضي' },
];

export const PRODUCT_MATERIAL_LABELS: ProductSpecLabel[] = [
  { source: 'pla', label: 'PLA' },
  { source: 'pla+', label: 'PLA+' },
  { source: 'petg', label: 'PETG' },
  { source: 'resin', label: 'راتنج (ريزن)' },
  { source: 'other', label: 'خامة أخرى' },
];

export const PRODUCT_PRINT_TIME_LABELS: ProductSpecLabel[] = [
  { source: 'one day', label: 'يوم واحد' },
];

export const PRODUCT_SPEC_UNITS: ProductSpecUnit[] = [
  {
    fields: [ProductSpecField.SIZE, ProductSpecField.LAYER_HEIGHT],
    aliases: [
      'mm',
      'millimeter',
      'millimeters',
      'millimetre',
      'millimetres',
      'مم',
      'ملم',
      'مليمتر',
    ],
    label: 'مم',
  },
  {
    fields: [ProductSpecField.SIZE, ProductSpecField.LAYER_HEIGHT],
    aliases: ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres', 'سم', 'سنتيمتر'],
    label: 'سم',
  },
  {
    fields: [ProductSpecField.SIZE],
    aliases: ['m', 'meter', 'meters', 'metre', 'metres', 'م', 'متر'],
    label: 'م',
  },
  {
    fields: [ProductSpecField.WEIGHT],
    aliases: ['g', 'gram', 'grams', 'جم', 'غ', 'جرام', 'غرام'],
    label: 'جم',
  },
  {
    fields: [ProductSpecField.WEIGHT],
    aliases: ['kg', 'kilogram', 'kilograms', 'كجم', 'كغ', 'كيلوجرام', 'كيلوغرام'],
    label: 'كجم',
  },
  {
    fields: [ProductSpecField.PRINT_TIME],
    aliases: ['h', 'hr', 'hrs', 'hour', 'hours', 'ساعة', 'ساعات'],
    label: 'ساعة',
  },
  {
    fields: [ProductSpecField.PRINT_TIME],
    aliases: ['d', 'day', 'days', 'يوم', 'أيام', 'ايام'],
    label: 'يوم',
  },
  {
    fields: [ProductSpecField.PRINT_TIME],
    aliases: ['min', 'minute', 'minutes', 'دقيقة', 'دقائق'],
    label: 'دقيقة',
  },
  {
    fields: [ProductSpecField.INFILL],
    aliases: ['%', '٪', 'percent'],
    label: '٪',
  },
];

export const PRODUCT_SPEC_DISPLAY_TEXT = {
  missingUnit: 'الوحدة غير مذكورة',
  colorSeparator: '، ',
};

export const PRODUCT_SPEC_NUMBER_PATTERN = '(?:[0-9٠-٩۰-۹]+(?:[.٫][0-9٠-٩۰-۹]+)?|[.٫][0-9٠-٩۰-۹]+)';
export const PRODUCT_SPEC_DIMENSION_SEPARATOR = '\\s*(?:[xX×]|[-–])\\s*';
export const PRODUCT_SPEC_ZERO_PATTERN = /^[0٠۰]+(?:[.٫][0٠۰]+)?$/u;
export const PRODUCT_SPEC_COLOR_SEPARATOR = /[,،/;؛]+/u;
