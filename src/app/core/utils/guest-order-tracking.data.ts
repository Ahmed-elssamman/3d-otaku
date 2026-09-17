export const GUEST_ORDER_TRACKING_LINK = {
  path: '/track',
  maximumFragmentLength: 400,
  orderNumberPattern: /^[A-Za-z0-9][A-Za-z0-9-]{2,99}$/,
  tokenPattern: /^[a-f0-9]{64}$/,
};
