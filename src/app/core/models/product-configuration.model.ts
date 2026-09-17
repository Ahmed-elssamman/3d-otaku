import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';

export interface ProductConfiguration {
  version: ProductConfigurationVersion;
  material: string;
  finish: string;
  color: string;
  size: string;
  weight: string;
  printTime: string;
  layerHeight: string;
  infill: string;
  isMadeToOrder: boolean;
  productionTimeMin: number | null;
  productionTimeMax: number | null;
  productionTimeUnit: ProductionTimeUnit | null;
  safetyNote: string;
}
