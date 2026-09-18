import { ProductSpecField } from '../enums/product-spec-field.enum';

export const PRODUCT_CONFIGURATION_RULES = {
  specLength: 500,
  safetyNoteLength: 5000,
  maximumProductionTime: Number.MAX_SAFE_INTEGER,
  fingerprint: /^[a-f0-9]{64}$/,
};

export const PRODUCT_CONFIGURATION_SPEC_FIELDS = [
  ProductSpecField.MATERIAL,
  ProductSpecField.FINISH,
  ProductSpecField.COLOR,
  ProductSpecField.SIZE,
  ProductSpecField.WEIGHT,
  ProductSpecField.PRINT_TIME,
  ProductSpecField.LAYER_HEIGHT,
  ProductSpecField.INFILL,
];
