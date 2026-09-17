import { ProductSpecField } from '../enums/product-spec-field.enum';

export interface ProductSpecLabel {
  source: string;
  label: string;
}

export interface ProductSpecUnit {
  fields: ProductSpecField[];
  aliases: string[];
  label: string;
}

export interface ProductMeasurementDisplay {
  value: string;
  hasExplicitUnit: boolean;
  isNumeric: boolean;
}
