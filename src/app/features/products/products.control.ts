import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductSort } from './enums/product-sort.enum';

export interface SortOption {
  label: string;
  value: ProductSort;
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Featured first', value: ProductSort.FEATURED },
  { label: 'Newest', value: ProductSort.NEWEST },
  { label: 'Price: Low to High', value: ProductSort.PRICE_LOW },
  { label: 'Price: High to Low', value: ProductSort.PRICE_HIGH }
];

export const CATEGORY_OPTIONS: string[] = [
  ProductCategory.ALL,
  ProductCategory.SWORDS,
  ProductCategory.DAGGERS,
  ProductCategory.COSPLAY_PROPS,
  ProductCategory.DESK_MODELS,
  ProductCategory.COLLECTIBLES,
  ProductCategory.CUSTOM_ORDERS
];
