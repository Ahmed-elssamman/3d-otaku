import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { createCustomForm, createMessageForm } from './contact.control';
import { DesignSource } from './enums/contact.enum';

describe('Contact form validation', () => {
  it('requires a reference only for reference sources and clears that requirement for a written idea', () => {
    const form = createCustomForm(new FormBuilder());
    form.controls.designSource.setValue(DesignSource.Model);
    expect(form.hasError('referenceRequired')).toBe(true);
    form.controls.referenceUrl.setValue('https://example.com/model');
    expect(form.hasError('referenceRequired')).toBe(false);
    form.controls.referenceUrl.setValue('');
    form.controls.designSource.setValue(DesignSource.Idea);
    expect(form.hasError('referenceRequired')).toBe(false);
  });
  it('accepts Egyptian Arabic digits and rejects whitespace descriptions and fractional quantities', () => {
    const form = createCustomForm(new FormBuilder());
    form.patchValue({
      fullName: 'عميل اختبار',
      phone: '٠١٠١٢٣٤٥٦٧٨',
      details: 'منظم مكتب بحجم صغير',
      quantity: 2,
      rightsConfirmed: true,
    });
    expect(form.valid).toBe(true);
    form.controls.quantity.setValue(1.5);
    expect(form.controls.quantity.invalid).toBe(true);
    form.controls.details.setValue('               ');
    expect(form.controls.details.invalid).toBe(true);
    form.controls.phone.setValue('+971501234567');
    expect(form.controls.phone.invalid).toBe(true);
  });

  it('rejects links with credentials or non-HTTPS schemes', () => {
    const reference = createCustomForm(new FormBuilder()).controls.referenceUrl;
    reference.setValue('https://example.com/model');
    expect(reference.valid).toBe(true);
    reference.setValue('https://account:secret@example.com/model');
    expect(reference.invalid).toBe(true);
    reference.setValue('javascript:alert(1)');
    expect(reference.invalid).toBe(true);
  });

  it('requires a valid reply email and accepts an empty optional phone for messages', () => {
    const form = createMessageForm(new FormBuilder());
    form.patchValue({
      fullName: 'عميل اختبار',
      email: 'customer@example.com',
      subject: 'سؤال عن المقاس',
      message: 'محتاج أعرف مقاس حامل الموبايل قبل الطلب',
    });
    expect(form.valid).toBe(true);
    form.controls.email.setValue('');
    expect(form.invalid).toBe(true);
    form.controls.phone.setValue('12345');
    expect(form.controls.phone.invalid).toBe(true);
  });
});
