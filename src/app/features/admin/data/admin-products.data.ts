import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { AdminFeaturedFilter } from '../enums/admin-featured-filter.enum';
import { AdminProductSort } from '../enums/admin-product-sort.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import { ProductSort } from '../../products/enums/product-sort.enum';
import { AdminProductCategory } from '../models/admin-product-category.model';
import {
  MAX_MODEL_UPLOAD_SIZE_LABEL,
  SUPPORTED_MODEL_FORMATS_LABEL,
} from '@core/constants/model-file.constants';

export interface AdminOption {
  label: string;
  value: string;
}

export interface AdminEnumOption<T> {
  label: string;
  value: T;
}

export const ADMIN_PRODUCT_SORT_API_MAP: Record<AdminProductSort, ProductSort> = {
  [AdminProductSort.NEWEST]: ProductSort.NEWEST,
  [AdminProductSort.PRICE_ASC]: ProductSort.PRICE_LOW,
  [AdminProductSort.PRICE_DESC]: ProductSort.PRICE_HIGH,
  [AdminProductSort.FEATURED_DESC]: ProductSort.FEATURED,
};

export const ADMIN_PRODUCT_PREVIEW_STYLE = { width: 'min(1100px, 95vw)' };

export const ADMIN_ALL_CATEGORY_OPTION: AdminOption = { label: 'كل التصنيفات', value: '' };

export const ADMIN_CATEGORY_LABELS: Record<string, string> = {
  [ProductCategory.SWORDS]: 'سيوف وخناجر للعرض',
  [ProductCategory.DAGGERS]: 'خناجر للعرض',
  [ProductCategory.ANIME_FIGURES]: 'مجسمات أنمي',
  [ProductCategory.COSPLAY_PROPS]: 'إكسسوارات تنكرية',
  [ProductCategory.DESK_MODELS]: 'قطع المكتب',
  [ProductCategory.COLLECTIBLES]: 'قطع للاقتناء',
};

export const ADMIN_CATEGORY_TEXT = {
  loading: 'جارٍ تحميل تصنيفات المنتجات…',
  loadError: 'تعذّر تحميل التصنيفات. التصنيف الحالي محفوظ؛ يمكنك إعادة المحاولة.',
  retry: 'إعادة تحميل التصنيفات',
};

export function adminCategoryLabel(value: string): string {
  return Object.hasOwn(ADMIN_CATEGORY_LABELS, value) ? ADMIN_CATEGORY_LABELS[value] : value;
}

export function adminCategoryOptions(
  categories: AdminProductCategory[],
  currentCategory = '',
  includeKnownCategories = false,
): AdminOption[] {
  const names = new Set(includeKnownCategories ? Object.keys(ADMIN_CATEGORY_LABELS) : []);
  for (const category of categories) {
    if (category.name.trim() && category.productsCount > 0) names.add(category.name);
  }
  if (currentCategory.trim()) names.add(currentCategory);
  return [...names].map((value) => ({ value, label: adminCategoryLabel(value) }));
}

export const ADMIN_FEATURED_FILTER_OPTIONS: AdminOption[] = [
  { label: 'كل المنتجات', value: AdminFeaturedFilter.ALL },
  { label: 'المنتجات المميزة', value: AdminFeaturedFilter.FEATURED },
  { label: 'غير المميزة', value: AdminFeaturedFilter.NOT_FEATURED },
];

export const ADMIN_SORT_OPTIONS: AdminOption[] = [
  { label: 'الأحدث أولًا', value: AdminProductSort.NEWEST },
  { label: 'السعر من الأقل للأعلى', value: AdminProductSort.PRICE_ASC },
  { label: 'السعر من الأعلى للأقل', value: AdminProductSort.PRICE_DESC },
  { label: 'المميزة أولًا', value: AdminProductSort.FEATURED_DESC },
];

export const PRODUCT_BADGE_OPTIONS: AdminEnumOption<ProductBadge>[] = [
  { label: 'بدون شارة', value: ProductBadge.NONE },
  { label: 'جديد', value: ProductBadge.NEW },
  { label: 'مميز', value: ProductBadge.FEATURED },
];

export const PRODUCT_MODEL_TYPE_OPTIONS: AdminEnumOption<ProductModelType>[] = [
  { label: 'GLB', value: ProductModelType.GLB },
  { label: 'GLTF', value: ProductModelType.GLTF },
  { label: 'STL', value: ProductModelType.STL },
  { label: 'OBJ', value: ProductModelType.OBJ },
  { label: 'PLY', value: ProductModelType.PLY },
  { label: 'GLTF مضمّن', value: ProductModelType.GLTF_EMBEDDED },
];

export const PRODUCT_MATERIAL_OPTIONS: AdminEnumOption<ProductMaterial>[] = [
  { label: 'PLA', value: ProductMaterial.PLA },
  { label: 'PLA+', value: ProductMaterial.PLA_PLUS },
  { label: 'PETG', value: ProductMaterial.PETG },
  { label: 'راتنج (Resin)', value: ProductMaterial.RESIN },
  { label: 'خامة أخرى', value: ProductMaterial.OTHER },
];

export const PRODUCTION_TIME_UNIT_OPTIONS: AdminEnumOption<ProductionTimeUnit>[] = [
  { label: 'ساعات', value: ProductionTimeUnit.HOURS },
  { label: 'أيام عمل', value: ProductionTimeUnit.BUSINESS_DAYS },
];

export const MODEL_UPLOAD_HELP_TEXT = `${SUPPORTED_MODEL_FORMATS_LABEL} · الحد الأقصى ${MAX_MODEL_UPLOAD_SIZE_LABEL}`;
export const ADMIN_PRODUCT_MUTATION_TEXT = {
  review:
    'لم يتأكد الحذف أو تغيّرت نسخة المنتج. حمّل القائمة الحالية وراجع المنتج قبل تأكيد حذف جديد؛ لن نكرر الحذف تلقائيًا.',
  deleted: 'المنتج غير متاح أو حُذف بالفعل. حمّل القائمة الحالية للتحقق.',
  reload: 'تحميل القائمة الحالية للمراجعة',
};
