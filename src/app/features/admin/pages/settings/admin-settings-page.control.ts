import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';

export enum AdminSettingsField {
  BrandName = 'brandName',
  Slogan = 'slogan',
  Whatsapp = 'whatsappNumber',
  WhatsappMessage = 'whatsappDefaultMessage',
  Email = 'email',
  Phone = 'phone',
  Facebook = 'facebookUrl',
  Instagram = 'instagramUrl',
  Tiktok = 'tiktokUrl',
  Youtube = 'youtubeUrl',
  DeliveryDays = 'deliveryDays',
}

export enum AdminSettingsInput {
  Text = 'text',
  Email = 'email',
  Phone = 'tel',
  Url = 'url',
  Multiline = 'textarea',
}

export interface AdminSettingsFieldConfig {
  key: AdminSettingsField;
  label: string;
  type: AdminSettingsInput;
  hint: string;
  error: string;
  ltr: boolean;
  wide: boolean;
}

export interface AdminSettingsSection {
  id: string;
  title: string;
  description: string;
  fields: AdminSettingsFieldConfig[];
}

export const ADMIN_SETTINGS_SECTIONS: AdminSettingsSection[] = [
  {
    id: 'brand',
    title: 'هوية المتجر',
    description: 'اسم المتجر والوصف المستخدمان في عنوان الصفحة وبيانات المشاركة.',
    fields: [
      {
        key: AdminSettingsField.BrandName,
        label: 'اسم المتجر',
        type: AdminSettingsInput.Text,
        hint: '',
        error: 'اكتب اسمًا من حرفين إلى 100 حرف.',
        ltr: false,
        wide: false,
      },
      {
        key: AdminSettingsField.Slogan,
        label: 'وصف مختصر (اختياري)',
        type: AdminSettingsInput.Text,
        hint: '',
        error: 'استخدم 300 حرف بحد أقصى.',
        ltr: false,
        wide: false,
      },
    ],
  },
  {
    id: 'contact',
    title: 'قنوات التواصل',
    description: 'اترك القناة فارغة إذا لم تكن متاحة. لا تضف أرقامًا تجريبية إلى المتجر المنشور.',
    fields: [
      {
        key: AdminSettingsField.Whatsapp,
        label: 'رقم واتساب مصري (اختياري)',
        type: AdminSettingsInput.Phone,
        hint: 'يمكن إدخال الرقم المحلي أو بصيغة +20؛ يُحفظ برمز مصر.',
        error: 'أدخل رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.Phone,
        label: 'هاتف التواصل (اختياري)',
        type: AdminSettingsInput.Phone,
        hint: 'رقم موبايل أو هاتف أرضي مصري مع كود المنطقة.',
        error: 'أدخل رقم هاتف مصري صحيح مع كود المنطقة عند استخدام رقم أرضي.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.Email,
        label: 'البريد الإلكتروني (اختياري)',
        type: AdminSettingsInput.Email,
        hint: '',
        error: 'أدخل بريدًا إلكترونيًا صحيحًا.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.WhatsappMessage,
        label: 'نص بداية رسالة واتساب (اختياري)',
        type: AdminSettingsInput.Multiline,
        hint: 'تُفتح الرسالة للمراجعة داخل واتساب؛ لا تُرسل تلقائيًا.',
        error: 'استخدم 1000 حرف بحد أقصى.',
        ltr: false,
        wide: true,
      },
    ],
  },
  {
    id: 'social',
    title: 'حسابات التواصل الاجتماعي',
    description: 'روابط الحسابات الرسمية فقط. الحقل الفارغ يخفي رابط القناة.',
    fields: [
      {
        key: AdminSettingsField.Facebook,
        label: 'رابط فيسبوك',
        type: AdminSettingsInput.Url,
        hint: '',
        error: 'أدخل رابط http أو https كاملًا بدون بيانات دخول.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.Instagram,
        label: 'رابط إنستجرام',
        type: AdminSettingsInput.Url,
        hint: '',
        error: 'أدخل رابط http أو https كاملًا بدون بيانات دخول.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.Tiktok,
        label: 'رابط تيك توك',
        type: AdminSettingsInput.Url,
        hint: '',
        error: 'أدخل رابط http أو https كاملًا بدون بيانات دخول.',
        ltr: true,
        wide: false,
      },
      {
        key: AdminSettingsField.Youtube,
        label: 'رابط يوتيوب',
        type: AdminSettingsInput.Url,
        hint: '',
        error: 'أدخل رابط http أو https كاملًا بدون بيانات دخول.',
        ltr: true,
        wide: false,
      },
    ],
  },
];

export const ADMIN_SETTINGS_INPUT = AdminSettingsInput;

export function normalizeEgyptContactPhone(value: string): string {
  const mobile = normalizeEgyptMobile(value);
  if (mobile) return mobile;
  const digits = value
    .replace(/[٠-٩]/g, (character) => String(character.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (character) => String(character.charCodeAt(0) - 0x6f0))
    .replace(/[\s()+-]/g, '')
    .replace(/^0020/, '20');
  const international = digits.startsWith('0') ? `2${digits}` : digits;
  return /^20[2-9]\d{7,9}$/.test(international) ? `+${international}` : '';
}

function optionalMobile(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  return !value || normalizeEgyptMobile(value) ? null : { egyptPhone: true };
}

function optionalPhone(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  return !value || normalizeEgyptContactPhone(value) ? null : { egyptPhone: true };
}

export function optionalAdminUrl(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? null
      : { url: true };
  } catch {
    return { url: true };
  }
}

function brandName(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value || '').trim();
  return value.length >= 2 && value.length <= 100 ? null : { name: true };
}

export function createAdminSettingsForm(builder: FormBuilder) {
  return builder.nonNullable.group({
    brandName: ['', [brandName]],
    slogan: ['', [Validators.maxLength(300)]],
    whatsappNumber: ['', [optionalMobile]],
    whatsappDefaultMessage: ['', [Validators.maxLength(1000)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [optionalPhone]],
    facebookUrl: ['', [optionalAdminUrl]],
    instagramUrl: ['', [optionalAdminUrl]],
    tiktokUrl: ['', [optionalAdminUrl]],
    youtubeUrl: ['', [optionalAdminUrl]],
    deliveryFee: builder.control<number | null>(null, [Validators.min(0), Validators.max(10000)]),
    deliveryDays: ['', [Validators.maxLength(100)]],
    maintenanceMode: [false],
  });
}
