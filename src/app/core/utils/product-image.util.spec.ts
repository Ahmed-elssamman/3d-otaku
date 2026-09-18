import { describe, expect, it } from 'vitest';
import { ProductImageKind } from '../enums/product-image-kind.enum';
import { ProductImage, ProductImageVariant } from '../models/product-image.model';
import { getUniqueProductImageSources } from './product-image.util';

function variant(hashCharacter: string, kind: ProductImageKind): ProductImageVariant {
  return {
    kind,
    url: `/uploads/images/variants/${hashCharacter.repeat(64)}.webp`,
    width: kind === ProductImageKind.THUMBNAIL ? 120 : 400,
    height: kind === ProductImageKind.THUMBNAIL ? 160 : 533,
    size: 1000,
    mimeType: 'image/webp',
  };
}

function image(sourceUrl: string, variants: ProductImageVariant[]): ProductImage {
  return { sourceUrl, width: 400, height: 533, variants };
}

describe('unique product gallery sources', () => {
  it('retains the first original source when aliases share an identical generated detail image', () => {
    const sources = ['/primary.webp', '/alias.webp', '/another-angle.webp'];
    const metadata = [
      image(sources[0], [variant('a', ProductImageKind.DETAIL)]),
      image(sources[1], [variant('a', ProductImageKind.DETAIL)]),
      image(sources[2], [variant('b', ProductImageKind.DETAIL)]),
    ];
    const originalMetadata = structuredClone(metadata);

    expect(getUniqueProductImageSources(sources, metadata)).toEqual([
      '/primary.webp',
      '/another-angle.webp',
    ]);
    expect(sources).toEqual(['/primary.webp', '/alias.webp', '/another-angle.webp']);
    expect(metadata).toEqual(originalMetadata);
  });

  it('preserves distinct full images even when their small thumbnails share content', () => {
    const sources = ['/first.webp', '/second.webp'];
    const metadata = [
      image(sources[0], [
        variant('a', ProductImageKind.THUMBNAIL),
        variant('b', ProductImageKind.DETAIL),
      ]),
      image(sources[1], [
        variant('a', ProductImageKind.THUMBNAIL),
        variant('c', ProductImageKind.DETAIL),
      ]),
    ];

    expect(getUniqueProductImageSources(sources, metadata)).toEqual(sources);
  });

  it('does not infer duplicate content from missing metadata or ordinary shared image URLs', () => {
    const shared = { ...variant('a', ProductImageKind.DETAIL), url: '/uploads/ordinary.webp' };
    const sources = ['/first.webp', '/second.webp', '/legacy.webp', '/legacy.webp'];
    const metadata = [image(sources[0], [shared]), image(sources[1], [shared])];

    expect(getUniqueProductImageSources(sources, metadata)).toEqual([
      '/first.webp',
      '/second.webp',
      '/legacy.webp',
    ]);
  });
});
