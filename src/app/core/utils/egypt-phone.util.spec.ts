import { describe, expect, it } from 'vitest';
import { normalizeEgyptMobile } from './egypt-phone.util';

describe('Egyptian checkout mobile numbers', () => {
  it.each([
    '01012345678',
    '+20 101 234 5678',
    '00201012345678',
    '201012345678',
    '٠١٠١٢٣٤٥٦٧٨',
    '۰۱۰۱۲۳۴۵۶۷۸',
  ])('normalizes %s to the same Egyptian number', (value) => {
    expect(normalizeEgyptMobile(value)).toBe('+201012345678');
  });

  it.each(['+966501234567', '01612345678', '0101234567', '010123456789', 'call01012345678', ''])(
    'rejects %s',
    (value) => {
      expect(normalizeEgyptMobile(value)).toBe('');
    },
  );
});
