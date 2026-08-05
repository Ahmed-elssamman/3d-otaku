export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating' | 'featured';
  featured?: boolean;
}

export interface AdminProductQuery extends ProductQuery {
  status?: 'active' | 'inactive' | 'all';
}
