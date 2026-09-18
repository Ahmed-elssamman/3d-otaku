import { describe, expect, it } from 'vitest';
import { ProductSpecField } from '../enums/product-spec-field.enum';
import { formatProductCardSize, formatProductSpecValue } from './product-spec-display.util';

describe('product specification display', () => {
  it('translates known finishes without treating a metallic finish as the material', () => {
    expect(formatProductSpecValue(ProductSpecField.FINISH, ' matte ')).toBe('مطفي');
    expect(formatProductSpecValue(ProductSpecField.FINISH, 'Glossy')).toBe('لامع');
    expect(formatProductSpecValue(ProductSpecField.FINISH, 'Smooth')).toBe('ناعم');
    expect(formatProductSpecValue(ProductSpecField.FINISH, 'Metallic')).toBe('مظهر معدني');
    expect(formatProductSpecValue(ProductSpecField.MATERIAL, 'PLA+')).toBe('PLA+');
    expect(formatProductSpecValue(ProductSpecField.MATERIAL, 'Resin')).toBe('راتنج (ريزن)');
  });

  it('localizes mixed color lists while preserving custom Arabic and unrecognized names', () => {
    expect(formatProductSpecValue(ProductSpecField.COLOR, 'Black , Gray ')).toBe('أسود، رمادي');
    expect(formatProductSpecValue(ProductSpecField.COLOR, 'Red/Black')).toBe('أحمر، أسود');
    expect(formatProductSpecValue(ProductSpecField.COLOR, 'أزرق داكن، Pink / Sandstone')).toBe(
      'أزرق داكن، وردي، Sandstone',
    );
    expect(formatProductSpecValue(ProductSpecField.COLOR, 'Blackberry')).toBe('Blackberry');
  });

  it('does not invent units for bare catalog sizes, weights, print times or layer heights', () => {
    expect(formatProductSpecValue(ProductSpecField.SIZE, '20')).toBe('20 (الوحدة غير مذكورة)');
    expect(formatProductSpecValue(ProductSpecField.WEIGHT, '68')).toBe('68 (الوحدة غير مذكورة)');
    expect(formatProductSpecValue(ProductSpecField.PRINT_TIME, '0.2')).toBe(
      '0.2 (الوحدة غير مذكورة)',
    );
    expect(formatProductSpecValue(ProductSpecField.LAYER_HEIGHT, '0.4')).toBe(
      '0.4 (الوحدة غير مذكورة)',
    );
    expect(formatProductSpecValue(ProductSpecField.SIZE, '٢٠')).toBe('٢٠ (الوحدة غير مذكورة)');
  });

  it('preserves quantities and translates only explicitly supplied compatible units', () => {
    expect(formatProductSpecValue(ProductSpecField.SIZE, '2 x 10 cm ')).toBe('2 × 10 سم');
    expect(formatProductSpecValue(ProductSpecField.SIZE, '2 cm x 10 mm')).toBe('2 سم × 10 مم');
    expect(formatProductSpecValue(ProductSpecField.WEIGHT, '850g')).toBe('850 جم');
    expect(formatProductSpecValue(ProductSpecField.LAYER_HEIGHT, '0.10mm')).toBe('0.10 مم');
    expect(formatProductSpecValue(ProductSpecField.INFILL, '20%')).toBe('20 ٪');
    expect(formatProductSpecValue(ProductSpecField.WEIGHT, '20 cm')).toBe('20 cm');
    expect(formatProductSpecValue(ProductSpecField.SIZE, '١٢ سم')).toBe('١٢ سم');
  });

  it('translates stored printing durations without turning them into delivery estimates', () => {
    expect(formatProductSpecValue(ProductSpecField.PRINT_TIME, '6 hours')).toBe('6 ساعة');
    expect(formatProductSpecValue(ProductSpecField.PRINT_TIME, '2 days')).toBe('2 يوم');
    expect(formatProductSpecValue(ProductSpecField.PRINT_TIME, 'one day ')).toBe('يوم واحد');
  });

  it('does not turn ambiguous Hand into handmade or discard meaningful custom descriptions', () => {
    expect(formatProductSpecValue(ProductSpecField.FINISH, ' Hand ')).toBe('غير موضح');
    expect(formatProductSpecValue(ProductSpecField.FINISH, 'تشطيب مخصص حسب الطلب')).toBe(
      'تشطيب مخصص حسب الطلب',
    );
    expect(formatProductSpecValue(ProductSpecField.SIZE, 'المقاس يتحدد حسب التصميم')).toBe(
      'المقاس يتحدد حسب التصميم',
    );
    expect(formatProductSpecValue(ProductSpecField.FINISH, 'Hand-painted')).toBe('Hand-painted');
  });

  it('omits unsupported size chips and empty values but retains explicit measurements', () => {
    expect(formatProductCardSize('20')).toBe('');
    expect(formatProductCardSize('70')).toBe('');
    expect(formatProductCardSize('12cm')).toBe('12 سم');
    expect(formatProductCardSize('2 x 10 cm ')).toBe('2 × 10 سم');
    expect(formatProductCardSize('حسب التصميم')).toBe('');
    expect(formatProductCardSize('20g')).toBe('');
    expect(formatProductSpecValue(ProductSpecField.SIZE, ' 0 ')).toBe('');
    expect(formatProductSpecValue(ProductSpecField.WEIGHT, ' ')).toBe('');
    expect(formatProductSpecValue(ProductSpecField.COLOR, ' , / ')).toBe('');
  });
});
