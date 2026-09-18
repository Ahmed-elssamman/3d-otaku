import { CheckoutQuote, CheckoutQuoteItem, CheckoutQuoteRequest } from '../models/order.model';
import { CheckoutQuoteVersion } from '../enums/checkout-quote-version.enum';
import { CHECKOUT_QUOTE_RULES } from './checkout-quote.data';
import {
  normalizeConfigurationFingerprint,
  normalizeProductConfiguration,
} from './product-configuration.util';

export function checkoutPiastres(value: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const text = String(value);
  if (!CHECKOUT_QUOTE_RULES.amount.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result =
    BigInt(whole) * BigInt(CHECKOUT_QUOTE_RULES.piastresPerPound) +
    BigInt(fraction.padEnd(CHECKOUT_QUOTE_RULES.decimalPlaces, '0'));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}

export function normalizeCheckoutQuote(
  quote: CheckoutQuote,
  request: CheckoutQuoteRequest,
): CheckoutQuote | null {
  if (
    !quote ||
    quote.quoteVersion !== CheckoutQuoteVersion.Current ||
    typeof quote.quoteFingerprint !== 'string' ||
    !CHECKOUT_QUOTE_RULES.fingerprint.test(quote.quoteFingerprint) ||
    quote.currency !== CHECKOUT_QUOTE_RULES.currency ||
    !Array.isArray(quote.items) ||
    quote.items.length !== request.items.length ||
    typeof quote.deliveryFeeConfirmed !== 'boolean' ||
    typeof quote.estimatedDeliveryDays !== 'string'
  )
    return null;
  const subtotal = checkoutPiastres(quote.subtotal);
  const delivery = checkoutPiastres(quote.deliveryFee);
  const total = checkoutPiastres(quote.total);
  if (
    subtotal === null ||
    delivery === null ||
    total === null ||
    quote.discount !== 0 ||
    (!quote.deliveryFeeConfirmed && delivery !== 0) ||
    subtotal + delivery !== total ||
    !Number.isSafeInteger(subtotal + delivery)
  )
    return null;

  let itemTotal = 0;
  const items: CheckoutQuoteItem[] = [];
  const seen = new Set<string>();
  for (const item of quote.items) {
    if (
      !item ||
      typeof item.productId !== 'string' ||
      seen.has(item.productId) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.slug !== 'string' ||
      typeof item.image !== 'string'
    )
      return null;
    const configuration = normalizeProductConfiguration(item.configuration);
    const configurationFingerprint = normalizeConfigurationFingerprint(
      item.configurationFingerprint,
    );
    if (!configuration || !configurationFingerprint) return null;
    seen.add(item.productId);
    const requested = request.items.find((entry) => entry.productId === item.productId);
    if (
      !requested ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      requested.quantity !== item.quantity
    )
      return null;
    const price = checkoutPiastres(item.unitPrice);
    const discount = item.discountPrice === null ? null : checkoutPiastres(item.discountPrice);
    const line = checkoutPiastres(item.lineTotal);
    if (
      price === null ||
      line === null ||
      (item.discountPrice !== null && (discount === null || discount >= price))
    )
      return null;
    const expectedLine = (discount ?? price) * item.quantity;
    if (!Number.isSafeInteger(expectedLine) || line !== expectedLine) return null;
    itemTotal += line;
    if (!Number.isSafeInteger(itemTotal)) return null;
    items.push({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPrice: item.discountPrice,
      lineTotal: item.lineTotal,
      configuration,
      configurationFingerprint,
    });
  }
  if (itemTotal !== subtotal) return null;
  return {
    quoteVersion: CheckoutQuoteVersion.Current,
    quoteFingerprint: quote.quoteFingerprint,
    currency: quote.currency,
    items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    deliveryFee: quote.deliveryFee,
    deliveryFeeConfirmed: quote.deliveryFeeConfirmed,
    total: quote.total,
    estimatedDeliveryDays: quote.estimatedDeliveryDays,
  };
}
