import { CheckoutQuote, CheckoutQuoteRequest } from '../models/order.model';
import { normalizeCheckoutQuote } from './checkout-quote.util';
import { CheckoutQuoteVersion } from '../enums/checkout-quote-version.enum';
import { ProductConfigurationVersion } from '../enums/product-configuration-version.enum';
import { ProductionTimeUnit } from '../enums/production-time-unit.enum';

describe('checkout quote validation', () => {
  const request: CheckoutQuoteRequest = { items: [{ productId: 'product-1', quantity: 2 }] };
  const quote: CheckoutQuote = {
    quoteVersion: CheckoutQuoteVersion.Current,
    quoteFingerprint: 'a'.repeat(64),
    currency: 'EGP',
    items: [
      {
        productId: 'product-1',
        slug: 'piece',
        name: 'قطعة',
        image: '',
        quantity: 2,
        unitPrice: 120,
        discountPrice: 99.75,
        lineTotal: 199.5,
        configurationFingerprint: 'b'.repeat(64),
        configuration: {
          version: ProductConfigurationVersion.Current,
          material: 'PLA+',
          finish: 'Matte',
          color: 'White',
          size: '120 × 80 mm',
          weight: '45',
          printTime: '3 hours',
          layerHeight: '0.2 mm',
          infill: '15%',
          isMadeToOrder: true,
          productionTimeMin: 2,
          productionTimeMax: 4,
          productionTimeUnit: ProductionTimeUnit.BUSINESS_DAYS,
          safetyNote: 'للعرض فقط',
        },
      },
    ],
    subtotal: 199.5,
    discount: 0,
    deliveryFee: 25.5,
    deliveryFeeConfirmed: true,
    total: 225,
    estimatedDeliveryDays: '',
  };

  it('keeps exact discounted prices and explicit unknown versus free shipping distinct', () => {
    expect(normalizeCheckoutQuote(quote, request)).toEqual(quote);
    const free = { ...quote, deliveryFee: 0, total: 199.5 };
    expect(normalizeCheckoutQuote(free, request)?.deliveryFeeConfirmed).toBe(true);
    expect(
      normalizeCheckoutQuote({ ...free, deliveryFeeConfirmed: false }, request)
        ?.deliveryFeeConfirmed,
    ).toBe(false);
  });

  it('rejects changed product identities or quantities and inconsistent totals', () => {
    expect(
      normalizeCheckoutQuote(
        { ...quote, items: [{ ...quote.items[0], productId: 'other' }] },
        request,
      ),
    ).toBeNull();
    expect(
      normalizeCheckoutQuote({ ...quote, items: [{ ...quote.items[0], quantity: 3 }] }, request),
    ).toBeNull();
    expect(normalizeCheckoutQuote({ ...quote, subtotal: 200, total: 225.5 }, request)).toBeNull();
    expect(normalizeCheckoutQuote({ ...quote, deliveryFeeConfirmed: false }, request)).toBeNull();
  });

  it('rejects malformed quote identity and unsafe or fractional-piastre prices', () => {
    expect(normalizeCheckoutQuote({ ...quote, quoteFingerprint: '' }, request)).toBeNull();
    expect(normalizeCheckoutQuote({ ...quote, currency: 'USD' }, request)).toBeNull();
    expect(
      normalizeCheckoutQuote(
        { ...quote, items: [{ ...quote.items[0], discountPrice: 99.751 }] },
        request,
      ),
    ).toBeNull();
    expect(
      normalizeCheckoutQuote({ ...quote, total: Number.POSITIVE_INFINITY }, request),
    ).toBeNull();
  });

  it('rejects older quote protocols and incomplete or malformed purchased configurations', () => {
    const legacy = { ...quote };
    Reflect.deleteProperty(legacy, 'quoteVersion');
    expect(normalizeCheckoutQuote(legacy, request)).toBeNull();
    expect(
      normalizeCheckoutQuote({ ...quote, quoteVersion: 1 as CheckoutQuoteVersion }, request),
    ).toBeNull();
    const missing = { ...quote.items[0] };
    Reflect.deleteProperty(missing, 'configuration');
    expect(normalizeCheckoutQuote({ ...quote, items: [missing] }, request)).toBeNull();
    expect(
      normalizeCheckoutQuote(
        { ...quote, items: [{ ...quote.items[0], configurationFingerprint: '' }] },
        request,
      ),
    ).toBeNull();
    const configuration = { ...quote.items[0].configuration, productionTimeMax: 1 };
    expect(
      normalizeCheckoutQuote({ ...quote, items: [{ ...quote.items[0], configuration }] }, request),
    ).toBeNull();
  });

  it('keeps the reviewed raw specifications and strips private snapshot fields', () => {
    const item = quote.items[0];
    const response = {
      ...quote,
      items: [
        {
          ...item,
          manufacturingSnapshot: { measurementReference: 'private-reference' },
          configuration: { ...item.configuration, approvedBy: 'private-user' },
        },
      ],
    };
    const normalized = normalizeCheckoutQuote(response, request);
    expect(normalized).toEqual(quote);
    expect(normalized?.items[0].configuration.weight).toBe('45');
    expect(JSON.stringify(normalized)).not.toContain('private-');
    expect(normalized?.items[0].configuration).not.toBe(response.items[0].configuration);
  });
});
