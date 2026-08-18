import { describe, expect, it } from 'vitest';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';
import { formatProductionEstimate, getSalePrice, hasValidDiscount } from './product-display.util';

describe('product display utilities', () => {
  it('accepts only a non-negative discount below the regular price', () => {
    expect(hasValidDiscount(100, 80)).toBe(true);
    expect(hasValidDiscount(100, 100)).toBe(false);
    expect(hasValidDiscount(100, 120)).toBe(false);
    expect(hasValidDiscount(100, -1)).toBe(false);
    expect(getSalePrice(100, 100)).toBe(100);
  });

  it('formats only a complete made-to-order production estimate', () => {
    expect(formatProductionEstimate(true, 2, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe('2–4 business days');
    expect(formatProductionEstimate(false, 2, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe('');
    expect(formatProductionEstimate(true, null, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe('');
  });
});
