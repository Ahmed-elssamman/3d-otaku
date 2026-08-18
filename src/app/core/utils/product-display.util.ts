import { ProductionTimeUnit } from '../enums/production-time-unit.enum';

export function hasValidDiscount(price: number, discountPrice: number | null = null): boolean {
  return typeof discountPrice === 'number' && discountPrice >= 0 && discountPrice < price;
}

export function getSalePrice(price: number, discountPrice: number | null = null): number {
  return hasValidDiscount(price, discountPrice) ? Number(discountPrice) : price;
}

export function formatProductionEstimate(
  isMadeToOrder: boolean,
  minimum: number | null,
  maximum: number | null,
  unit: ProductionTimeUnit | null
): string {
  if (!isMadeToOrder || typeof minimum !== 'number' || typeof maximum !== 'number' || maximum < minimum || !unit) {
    return '';
  }
  const range = minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`;
  const unitLabel = unit === ProductionTimeUnit.BUSINESS_DAYS ? 'business days' : 'hours';
  return `${range} ${unitLabel}`;
}
