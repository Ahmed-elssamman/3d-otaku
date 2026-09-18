import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';
import { ProductConfiguration } from '../models/product-configuration.model';
import { Product } from '../models/product.model';
import {
  PRODUCT_CONFIGURATION_RULES,
  PRODUCT_CONFIGURATION_SPEC_FIELDS,
} from './product-configuration.data';

export function normalizeConfigurationFingerprint(fingerprint: string | null): string | null {
  return typeof fingerprint === 'string' &&
    PRODUCT_CONFIGURATION_RULES.fingerprint.test(fingerprint)
    ? fingerprint
    : null;
}

export function normalizeProductConfiguration(
  configuration: Partial<ProductConfiguration> | null,
): ProductConfiguration | null {
  if (
    !configuration ||
    configuration.version !== ProductConfigurationVersion.Current ||
    !PRODUCT_CONFIGURATION_SPEC_FIELDS.every((field) => {
      const value = configuration[field];
      return typeof value === 'string' && value.length <= PRODUCT_CONFIGURATION_RULES.specLength;
    }) ||
    typeof configuration.isMadeToOrder !== 'boolean' ||
    typeof configuration.safetyNote !== 'string' ||
    configuration.safetyNote.length > PRODUCT_CONFIGURATION_RULES.safetyNoteLength
  )
    return null;

  const minimum = configuration.productionTimeMin;
  const maximum = configuration.productionTimeMax;
  const unit = configuration.productionTimeUnit;
  if (
    (minimum !== null &&
      (typeof minimum !== 'number' ||
        !Number.isFinite(minimum) ||
        minimum < 1 ||
        minimum > PRODUCT_CONFIGURATION_RULES.maximumProductionTime)) ||
    (maximum !== null &&
      (typeof maximum !== 'number' ||
        !Number.isFinite(maximum) ||
        maximum < 1 ||
        maximum > PRODUCT_CONFIGURATION_RULES.maximumProductionTime)) ||
    (unit !== null &&
      unit !== ProductionTimeUnit.HOURS &&
      unit !== ProductionTimeUnit.BUSINESS_DAYS) ||
    (configuration.isMadeToOrder &&
      (minimum === null || maximum === null || unit === null || maximum < minimum))
  )
    return null;

  return {
    version: ProductConfigurationVersion.Current,
    material: configuration.material ?? '',
    finish: configuration.finish ?? '',
    color: configuration.color ?? '',
    size: configuration.size ?? '',
    weight: configuration.weight ?? '',
    printTime: configuration.printTime ?? '',
    layerHeight: configuration.layerHeight ?? '',
    infill: configuration.infill ?? '',
    isMadeToOrder: configuration.isMadeToOrder,
    productionTimeMin: minimum,
    productionTimeMax: maximum,
    productionTimeUnit: unit,
    safetyNote: configuration.safetyNote,
  };
}

export function productConfiguration(product: Product): ProductConfiguration | null {
  return normalizeProductConfiguration({
    version: ProductConfigurationVersion.Current,
    material: product.material ?? '',
    finish: product.finish ?? '',
    color: product.color ?? '',
    size: product.size ?? '',
    weight: product.weight ?? '',
    printTime: product.printTime ?? '',
    layerHeight: product.layerHeight ?? '',
    infill: product.infill ?? '',
    isMadeToOrder: product.isMadeToOrder ?? false,
    productionTimeMin: product.productionTimeMin ?? null,
    productionTimeMax: product.productionTimeMax ?? null,
    productionTimeUnit: product.productionTimeUnit ?? null,
    safetyNote: product.safetyNote,
  });
}
