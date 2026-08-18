import { CurrencyPipe } from '@angular/common';
import { describe, expect, it } from 'vitest';

describe('money display boundary', () => {
  it('normalizes binary floating-point artifacts with the API currency', () => {
    const pipe = new CurrencyPipe('en-US');
    const formatted = pipe.transform(29.979999999999997, 'SAR') ?? '';
    expect(formatted).toContain('29.98');
    expect(formatted).not.toContain('29.979999999999997');
  });
});
