import { ProductCategory } from '../enums/product-category.enum';

export interface CategoryItem {
  id: string;
  name: ProductCategory;
  description: string;
  icon: string;
  itemCount: number;
  featuredImageUrl: string;
}
