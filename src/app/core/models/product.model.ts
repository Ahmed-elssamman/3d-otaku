import { ProductCategory } from '../enums/product-category.enum';
import { ProductBadge } from '../enums/product-badge.enum';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  rating: number;
  image: string;
  modelUrl: string;
  tags: string[];
  material: string;
  size: string;
  weight: string;
  printTime: string;
  isFeatured: boolean;
  badge?: ProductBadge;
}
