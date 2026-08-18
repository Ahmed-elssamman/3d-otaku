import { ProductSort } from '../enums/product-sort.enum';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  featured?: boolean;
}

export interface AdminProductQuery extends ProductQuery {
  status?: 'active' | 'inactive' | 'all';
}
