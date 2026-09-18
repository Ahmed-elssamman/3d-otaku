import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';

export enum ShippingEditorState {
  Editing = 'editing',
  Reviewing = 'reviewing',
  Saving = 'saving',
  Reloading = 'reloading',
  Stale = 'stale',
  Saved = 'saved',
}

export interface OrderShippingFormValue {
  deliveryFee: number | null;
  agreement: boolean;
  note: string;
}

export interface OrderShippingFormControls {
  deliveryFee: FormControl<number | null>;
  agreement: FormControl<boolean>;
  note: FormControl<string>;
}

export const EMPTY_SHIPPING_FORM: OrderShippingFormValue = {
  deliveryFee: null,
  agreement: false,
  note: '',
};

export const SHIPPING_LIMITS = { maximumFee: 10000000, noteLength: 1000 };

export const SHIPPING_MESSAGES = {
  conflict:
    'تغيّرت بيانات الطلب. مسودتك محفوظة؛ حمّل أحدث التفاصيل وراجع المبلغ والإجمالي قبل تأكيد جديد.',
  unavailable: 'حالة الطلب الحالية لا تسمح بتعديل الشحن. حمّل أحدث التفاصيل؛ مسودتك محفوظة.',
  request:
    'تعذّر اعتماد محاولة الشحن بهذه البيانات أو الجلسة. حمّل أحدث التفاصيل قبل مراجعة محاولة جديدة.',
  invoice: 'بيانات الفاتورة لا تسمح بحساب شحن آمن. حمّل أحدث التفاصيل وراجع الفاتورة قبل المتابعة.',
  validation:
    'لم تُقبل بيانات الشحن. مسودتك محفوظة؛ حمّل أحدث التفاصيل ثم راجع المبلغ والإقرار والملاحظة.',
  uncertain: 'لم نتأكد من حفظ الشحن. مسودتك محفوظة؛ حمّل أحدث التفاصيل للتحقق قبل إعادة المحاولة.',
  reload: 'تعذّر تحميل أحدث تفاصيل الطلب. مسودتك محفوظة والحفظ متوقف لحين نجاح التحميل.',
  changed: 'تغيّر الطلب المعروض أثناء وجود مسودة. حمّل أحدث التفاصيل وأكّد الاتفاق من جديد.',
  saved: 'تم حفظ رسوم الشحن المتفق عليها وتحديث إجمالي الطلب.',
  loaded:
    'تم تحميل أحدث بيانات الطلب مع الاحتفاظ بمسودتك. راجع التفاصيل وأكّد الاتفاق من جديد إذا احتاجت تعديلًا.',
};

function validFee(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null) return { required: true };
  if (!Number.isFinite(value) || value < 0 || value > SHIPPING_LIMITS.maximumFee)
    return { range: true };
  return /^\d+(?:\.\d{1,2})?$/.test(String(value)) ? null : { decimals: true };
}

export function createOrderShippingForm(): FormGroup<OrderShippingFormControls> {
  return new FormGroup<OrderShippingFormControls>({
    deliveryFee: new FormControl<number | null>(null, { validators: validFee }),
    agreement: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
    note: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(SHIPPING_LIMITS.noteLength),
    }),
  });
}
