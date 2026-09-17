import { ProductionTimeUnit } from '../enums/production-time-unit.enum';

export interface ProductionTimeUnitLabel {
  value: ProductionTimeUnit;
  singular: string;
  plural: string;
}

export const PRODUCTION_TIME_UNIT_LABELS: ProductionTimeUnitLabel[] = [
  { value: ProductionTimeUnit.HOURS, singular: 'ساعة', plural: 'ساعات' },
  { value: ProductionTimeUnit.BUSINESS_DAYS, singular: 'يوم عمل', plural: 'أيام عمل' },
];
