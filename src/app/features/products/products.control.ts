import { ProductCategory } from '@core/enums/product-category.enum';

export interface SortOption {
  label: string;
  value: 'price-asc' | 'price-desc' | 'rating-desc' | 'name-asc';
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Sort by: Featured', value: 'rating-desc' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name: A to Z', value: 'name-asc' }
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
