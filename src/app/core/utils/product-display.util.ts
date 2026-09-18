import { ProductionTimeUnit } from '../enums/production-time-unit.enum';
import { PRODUCTION_TIME_UNIT_LABELS } from './product-display.data';

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
  unit: ProductionTimeUnit | null,
): string {
  if (
    !isMadeToOrder ||
    typeof minimum !== 'number' ||
    typeof maximum !== 'number' ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum <= 0 ||
    maximum < minimum ||
    !unit
  ) {
    return '';
  }
  const labels = PRODUCTION_TIME_UNIT_LABELS.find((item) => item.value === unit);
  if (!labels) {
    return '';
  }
  const range = minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`;
  const usePlural = Number.isInteger(maximum) && maximum % 100 >= 3 && maximum % 100 <= 10;
  const unitLabel = usePlural ? labels.plural : labels.singular;
  return `${range} ${unitLabel}`;
}
