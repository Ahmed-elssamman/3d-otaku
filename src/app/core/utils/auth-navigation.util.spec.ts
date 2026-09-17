import { getAccountDestination, getSafeReturnUrl } from './auth-navigation.util';

describe('account return URLs', () => {
  it('preserves an internal destination with its query and fragment', () => {
    expect(getSafeReturnUrl('/products?search=phone#results')).toBe(
      '/products?search=phone#results',
    );
    expect(getSafeReturnUrl('/orders')).toBe('/orders');
  });

  it('rejects external, ambiguous, encoded and recursive auth destinations', () => {
    const unsafeUrls = [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/%2f%2fexample.com',
      '/%5cexample.com',
      '/%252fexample.com',
      '/login#form',
      '/register/?next=1',
      '/%6cogin',
      '/products/../login',
      '/login;next=orders',
      '/(login)',
      '/orders\n',
    ];
    for (const url of unsafeUrls) expect(getSafeReturnUrl(url), url).toBe('');
  });

  it('keeps customer return URLs outside the admin area, including encoded paths', () => {
    expect(getAccountDestination('/admin/products', false)).toBe('/products');
    expect(getAccountDestination('/%61dmin/products', false)).toBe('/products');
    expect(getAccountDestination('/admin/dashboard', true)).toBe('/admin/dashboard');
    expect(getAccountDestination('/orders', false)).toBe('/orders');
    expect(getAccountDestination(null, true)).toBe('/admin/dashboard');
  });
});
