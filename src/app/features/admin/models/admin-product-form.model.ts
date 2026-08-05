import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';

export interface AdminProductFormValue {
  name: string;
  slug: string;
  category: ProductCategory | null;
  shortDescription: string;
  description: string;
  price: number | null;
  discountPrice: number | null;
  rating: number | null;
  badge: ProductBadge | null;
  isFeatured: boolean;
  isActive: boolean;
  mainImage: string;
  galleryImages: string;
  modelUrl: string;
  modelType: ProductModelType | null;
  posterImage: string;
  material: ProductMaterial | null;
  finish: string;
  color: string;
  size: string;
  weight: string;
  printTime: string;
  layerHeight: string;
  infill: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  safetyNote: string;
}
