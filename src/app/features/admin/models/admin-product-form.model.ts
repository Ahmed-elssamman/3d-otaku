import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import { Product } from '@core/models/product.model';
import { ManufacturingReview } from './manufacturing-review.model';

export { ManufacturingReviewStatus as AdminManufacturingReviewStatus } from '../enums/manufacturing-review.enum';

export interface AdminManufacturingReview extends ManufacturingReview {}

export interface AdminProductRecord extends Product {
  revision: number | null;
  requiresManufacturingReview?: boolean;
  manufacturingReview?: AdminManufacturingReview;
}

export interface AdminProductRevisionRequest {
  expectedRevision: number;
}

export interface AdminProductPayload extends Omit<
  Product,
  | 'id'
  | '_id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'imageVariants'
  | 'configurationFingerprint'
> {}

export interface AdminProductUpdateRequest
  extends AdminProductPayload, AdminProductRevisionRequest {}

export interface AdminProductConflictField {
  key: keyof AdminProductFormValue;
  label: string;
  current: string;
  local: string;
}

export interface AdminProductFormValue {
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string;
  description: string;
  price: number | null;
  discountPrice: number | null;
  badge: ProductBadge;
  isFeatured: boolean;
  isActive: boolean;
  mainImage: string;
  galleryImages: string;
  modelUrl: string;
  modelType: ProductModelType;
  posterImage: string;
  imageAlt: string;
  socialImage: string;
  material: ProductMaterial | null;
  finish: string;
  color: string;
  size: string;
  weight: string;
  printTime: string;
  isMadeToOrder: boolean;
  productionTimeMin: number | null;
  productionTimeMax: number | null;
  productionTimeUnit: ProductionTimeUnit | null;
  layerHeight: string;
  infill: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  tags: string;
  safetyNote: string;
}
