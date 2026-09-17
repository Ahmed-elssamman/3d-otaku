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

  it('localizes preparation ranges without changing their numbers or including shipping', () => {
    expect(formatProductionEstimate(true, 2, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe(
      '2–4 أيام عمل',
    );
    expect(formatProductionEstimate(true, 2, 6, ProductionTimeUnit.HOURS)).toBe('2–6 ساعات');
  });

  it('uses appropriate Arabic unit labels for a single stated duration', () => {
    expect(formatProductionEstimate(true, 1, 1, ProductionTimeUnit.BUSINESS_DAYS)).toBe(
      '1 يوم عمل',
    );
    expect(formatProductionEstimate(true, 1, 1, ProductionTimeUnit.HOURS)).toBe('1 ساعة');
    expect(formatProductionEstimate(true, 6, 6, ProductionTimeUnit.HOURS)).toBe('6 ساعات');
    expect(formatProductionEstimate(true, 18, 18, ProductionTimeUnit.HOURS)).toBe('18 ساعة');
  });

  it('preserves fractional stated ranges without rounding or converting units', () => {
    expect(formatProductionEstimate(true, 0.5, 1.5, ProductionTimeUnit.HOURS)).toBe('0.5–1.5 ساعة');
  });

  it('hides preparation estimates for stock products and incomplete durations', () => {
    expect(formatProductionEstimate(false, 2, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe('');
    expect(formatProductionEstimate(true, null, 4, ProductionTimeUnit.BUSINESS_DAYS)).toBe('');
    expect(formatProductionEstimate(true, 2, null, ProductionTimeUnit.BUSINESS_DAYS)).toBe('');
    expect(formatProductionEstimate(true, 2, 4, null)).toBe('');
  });

  it('does not infer hours from an unsupported stored unit', () => {
    expect(formatProductionEstimate(true, 2, 4, 'weeks' as ProductionTimeUnit)).toBe('');
  });

  it('does not display non-positive, reversed or non-finite duration ranges', () => {
    expect(formatProductionEstimate(true, 0, 4, ProductionTimeUnit.HOURS)).toBe('');
    expect(formatProductionEstimate(true, -2, -1, ProductionTimeUnit.HOURS)).toBe('');
    expect(formatProductionEstimate(true, -2, 4, ProductionTimeUnit.HOURS)).toBe('');
    expect(formatProductionEstimate(true, 4, 2, ProductionTimeUnit.HOURS)).toBe('');
    expect(formatProductionEstimate(true, Number.NaN, 4, ProductionTimeUnit.HOURS)).toBe('');
    expect(
      formatProductionEstimate(true, 2, Number.POSITIVE_INFINITY, ProductionTimeUnit.HOURS),
    ).toBe('');
  });
});
