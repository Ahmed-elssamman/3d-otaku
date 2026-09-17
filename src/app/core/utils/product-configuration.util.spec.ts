import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';
import { ProductConfiguration } from '../models/product-configuration.model';
import { Product } from '../models/product.model';
import { ProductMaterial } from '../enums/product-material.enum';
import {
  normalizeConfigurationFingerprint,
  normalizeProductConfiguration,
  productConfiguration,
} from './product-configuration.util';

describe('purchased product configuration validation', () => {
  const configuration: ProductConfiguration = {
    version: ProductConfigurationVersion.Current,
    material: 'PLA+',
    finish: '',
    color: 'White',
    size: '120 mm',
    weight: '45',
    printTime: '',
    layerHeight: '',
    infill: '',
    isMadeToOrder: false,
    productionTimeMin: null,
    productionTimeMax: null,
    productionTimeUnit: null,
    safetyNote: '',
  };

  it('preserves raw values, explicit empty measurements and null timing without inventing units', () => {
    expect(normalizeProductConfiguration(configuration)).toEqual(configuration);
    const raw = { ...configuration, finish: ' Matte ', weight: '45', safetyNote: ' ملاحظة ' };
    expect(normalizeProductConfiguration(raw)).toEqual(raw);
    expect(normalizeProductConfiguration(null)).toBeNull();
    expect(normalizeProductConfiguration({})).toBeNull();
  });

  it('requires the complete bounded contract and drops unrecognized private properties', () => {
    for (const key of Object.keys(configuration)) {
      const incomplete: Partial<ProductConfiguration> = { ...configuration };
      Reflect.deleteProperty(incomplete, key);
      expect(normalizeProductConfiguration(incomplete), key).toBeNull();
    }
    expect(
      normalizeProductConfiguration({ ...configuration, material: 'x'.repeat(501) }),
    ).toBeNull();
    expect(
      normalizeProductConfiguration({ ...configuration, safetyNote: 'x'.repeat(5001) }),
    ).toBeNull();
    expect(
      normalizeProductConfiguration({ ...configuration, material: 'x'.repeat(500) }),
    ).not.toBeNull();
    const privateResponse = { ...configuration, rightsReference: 'private-license' };
    expect(normalizeProductConfiguration(privateResponse)).toEqual(configuration);
  });

  it('requires valid ordered production estimates when made to order', () => {
    const timed: ProductConfiguration = {
      ...configuration,
      isMadeToOrder: true,
      productionTimeMin: 1,
      productionTimeMax: 2.5,
      productionTimeUnit: ProductionTimeUnit.HOURS,
    };
    expect(normalizeProductConfiguration(timed)).toEqual(timed);
    expect(normalizeProductConfiguration({ ...timed, productionTimeMin: null })).toBeNull();
    expect(normalizeProductConfiguration({ ...timed, productionTimeMax: null })).toBeNull();
    expect(normalizeProductConfiguration({ ...timed, productionTimeUnit: null })).toBeNull();
    expect(normalizeProductConfiguration({ ...timed, productionTimeMax: 0.5 })).toBeNull();
    expect(
      normalizeProductConfiguration({ ...timed, productionTimeMax: Number.POSITIVE_INFINITY }),
    ).toBeNull();
    expect(normalizeProductConfiguration({ ...timed, productionTimeMin: 3 })).toBeNull();
  });

  it('accepts only exact opaque configuration fingerprints', () => {
    const fingerprint = 'abcdef01'.repeat(8);
    expect(normalizeConfigurationFingerprint(fingerprint)).toBe(fingerprint);
    expect(normalizeConfigurationFingerprint(null)).toBeNull();
    expect(normalizeConfigurationFingerprint('')).toBeNull();
    expect(normalizeConfigurationFingerprint(fingerprint.toUpperCase())).toBeNull();
    expect(normalizeConfigurationFingerprint(` ${fingerprint}`)).toBeNull();
    expect(normalizeConfigurationFingerprint(fingerprint.slice(1))).toBeNull();
  });

  it('represents absent legacy product specifications as empty without mutating facts or accepting non-string measurements', () => {
    const product: Product = {
      ...configuration,
      id: 'product-1',
      slug: 'piece',
      name: 'قطعة',
      category: 'decor',
      shortDescription: '',
      description: '',
      price: 100,
      image: '',
      gallery: [],
      tags: [],
      material: ProductMaterial.PLA_PLUS,
      layerHeight: null,
      infill: null,
      isFeatured: false,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    const saved = JSON.stringify(product);
    expect(productConfiguration(product)).toEqual(configuration);
    expect(JSON.stringify(product)).toBe(saved);
    const missing = { ...product };
    Reflect.deleteProperty(missing, 'finish');
    Reflect.set(missing, 'printTime', null);
    expect(productConfiguration(missing)).toEqual(configuration);
    Reflect.set(missing, 'weight', 45);
    expect(productConfiguration(missing)).toBeNull();
  });
});
