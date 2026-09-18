import {
  createGuestOrderTrackingUrl,
  parseGuestOrderTrackingFragment,
} from './guest-order-tracking.util';

describe('private guest tracking links', () => {
  const reference = { orderNumber: 'ORD-MU52JVAG-2B00775F7573', trackingToken: 'a'.repeat(64) };

  it('keeps credentials entirely in the fragment and round-trips both fragment forms', () => {
    const url = new URL(
      createGuestOrderTrackingUrl(reference, 'https://store.example/old?ignored=yes'),
    );
    expect(url.origin).toBe('https://store.example');
    expect(url.pathname).toBe('/track');
    expect(url.search).toBe('');
    expect(url.pathname).not.toContain(reference.orderNumber);
    expect(parseGuestOrderTrackingFragment(url.hash)).toEqual(reference);
    expect(parseGuestOrderTrackingFragment(url.hash.slice(1))).toEqual(reference);
  });

  it('rejects ambiguous, incomplete, malformed and oversized fragments', () => {
    const token = reference.trackingToken;
    for (const fragment of [
      '',
      'order=ORD-100',
      `order=ORD-100&order=ORD-200&token=${token}`,
      `order=ORD-100&token=${token}&token=${token}`,
      `order=ORD-100&token=${token}&extra=1`,
      `order=ORD%2F100&token=${token}`,
      `order=ORD%0A100&token=${token}`,
      'order=ORD-100&token=not-a-token',
      `order=ORD-100&token=${'A'.repeat(64)}`,
      `order=${'A'.repeat(401)}&token=${token}`,
    ])
      expect(parseGuestOrderTrackingFragment(fragment)).toBeNull();
  });

  it('does not create a link without a valid capability or for a credentialed/non-web origin', () => {
    expect(
      createGuestOrderTrackingUrl({ orderNumber: reference.orderNumber }, 'https://store.example'),
    ).toBe('');
    expect(
      createGuestOrderTrackingUrl(
        { ...reference, trackingToken: 'legacy-invalid' },
        'https://store.example',
      ),
    ).toBe('');
    for (const origin of [
      'javascript:alert(1)',
      'file:///tmp/order',
      'not-an-origin',
      'https://user:password@store.example',
    ]) {
      expect(createGuestOrderTrackingUrl(reference, origin)).toBe('');
    }
  });
});
