import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductSort } from './enums/product-sort.enum';
import { ApiMeta } from '@core/models/api-response.model';

export interface SortOption {
  label: string;
  value: ProductSort;
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'اختيارات المتجر', value: ProductSort.FEATURED },
  { label: 'الأحدث', value: ProductSort.NEWEST },
  { label: 'السعر: من الأقل للأعلى', value: ProductSort.PRICE_LOW },
  { label: 'السعر: من الأعلى للأقل', value: ProductSort.PRICE_HIGH },
];

export const INITIAL_PRODUCT_META: ApiMeta = {
  page: 1,
  limit: 12,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export const CATEGORY_OPTIONS: string[] = [
  ProductCategory.ALL,
  ProductCategory.SWORDS,
  ProductCategory.DAGGERS,
  ProductCategory.COSPLAY_PROPS,
  ProductCategory.DESK_MODELS,
  ProductCategory.COLLECTIBLES,
  ProductCategory.CUSTOM_ORDERS,
];
