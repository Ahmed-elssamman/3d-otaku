import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';
import { ContactMode, CustomProductType, DesignSource, PrintMaterial } from './enums/contact.enum';

export interface SelectOption<T> {
  label: string;
  value: T;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ContactStep {
  number: string;
  title: string;
  description: string;
}

export const CONTACT_MODES: SelectOption<ContactMode>[] = [
  { value: ContactMode.Custom, label: 'عندي فكرة للطباعة' },
  { value: ContactMode.Message, label: 'عندي استفسار' },
];

export const DESIGN_SOURCE_OPTIONS: SelectOption<DesignSource>[] = [
  { label: 'هكتب وصف الفكرة', value: DesignSource.Idea },
  { label: 'رابط تصميم من MakerWorld', value: DesignSource.MakerWorld },
  { label: 'رابط تصميم من موقع آخر', value: DesignSource.Model },
  { label: 'رابط صورة توضيحية', value: DesignSource.Reference },
];

export const PRODUCT_TYPE_OPTIONS: SelectOption<CustomProductType>[] = [
  { label: 'قطعة للمكتب أو ترتيب الأدوات', value: CustomProductType.Desk },
  { label: 'مجسم للعرض', value: CustomProductType.Display },
  { label: 'هدية أو قطعة للاقتناء', value: CustomProductType.Gift },
  { label: 'إكسسوار تنكري للعرض', value: CustomProductType.Prop },
  { label: 'استخدام آخر', value: CustomProductType.Other },
];

export const MATERIAL_OPTIONS: SelectOption<PrintMaterial>[] = [
  { label: 'محتاج مساعدة في الاختيار', value: PrintMaterial.Advice },
  { label: 'PLA', value: PrintMaterial.Pla },
  { label: 'PLA+', value: PrintMaterial.PlaPlus },
];

export const CUSTOM_REQUEST_STEPS: ContactStep[] = [
  {
    number: '١',
    title: 'احكيلنا عن فكرتك',
    description: 'وصف بسيط أو رابط للتصميم، والمقاس والكمية اللي محتاجها.',
  },
  {
    number: '٢',
    title: 'نراجع التفاصيل',
    description: 'نراجع إمكانية الطباعة والخامة وحقوق استخدام التصميم.',
  },
  {
    number: '٣',
    title: 'نتفق قبل التنفيذ',
    description: 'السعر وموعد التجهيز والشحن بيتأكدوا معاك قبل بدء التنفيذ.',
  },
];

export const CUSTOM_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'commitment',
    question: 'إرسال الفكرة معناه إني اشتريت؟',
    answer:
      'لا، ده طلب مراجعة وتسعير. التنفيذ بيبدأ بعد مراجعة التفاصيل والاتفاق معاك على السعر والموعد.',
  },
  {
    id: 'makerworld',
    question: 'ينفع أبعت تصميم لقيته على الإنترنت؟',
    answer:
      'ابعت رابط صفحة التصميم. لازم ترخيص المصمم يسمح بالطباعة المطلوبة، وهنراجع ده معاك قبل قبول الطلب.',
  },
  {
    id: 'files',
    question: 'عندي ملف STL، أبعته إزاي؟',
    answer:
      'ابعت رابط صفحة التصميم لو متاح، أو اشرح فكرتك واكتب إن معاك ملف. هنرتب معاك طريقة مشاركة الملف أثناء المراجعة.',
  },
  {
    id: 'timing',
    question: 'السعر ومدة التجهيز بيتحددوا إزاي؟',
    answer:
      'حسب المقاس والخامة وكمية المادة ووقت الطباعة والتشطيب. تكلفة الشحن داخل مصر بتتوضح بشكل منفصل قبل التأكيد.',
  },
];

export function trimmedLength(minimum: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value.length >= minimum ? null : { trimmedLength: true };
  };
}

export function egyptPhone(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  return normalizeEgyptMobile(value) ? null : { egyptPhone: true };
}

function optionalEgyptPhone(control: AbstractControl): ValidationErrors | null {
  return !control.value ? null : egyptPhone(control);
}

function wholeQuantity(control: AbstractControl): ValidationErrors | null {
  return Number.isInteger(control.value) ? null : { wholeQuantity: true };
}

function referenceLink(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? null
      : { referenceLink: true };
  } catch {
    return { referenceLink: true };
  }
}

function designReference(control: AbstractControl): ValidationErrors | null {
  if (control.get('designSource')?.value === DesignSource.Idea) return null;
  const value = control.get('referenceUrl')?.value;
  return typeof value === 'string' && value.trim() ? null : { referenceRequired: true };
}

export function createCustomForm(builder: FormBuilder) {
  return builder.nonNullable.group(
    {
      fullName: ['', [trimmedLength(3), Validators.maxLength(100)]],
      phone: ['', [egyptPhone]],
      email: ['', [Validators.email, Validators.maxLength(254)]],
      designSource: [DesignSource.Idea, Validators.required],
      referenceUrl: ['', [referenceLink, Validators.maxLength(2000)]],
      productType: [CustomProductType.Desk, Validators.required],
      dimensions: ['', Validators.maxLength(200)],
      material: [PrintMaterial.Advice],
      colorFinish: ['', Validators.maxLength(200)],
      quantity: builder.nonNullable.control<number | null>(1, [
        Validators.required,
        wholeQuantity,
        Validators.min(1),
        Validators.max(99),
      ]),
      details: ['', [trimmedLength(10), Validators.maxLength(5000)]],
      rightsConfirmed: [false, Validators.requiredTrue],
    },
    { validators: designReference },
  );
}

export function createMessageForm(builder: FormBuilder) {
  return builder.nonNullable.group({
    fullName: ['', [trimmedLength(3), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', optionalEgyptPhone],
    subject: ['', [trimmedLength(3), Validators.maxLength(150)]],
    message: ['', [trimmedLength(10), Validators.maxLength(5000)]],
  });
}
