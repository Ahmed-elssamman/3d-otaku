export const CHECKOUT_QUOTE_RULES = {
  currency: 'EGP',
  fingerprint: /^[a-f0-9]{64}$/,
  amount: /^\d+(?:\.\d{1,2})?$/,
  decimalPlaces: 2,
  piastresPerPound: 100,
};

export const CHECKOUT_NOT_RECORDED_FIELD = 'checkoutNotRecorded';
export const CHECKOUT_TERMINAL_CONFLICT_FIELDS = [
  'checkoutSession',
  'checkoutDetails',
  'checkoutRecovery',
  'checkoutQuote',
];
