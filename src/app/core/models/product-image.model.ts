import { ProductImageKind } from '../enums/product-image-kind.enum';

export interface ProductImageVariant {
  kind: ProductImageKind;
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface ProductImage {
  sourceUrl: string;
  width: number;
  height: number;
  variants: ProductImageVariant[];
}

export interface ProductImageView {
  sourceUrl: string;
  url: string;
  srcset: string;
  width: number;
  height: number;
}
