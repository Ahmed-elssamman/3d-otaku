import { ProductCategory } from '../enums/product-category.enum';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productsCount: number;
}

export interface CategoryItem {
  id: string;
  name: ProductCategory;
  description: string;
  icon: string;
  itemCount: number;
  featuredImageUrl: string;
}
