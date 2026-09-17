import { ProductSpecField } from '../enums/product-spec-field.enum';
import { ProductMeasurementDisplay, ProductSpecLabel } from '../models/product-spec-display.model';
import {
  PRODUCT_COLOR_LABELS,
  PRODUCT_FINISH_LABELS,
  PRODUCT_MATERIAL_LABELS,
  PRODUCT_PRINT_TIME_LABELS,
  PRODUCT_SPEC_COLOR_SEPARATOR,
  PRODUCT_SPEC_DIMENSION_SEPARATOR,
  PRODUCT_SPEC_DISPLAY_TEXT,
  PRODUCT_SPEC_NUMBER_PATTERN,
  PRODUCT_SPEC_UNITS,
  PRODUCT_SPEC_ZERO_PATTERN,
} from './product-spec-display.data';

function localizeLabel(value: string, labels: ProductSpecLabel[]): string {
  return labels.find((item) => item.source === value.toLowerCase())?.label ?? value;
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatMeasurement(field: ProductSpecField, value: string): ProductMeasurementDisplay {
  const units = PRODUCT_SPEC_UNITS.filter((unit) => unit.fields.includes(field));
  const aliases = units
    .flatMap((unit) => unit.aliases)
    .map(escapePattern)
    .join('|');
  const quantity = `${PRODUCT_SPEC_NUMBER_PATTERN}(?:\\s*(?:${aliases}))?`;
  const expression = new RegExp(
    `^${quantity}(?:${PRODUCT_SPEC_DIMENSION_SEPARATOR}${quantity})*$`,
    'iu',
  );
  if (!expression.test(value)) {
    return { value, hasExplicitUnit: false, isNumeric: false };
  }

  let hasExplicitUnit = false;
  let formatted = value;
  for (const unit of units) {
    const pattern = new RegExp(
      `(${PRODUCT_SPEC_NUMBER_PATTERN})\\s*(?:${unit.aliases.map(escapePattern).join('|')})(?=$|\\s|[xX×–-])`,
      'giu',
    );
    formatted = formatted.replace(pattern, (_match: string, quantity: string) => {
      hasExplicitUnit = true;
      return `${quantity} ${unit.label}`;
    });
  }
  formatted = formatted.replace(/\s*[xX×]\s*/g, ' × ');
  return { value: formatted, hasExplicitUnit, isNumeric: true };
}

export function formatProductSpecValue(field: ProductSpecField, rawValue: string): string {
  const value = rawValue.trim();
  if (!value || PRODUCT_SPEC_ZERO_PATTERN.test(value)) {
    return '';
  }
  switch (field) {
    case ProductSpecField.MATERIAL:
      return localizeLabel(value, PRODUCT_MATERIAL_LABELS);
    case ProductSpecField.FINISH:
      return localizeLabel(value, PRODUCT_FINISH_LABELS);
    case ProductSpecField.COLOR:
      return value
        .split(PRODUCT_SPEC_COLOR_SEPARATOR)
        .map((color) => localizeLabel(color.trim(), PRODUCT_COLOR_LABELS))
        .filter(Boolean)
        .join(PRODUCT_SPEC_DISPLAY_TEXT.colorSeparator);
    case ProductSpecField.PRINT_TIME: {
      const label = localizeLabel(value, PRODUCT_PRINT_TIME_LABELS);
      if (label !== value) {
        return label;
      }
      break;
    }
  }

  const measurement = formatMeasurement(field, value);
  if (measurement.isNumeric && !measurement.hasExplicitUnit) {
    return `${measurement.value} (${PRODUCT_SPEC_DISPLAY_TEXT.missingUnit})`;
  }
  return measurement.value;
}

export function formatProductCardSize(rawValue: string): string {
  const value = rawValue.trim();
  if (!value || PRODUCT_SPEC_ZERO_PATTERN.test(value)) {
    return '';
  }
  const measurement = formatMeasurement(ProductSpecField.SIZE, value);
  return measurement.hasExplicitUnit ? measurement.value : '';
}
