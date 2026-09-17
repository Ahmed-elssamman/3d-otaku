import { ProductConfigurationField } from '../enums/product-configuration-field.enum';
import { ProductSpecField } from '../enums/product-spec-field.enum';

export interface ProductConfigurationDisplayField {
  id: ProductConfigurationField;
  field: ProductSpecField;
  label: string;
}

export interface ProductConfigurationDisplayRow {
  id: ProductConfigurationField;
  label: string;
  value: string;
  rawValue: string;
}

export interface ProductConfigurationChange {
  id: ProductConfigurationField;
  label: string;
  previousValue: string;
  currentValue: string;
}
