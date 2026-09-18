import { ProductConfigurationField } from '../enums/product-configuration-field.enum';
import { ProductConfiguration } from '../models/product-configuration.model';
import {
  ProductConfigurationChange,
  ProductConfigurationDisplayRow,
} from '../models/product-configuration-display.model';
import {
  CONFIGURATION_DISPLAY_TEXT,
  CONFIGURATION_SPEC_FIELDS,
} from './product-configuration-display.data';
import { formatProductSpecValue } from './product-spec-display.util';
import { formatProductionEstimate } from './product-display.util';

export function configurationDisplayRows(
  configuration: ProductConfiguration | null,
): ProductConfigurationDisplayRow[] {
  if (!configuration) return [];
  return [
    ...CONFIGURATION_SPEC_FIELDS.map((field) => ({
      id: field.id,
      label: field.label,
      rawValue: configuration[field.field],
      value:
        formatProductSpecValue(field.field, configuration[field.field]) ||
        CONFIGURATION_DISPLAY_TEXT.missing,
    })),
    {
      id: ProductConfigurationField.MadeToOrder,
      label: CONFIGURATION_DISPLAY_TEXT.madeToOrderLabel,
      rawValue: String(configuration.isMadeToOrder),
      value: configuration.isMadeToOrder
        ? CONFIGURATION_DISPLAY_TEXT.madeToOrder
        : CONFIGURATION_DISPLAY_TEXT.notMadeToOrder,
    },
    {
      id: ProductConfigurationField.ProductionTime,
      label: CONFIGURATION_DISPLAY_TEXT.productionTime,
      rawValue: JSON.stringify([
        configuration.productionTimeMin,
        configuration.productionTimeMax,
        configuration.productionTimeUnit,
      ]),
      value:
        formatProductionEstimate(
          true,
          configuration.productionTimeMin,
          configuration.productionTimeMax,
          configuration.productionTimeUnit,
        ) || CONFIGURATION_DISPLAY_TEXT.missing,
    },
    {
      id: ProductConfigurationField.SafetyNote,
      label: CONFIGURATION_DISPLAY_TEXT.safetyNote,
      rawValue: configuration.safetyNote,
      value: configuration.safetyNote.trim() || CONFIGURATION_DISPLAY_TEXT.missing,
    },
  ];
}

export function configurationChanges(
  previous: ProductConfiguration | null,
  current: ProductConfiguration,
): ProductConfigurationChange[] {
  const previousRows = configurationDisplayRows(previous);
  return configurationDisplayRows(current)
    .filter((row) => previousRows.find((entry) => entry.id === row.id)?.rawValue !== row.rawValue)
    .map((row) => ({
      id: row.id,
      label: row.label,
      previousValue:
        previousRows.find((entry) => entry.id === row.id)?.value ??
        CONFIGURATION_DISPLAY_TEXT.missing,
      currentValue: row.value,
    }));
}
