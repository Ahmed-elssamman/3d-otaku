import { Product } from '../models/product.model';
import { ProductImage, ProductImageView } from '../models/product-image.model';
import { ProductImageKind } from '../enums/product-image-kind.enum';

export function getUniqueProductImageSources(
  sources: string[],
  imageVariants: ProductImage[] = [],
): string[] {
  const seenSources = new Set<string>();
  const seenVariants = new Set<string>();
  return sources.filter((source) => {
    if (seenSources.has(source)) return false;
    seenSources.add(source);
    const detail = imageVariants
      .find((image) => image.sourceUrl === source)
      ?.variants.find((variant) => variant.kind === ProductImageKind.DETAIL);
    if (!detail || !/^\/uploads\/images\/variants\/[a-f0-9]{64}\.webp$/.test(detail.url))
      return true;
    if (seenVariants.has(detail.url)) return false;
    seenVariants.add(detail.url);
    return true;
  });
}

export function getProductImage(
  product: Product,
  sourceUrl: string,
  kind: ProductImageKind,
  failedUrls: string[] = [],
): ProductImageView {
  const metadata = product.imageVariants?.find((image) => image.sourceUrl === sourceUrl);
  const variants = metadata?.variants.filter((variant) => !failedUrls.includes(variant.url)) ?? [];
  const selected = variants.find((variant) => variant.kind === kind);
  const widths = new Map(variants.map((variant) => [variant.width, variant]));
  return {
    sourceUrl,
    url: selected?.url ?? sourceUrl,
    srcset: selected
      ? [...widths.values()]
          .sort((a, b) => a.width - b.width)
          .map((variant) => `${variant.url} ${variant.width}w`)
          .join(', ')
      : '',
    width: selected?.width ?? metadata?.width ?? 720,
    height: selected?.height ?? metadata?.height ?? 720,
  };
}
