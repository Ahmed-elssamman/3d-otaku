import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  PaymentAttemptOutcome,
  PaymentEditorMode,
  PaymentEntryKind,
  PaymentEntryMethod,
} from '../../enums/order-payment.enum';
import { AdminOperationStatus } from '../../enums/admin-operation.enum';
import {
  AdminPaymentAttempt,
  AdminPaymentContext,
  CorrectAdminPaymentRequest,
  RecordAdminPaymentRequest,
} from '../../models/admin-order-payment.model';

export interface PaymentKindOption {
  value: PaymentEntryKind;
  label: string;
}
export interface PaymentMethodOption {
  value: PaymentEntryMethod;
  label: string;
}
export interface PaymentFormValue {
  kind: PaymentEntryKind | null;
  amount: number | null;
  method: PaymentEntryMethod | null;
  reference: string;
  note: string;
  completed: boolean;
}
export interface PaymentFormControls {
  kind: FormControl<PaymentEntryKind | null>;
  amount: FormControl<number | null>;
  method: FormControl<PaymentEntryMethod | null>;
  reference: FormControl<string>;
  note: FormControl<string>;
  completed: FormControl<boolean>;
}
export interface CorrectionFormValue {
  reason: string;
  confirmed: boolean;
  noMoneyMoved: boolean;
}
export interface CorrectionFormControls {
  reason: FormControl<string>;
  confirmed: FormControl<boolean>;
  noMoneyMoved: FormControl<boolean>;
}

export const PAYMENT_KINDS: PaymentKindOption[] = [
  { value: PaymentEntryKind.Collection, label: 'تحصيل تم بالفعل' },
  { value: PaymentEntryKind.Refund, label: 'رد مبلغ تم بالفعل' },
];
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: PaymentEntryMethod.Cash, label: 'نقدًا' },
  { value: PaymentEntryMethod.BankTransfer, label: 'تحويل بنكي' },
  { value: PaymentEntryMethod.MobileWallet, label: 'محفظة إلكترونية' },
  { value: PaymentEntryMethod.Card, label: 'بطاقة' },
  { value: PaymentEntryMethod.Other, label: 'طريقة أخرى' },
];
export const PAYMENT_KIND_LABELS: Record<PaymentEntryKind, string> = {
  [PaymentEntryKind.Collection]: 'تحصيل',
  [PaymentEntryKind.Refund]: 'رد مبلغ',
  [PaymentEntryKind.Correction]: 'تصحيح قيد إداري دون حركة أموال',
};
export const PAYMENT_METHOD_LABELS: Record<PaymentEntryMethod, string> = {
  [PaymentEntryMethod.Cash]: 'نقدًا',
  [PaymentEntryMethod.BankTransfer]: 'تحويل بنكي',
  [PaymentEntryMethod.MobileWallet]: 'محفظة إلكترونية',
  [PaymentEntryMethod.Card]: 'بطاقة',
  [PaymentEntryMethod.Other]: 'طريقة أخرى',
};
export const EMPTY_PAYMENT_FORM: PaymentFormValue = {
  kind: null,
  amount: null,
  method: null,
  reference: '',
  note: '',
  completed: false,
};
export const EMPTY_CORRECTION_FORM: CorrectionFormValue = {
  reason: '',
  confirmed: false,
  noMoneyMoved: false,
};
export const PAYMENT_LIMITS = { amount: 10000000, reference: 200, note: 1000 };
export const PAYMENT_STORAGE_PREFIX = '3d-otaku-admin-payment-attempt:';
export const PAYMENT_STORAGE_LIMIT = 12000;
const PAYMENT_CONTEXT_FIELDS = [
  'expectedPaymentRevision',
  'expectedShippingRevision',
  'expectedStatus',
  'expectedTotal',
  'expectedDeliveryFeeConfirmed',
];
const PAYMENT_TRANSACTION_FIELDS = [
  ...PAYMENT_CONTEXT_FIELDS,
  'kind',
  'amount',
  'method',
  'transactionCompletedConfirmed',
  'reference',
  'note',
];
const PAYMENT_CORRECTION_FIELDS = [
  ...PAYMENT_CONTEXT_FIELDS,
  'reason',
  'correctionConfirmed',
  'noMoneyMovedConfirmed',
];
const PAYMENT_ATTEMPT_FIELDS = [
  'orderId',
  'key',
  'mode',
  'targetEntryId',
  'transaction',
  'correction',
  'outcome',
];
const PAYMENT_ORDER_STATUSES = [
  AdminOperationStatus.Pending,
  AdminOperationStatus.Processing,
  AdminOperationStatus.Printed,
  AdminOperationStatus.Shipped,
  AdminOperationStatus.Delivered,
  AdminOperationStatus.Cancelled,
];
export const PAYMENT_REJECTED_STATUSES = [400, 403, 409, 422];
export const PAYMENT_MODE_LABELS = {
  [PaymentEditorMode.Transaction]: {
    review: 'مراجعة تسجيل العملية',
    confirmation: 'تأكيد تسجيل عملية مالية',
    save: 'تأكيد تسجيل العملية',
  },
  [PaymentEditorMode.Correction]: {
    review: 'مراجعة تصحيح القيد',
    confirmation: 'تأكيد التصحيح الإداري',
    save: 'تأكيد تصحيح القيد',
  },
};
export const PAYMENT_MESSAGES = {
  conflict:
    'تغيّر سجل الأموال أو الفاتورة أو حالة الطلب. احتفظنا بمسودتك؛ تحقّق من المحاولة وحمّل أحدث التفاصيل قبل مراجعة جديدة.',
  uncertain:
    'لم نتأكد من تسجيل العملية. احتفظنا بالمحاولة الأصلية؛ تحقّق منها بمفتاحها قبل أي تسجيل جديد.',
  negative:
    'لم تظهر هذه المحاولة في السجل حتى الآن. قد تصل المحاولة السابقة لاحقًا؛ يمكنك فقط التحقق مجددًا أو إعادة نفس المحاولة المحفوظة.',
  rejected:
    'لم تُسجّل المحاولة المرفوضة. حُمّلت أحدث التفاصيل مع الاحتفاظ بالمسودة؛ صحّحها وأكّد الإقرارات وراجع التسجيل من جديد.',
  rejectedPendingRecovery:
    'لم تُقبل محاولة التسجيل السابقة. مسودتك محفوظة؛ تحقّق من المحاولة لتحميل أحدث سجل قبل المراجعة من جديد.',
  paymentNotRecorded:
    'أكد الخادم أن محاولة التسجيل المحفوظة لم تُسجّل ولن تُسجّل لاحقًا بهذه البيانات. مسودتك محفوظة؛ تحقّق من المحاولة وحمّل أحدث سجل قبل المراجعة من جديد. هذا لا يحدد ما إذا حدثت حركة أموال خارج المتجر.',
  recovered: 'تم العثور على المحاولة الأصلية وتحديث السجل دون تسجيل عملية جديدة.',
  saved: 'تم تسجيل العملية المؤكدة في سجل الطلب. لم ينفّذ المتجر تحويلًا أو رد أموال خارجيًا.',
  loaded: 'تم تحميل أحدث تفاصيل الطلب. مسودتك محفوظة؛ راجع البيانات وأكّد الإقرارات من جديد.',
  reloadFailed:
    'تعذّر التحقق من المحاولة أو تحميل التفاصيل. المسودة والمفتاح محفوظان والحفظ متوقف.',
  paymentRequest:
    'تعذّر استخدام هذه المحاولة بهذه البيانات أو الجلسة. احتفظنا بالمفتاح؛ استخدم جلسة المسؤول الأصلي وتحقق من المحاولة.',
  paymentDuplicate:
    'يوجد قيد فعّال بنفس مرجع العملية. راجع السجل قبل تسجيل أي تحصيل أو رد مبلغ جديد.',
  paymentFunds: 'المبلغ يتجاوز صافي الأموال المسجّلة أو يجعل التصحيح الصافي سالبًا. راجع أحدث سجل.',
  paymentCorrection: 'هذا القيد لا يقبل التصحيح الآن؛ ربما صُحّح بالفعل. حمّل أحدث سجل.',
  paymentLedger: 'بيانات السجل أو الفاتورة لا تسمح بحساب آمن. لا يمكن تسجيل عملية قبل مراجعتها.',
  validation:
    'لم تُقبل بعض البيانات. مسودتك محفوظة؛ تحقّق من المحاولة ثم راجع المبلغ والطريقة والمرجع والإقرارات.',
  storageInvalid:
    'تعذّر قراءة المحاولة المحفوظة بأمان. لم نبدأ قيدًا جديدًا. احتفظ بهذا التبويب وراجع سجل الطلب مع المسؤول قبل أي تسجيل بديل.',
  storageFailed:
    'تعذّر الاحتفاظ بالمحاولة عند إغلاق التبويب. أبقِ هذه الصفحة مفتوحة حتى التحقق من النتيجة.',
};
export const PAYMENT_FAILURE_FIELDS: Array<keyof typeof PAYMENT_MESSAGES> = [
  'paymentRequest',
  'paymentDuplicate',
  'paymentFunds',
  'paymentCorrection',
  'paymentLedger',
];

function paymentAmount(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value !== null &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= PAYMENT_LIMITS.amount &&
    /^\d+(?:\.\d{1,2})?$/.test(String(value))
    ? null
    : { amount: true };
}

export function createPaymentForm(): FormGroup<PaymentFormControls> {
  return new FormGroup<PaymentFormControls>({
    kind: new FormControl<PaymentEntryKind | null>(null, Validators.required),
    amount: new FormControl<number | null>(null, paymentAmount),
    method: new FormControl<PaymentEntryMethod | null>(null, Validators.required),
    reference: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(PAYMENT_LIMITS.reference),
    }),
    note: new FormControl('', {
      nonNullable: true,
      validators: Validators.maxLength(PAYMENT_LIMITS.note),
    }),
    completed: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });
}

export function createCorrectionForm(): FormGroup<CorrectionFormControls> {
  return new FormGroup<CorrectionFormControls>({
    reason: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(PAYMENT_LIMITS.note),
      ],
    }),
    confirmed: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
    noMoneyMoved: new FormControl(false, {
      nonNullable: true,
      validators: Validators.requiredTrue,
    }),
  });
}

function validContext(value: AdminPaymentContext): boolean {
  return (
    Number.isSafeInteger(value.expectedPaymentRevision) &&
    value.expectedPaymentRevision >= 0 &&
    Number.isSafeInteger(value.expectedShippingRevision) &&
    value.expectedShippingRevision >= 0 &&
    PAYMENT_ORDER_STATUSES.includes(value.expectedStatus) &&
    typeof value.expectedDeliveryFeeConfirmed === 'boolean' &&
    Number.isFinite(value.expectedTotal) &&
    value.expectedTotal >= 0 &&
    Number.isSafeInteger(Math.round(value.expectedTotal * 100))
  );
}

function validStoredTransaction(value: RecordAdminPaymentRequest): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !validContext(value))
    return false;
  if (!Object.keys(value).every((key) => PAYMENT_TRANSACTION_FIELDS.includes(key))) return false;
  if (value.kind !== PaymentEntryKind.Collection && value.kind !== PaymentEntryKind.Refund)
    return false;
  if (
    !Object.values(PaymentEntryMethod).includes(value.method) ||
    value.transactionCompletedConfirmed !== true
  )
    return false;
  if (
    typeof value.amount !== 'number' ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    value.amount > PAYMENT_LIMITS.amount ||
    !/^\d+(?:\.\d{1,2})?$/.test(String(value.amount))
  )
    return false;
  if (value.reference !== null && 'reference' in value && typeof value.reference !== 'string')
    return false;
  if (value.note !== null && 'note' in value && typeof value.note !== 'string') return false;
  if (value.reference === null || value.note === null) return false;
  const reference = value.reference || '';
  const note = value.note || '';
  return (
    reference.length <= PAYMENT_LIMITS.reference &&
    reference === reference.trim() &&
    (value.method === PaymentEntryMethod.Cash || reference.length >= 3) &&
    note.length <= PAYMENT_LIMITS.note &&
    note === note.trim()
  );
}

function validStoredCorrection(value: CorrectAdminPaymentRequest): boolean {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    validContext(value) &&
    Object.keys(value).every((key) => PAYMENT_CORRECTION_FIELDS.includes(key)) &&
    typeof value.reason === 'string' &&
    value.reason === value.reason.trim() &&
    value.reason.length >= 3 &&
    value.reason.length <= PAYMENT_LIMITS.note &&
    value.correctionConfirmed === true &&
    value.noMoneyMovedConfirmed === true
  );
}

export function parsePaymentAttempt(raw: string, orderId: string): AdminPaymentAttempt | null {
  if (raw.length > PAYMENT_STORAGE_LIMIT) return null;
  try {
    const value = JSON.parse(raw) as Partial<AdminPaymentAttempt> | null;
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      value.orderId !== orderId ||
      typeof value.key !== 'string' ||
      !/^[A-Za-z0-9-]{16,128}$/.test(value.key)
    )
      return null;
    if (!Object.keys(value).every((key) => PAYMENT_ATTEMPT_FIELDS.includes(key))) return null;
    if (value.mode !== PaymentEditorMode.Transaction && value.mode !== PaymentEditorMode.Correction)
      return null;
    if (typeof value.targetEntryId !== 'string' || value.targetEntryId.length > 128) return null;
    if (
      value.outcome !== PaymentAttemptOutcome.Rejected &&
      value.outcome !== PaymentAttemptOutcome.Uncertain
    )
      return null;
    if (value.transaction !== null && typeof value.transaction !== 'object') return null;
    if (value.correction !== null && typeof value.correction !== 'object') return null;
    const transaction = value.transaction || null;
    const correction = value.correction || null;
    if (
      value.mode === PaymentEditorMode.Transaction &&
      (!transaction ||
        correction !== null ||
        value.targetEntryId !== '' ||
        !validStoredTransaction(transaction))
    )
      return null;
    if (
      value.mode === PaymentEditorMode.Correction &&
      (!correction ||
        transaction !== null ||
        !value.targetEntryId ||
        !validStoredCorrection(correction))
    )
      return null;
    return {
      orderId,
      key: value.key,
      mode: value.mode,
      targetEntryId: value.targetEntryId,
      transaction,
      correction,
      outcome: value.outcome,
    };
  } catch {
    return null;
  }
}

export function parsePaymentRecoveryKey(raw: string, orderId: string): string {
  if (raw.length > PAYMENT_STORAGE_LIMIT) return '';
  try {
    const value = JSON.parse(raw) as Partial<AdminPaymentAttempt> | null;
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.orderId === orderId &&
      typeof value.key === 'string' &&
      /^[A-Za-z0-9-]{16,128}$/.test(value.key)
      ? value.key
      : '';
  } catch {
    return '';
  }
}
