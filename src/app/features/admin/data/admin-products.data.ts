import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { AdminFeaturedFilter } from '../enums/admin-featured-filter.enum';
import { AdminProductSort } from '../enums/admin-product-sort.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import {
  MAX_MODEL_UPLOAD_SIZE_LABEL,
  SUPPORTED_MODEL_FORMATS_LABEL
} from '@core/constants/model-file.constants';

export interface AdminOption {
  label: string;
  value: string;
}

export interface AdminEnumOption<T> {
  label: string;
  value: T;
}

export const ADMIN_CATEGORY_OPTIONS: AdminOption[] = [
  { label: 'All Categories', value: 'all' },
  { label: ProductCategory.SWORDS, value: ProductCategory.SWORDS },
  { label: ProductCategory.DAGGERS, value: ProductCategory.DAGGERS },
  { label: ProductCategory.ANIME_FIGURES, value: ProductCategory.ANIME_FIGURES },
  { label: ProductCategory.COSPLAY_PROPS, value: ProductCategory.COSPLAY_PROPS },
  { label: ProductCategory.DESK_MODELS, value: ProductCategory.DESK_MODELS },
  { label: ProductCategory.COLLECTIBLES, value: ProductCategory.COLLECTIBLES }
];

export const ADMIN_FEATURED_FILTER_OPTIONS: AdminOption[] = [
  { label: 'All Status', value: AdminFeaturedFilter.ALL },
  { label: 'Featured Only', value: AdminFeaturedFilter.FEATURED },
  { label: 'Not Featured', value: AdminFeaturedFilter.NOT_FEATURED }
];

export const ADMIN_SORT_OPTIONS: AdminOption[] = [
  { label: 'Newest', value: AdminProductSort.NEWEST },
  { label: 'Price Low to High', value: AdminProductSort.PRICE_ASC },
  { label: 'Price High to Low', value: AdminProductSort.PRICE_DESC },
  { label: 'Featured First', value: AdminProductSort.FEATURED_DESC }
];

export const PRODUCT_BADGE_OPTIONS: AdminEnumOption<ProductBadge>[] = [
  { label: 'None', value: ProductBadge.NONE },
  { label: 'New', value: ProductBadge.NEW },
  { label: 'Featured', value: ProductBadge.FEATURED }
];

export const PRODUCT_MODEL_TYPE_OPTIONS: AdminEnumOption<ProductModelType>[] = [
  { label: 'GLB', value: ProductModelType.GLB },
  { label: 'GLTF', value: ProductModelType.GLTF },
  { label: 'STL', value: ProductModelType.STL },
  { label: 'OBJ', value: ProductModelType.OBJ },
  { label: 'PLY', value: ProductModelType.PLY },
  { label: 'STL converted to GLB', value: ProductModelType.STL_CONVERTED_TO_GLB }
];

export const PRODUCT_MATERIAL_OPTIONS: AdminEnumOption<ProductMaterial>[] = [
  { label: 'PLA', value: ProductMaterial.PLA },
  { label: 'PLA+', value: ProductMaterial.PLA_PLUS }
  ,{ label: 'PETG', value: ProductMaterial.PETG }
  ,{ label: 'Resin', value: ProductMaterial.RESIN }
  ,{ label: 'Other', value: ProductMaterial.OTHER }
];

export const PRODUCTION_TIME_UNIT_OPTIONS: AdminEnumOption<ProductionTimeUnit>[] = [
  { label: 'Hours', value: ProductionTimeUnit.HOURS },
  { label: 'Business days', value: ProductionTimeUnit.BUSINESS_DAYS }
];

export const MODEL_UPLOAD_HELP_TEXT = `${SUPPORTED_MODEL_FORMATS_LABEL} • Maximum ${MAX_MODEL_UPLOAD_SIZE_LABEL}`;
