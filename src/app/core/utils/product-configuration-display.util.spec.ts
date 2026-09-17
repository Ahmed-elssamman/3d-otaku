import { ProductConfigurationField } from '../enums/product-configuration-field.enum';
import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';
import { ProductConfiguration } from '../models/product-configuration.model';
import {
  configurationChanges,
  configurationDisplayRows,
} from './product-configuration-display.util';

describe('stored product configuration display', () => {
  const configuration: ProductConfiguration = {
    version: ProductConfigurationVersion.Current,
    material: 'PLA+',
    finish: 'Matte',
    color: 'Black / أزرق داكن',
    size: '20',
    weight: '70',
    printTime: '2 hours',
    layerHeight: '0.2',
    infill: '20%',
    isMadeToOrder: true,
    productionTimeMin: 2,
    productionTimeMax: 3,
    productionTimeUnit: ProductionTimeUnit.BUSINESS_DAYS,
    safetyNote: 'للزينة، بعيدًا عن اللهب.',
  };

  it('retains unit uncertainty and stored safety and duration facts in Arabic', () => {
    const rows = configurationDisplayRows(configuration);
    expect(rows.find((row) => row.id === ProductConfigurationField.Size)?.value).toBe(
      '20 (الوحدة غير مذكورة)',
    );
    expect(rows.find((row) => row.id === ProductConfigurationField.Weight)?.value).toBe(
      '70 (الوحدة غير مذكورة)',
    );
    expect(rows.find((row) => row.id === ProductConfigurationField.Color)?.value).toBe(
      'أسود، أزرق داكن',
    );
    expect(rows.find((row) => row.id === ProductConfigurationField.ProductionTime)?.value).toBe(
      '2–3 أيام عمل',
    );
    expect(rows.find((row) => row.id === ProductConfigurationField.SafetyNote)?.value).toBe(
      configuration.safetyNote,
    );
  });

  it('compares raw saved specifications even when their translated labels are equal', () => {
    const changes = configurationChanges(
      { ...configuration, color: 'Grey' },
      { ...configuration, color: 'Gray' },
    );
    expect(changes).toEqual([
      {
        id: ProductConfigurationField.Color,
        label: 'اللون',
        previousValue: 'رمادي',
        currentValue: 'رمادي',
      },
    ]);
    expect(configurationChanges(configuration, { ...configuration })).toEqual([]);
    expect(configurationChanges(configuration, { ...configuration, size: '20 cm' })).toContainEqual(
      {
        id: ProductConfigurationField.Size,
        label: 'المقاسات المذكورة',
        previousValue: '20 (الوحدة غير مذكورة)',
        currentValue: '20 سم',
      },
    );
  });

  it('does not manufacture legacy specifications or a manufacturing duration from missing fields', () => {
    expect(configurationDisplayRows(null)).toEqual([]);
    const rows = configurationDisplayRows({
      ...configuration,
      isMadeToOrder: false,
      productionTimeMin: null,
      productionTimeMax: null,
      productionTimeUnit: null,
    });
    expect(rows.find((row) => row.id === ProductConfigurationField.ProductionTime)?.value).toBe(
      'غير مذكور',
    );
    expect(
      rows.find((row) => row.id === ProductConfigurationField.MadeToOrder)?.value,
    ).not.toContain('جاهز');
  });
});
