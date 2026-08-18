import { describe, expect, it } from 'vitest';
import { getSafeReturnUrl } from './auth-navigation.util';

describe('getSafeReturnUrl', () => {
  it('keeps internal protected destinations', () => {
    expect(getSafeReturnUrl('/orders?page=2')).toBe('/orders?page=2');
    expect(getSafeReturnUrl('/admin/products')).toBe('/admin/products');
  });

  it('rejects external destinations and authentication loops', () => {
    expect(getSafeReturnUrl('https://example.com')).toBe('');
    expect(getSafeReturnUrl('//example.com')).toBe('');
    expect(getSafeReturnUrl('/login?returnUrl=/orders')).toBe('');
    expect(getSafeReturnUrl('/register')).toBe('');
  });
});
