import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';
import { CheckoutQuote, CreateOrderPayload } from '@core/models/order.model';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import {
  ProductConfigurationChange,
  ProductConfigurationDisplayRow,
} from '@core/models/product-configuration-display.model';

export interface DeliveryDraft {
  fullName: string;
  whatsappNumber: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
  notes: string;
}

export interface StoredDeliveryDraft extends DeliveryDraft {
  preserveCustomerDetails?: boolean;
}

export enum CartReceiptView {
  AUTOMATIC = 'automatic',
  RECEIPT = 'receipt',
  CART = 'cart',
}

export enum CheckoutFocusTarget {
  Cart = 'cart-title',
  Receipt = 'receipt-title',
  Review = 'checkout-price-review',
  Feedback = 'checkout-feedback',
}

export interface PendingCheckoutSummary {
  fullName: string;
  address: string;
  itemCount: number;
}

export interface CheckoutPricingLine {
  productId: string;
  name: string;
  slug: string;
  image: string;
  configuration: ProductConfiguration | null;
  configurationFingerprint: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutPricingSnapshot {
  items: CheckoutPricingLine[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
}

export interface CheckoutPriceReviewLine extends CheckoutPricingLine {
  previousUnitPrice: number;
  priceChanged: boolean;
  previousName: string;
  previousImage: string;
  nameChanged: boolean;
  imageChanged: boolean;
  configurationChanged: boolean;
  configurationUnverified: boolean;
  designChanged: boolean;
  configurationChanges: ProductConfigurationChange[];
  configurationRows: ProductConfigurationDisplayRow[];
  productLink: string[];
}

export interface CheckoutPriceReview {
  quote: CheckoutQuote;
  payload: CreateOrderPayload;
  previous: CheckoutPricingSnapshot;
  items: CheckoutPriceReviewLine[];
  introduction: string;
}

export const CHECKOUT_REVIEW_TEXT = {
  loading: 'جاري مراجعة المواصفات والأسعار والشحن…',
  title: 'راجع المواصفات والأسعار والشحن قبل تأكيد الطلب',
  changed:
    'تغيّرت تفاصيل عن المعروضة في السلة. لم نسجّل طلبًا بهذه التفاصيل؛ راجع المواصفات والأسعار والشحن قبل التأكيد.',
  cartPrice: 'سعر القطعة في السلة',
  currentPrice: 'سعر القطعة الحالي',
  previousPrice: 'السعر السابق',
  previousName: 'الاسم المحفوظ في السلة',
  previousImage: 'الصورة المحفوظة في السلة',
  currentImage: 'الصورة الحالية للقطعة',
  currentConfiguration: 'المواصفات الحالية المعروضة للتأكيد',
  cartConfiguration: 'مواصفات القطعة في السلة',
  cartConfigurationMissing:
    'المواصفات المحفوظة لهذه القطعة غير مكتملة. سنراجع المواصفات الحالية قبل تأكيد الطلب.',
  specification: 'المواصفة',
  inspectProduct: 'راجع صور ومواصفات القطعة في صفحة جديدة',
  configurationChanges: 'تغييرات المواصفات',
  previousValue: 'السابق',
  currentValue: 'الحالي',
  designChanged:
    'اتحدّثت تفاصيل التصميم أو صور القطعة. افتح صفحة القطعة وراجع التفاصيل الحالية قبل تأكيدها.',
  configurationUnverified:
    'لا توجد نسخة مؤكدة من مواصفات هذه القطعة في السلة المحفوظة. راجع المواصفات الحالية قبل تأكيد الطلب.',
  quantity: 'الكمية',
  lineTotal: 'إجمالي القطع',
  shipping: 'الشحن داخل مصر',
  previousShipping: 'الشحن المعروض سابقًا',
  unknownShipping: 'غير محدد بعد',
  totalWithShipping: 'الإجمالي شامل الشحن',
  totalBeforeShipping: 'الإجمالي قبل الشحن',
  unknownShippingNotice:
    'هذا الإجمالي لا يشمل الشحن. تكلفة الشحن تحتاج تأكيدًا حسب العنوان قبل التنفيذ.',
  knownShippingNotice:
    'تأكيدك يشمل مواصفات القطع وأسعارها ورسوم الشحن المعروضة هنا. لن يتم خصم مبلغ في هذه الخطوة.',
  confirm: 'أوافق على التفاصيل وأؤكد الطلب',
  back: 'الرجوع لتعديل السلة',
  refreshNeeded: 'تغيّرت السلة أو بيانات التوصيل. راجع التفاصيل ثم أكد الطلب من جديد.',
  quoteFailed:
    'تعذرت مراجعة المواصفات والأسعار والشحن. لم نسجّل طلبًا جديدًا؛ سلتك وبياناتك محفوظة. حاول مرة أخرى.',
  unavailable: 'هذا المنتج غير متاح للطلب حاليًا. يمكنك إزالته من السلة أو المحاولة لاحقًا.',
  invalidQuantity: 'راجع كمية هذا المنتج قبل إعادة المحاولة.',
  configurationUnavailable:
    'مواصفات هذه القطعة تحتاج مراجعة من المتجر قبل تأكيد الطلب. يمكنك المحاولة لاحقًا أو إزالة القطعة؛ بيانات التوصيل محفوظة.',
  itemsRejected: 'تعذر طلب بعض القطع. راجع التنبيه بجوار كل قطعة؛ بيانات التوصيل محفوظة.',
  uncertainQuote:
    'نتيجة المحاولة السابقة لم تتأكد. سنحتفظ بنفس المواصفات والأسعار والبيانات المحفوظة؛ استخدم إعادة محاولة الطلب السابق لاستعادة نتيجته.',
  recoveryExplanation:
    'هنرسل نفس بيانات المحاولة السابقة لاستعادة الإيصال أو إكمال تسجيل الطلب مرة واحدة بنفس التفاصيل. لو تأكدنا إن المحاولة لم تُسجّل، هتراجع المواصفات والأسعار والشحن قبل تأكيد طلب جديد. تعديلات السلة الحالية ستظل محفوظة.',
  notRecorded:
    'تأكدنا أن محاولة الطلب السابقة لم تُسجّل. سلتك وبياناتك محفوظة؛ راجع المواصفات والأسعار والشحن لتأكيد طلب جديد.',
  recoveredReview:
    'هذه مراجعة جديدة بعد التأكد من أن المحاولة السابقة لم تُسجّل. راجع مواصفات القطع وكل سعر ورسوم الشحن قبل تأكيد طلب جديد.',
};

export const EMPTY_DELIVERY_DRAFT: DeliveryDraft = {
  fullName: '',
  whatsappNumber: '',
  email: '',
  governorate: '',
  city: '',
  address: '',
  notes: '',
};

export const CHECKOUT_ERROR_TEXT = {
  sessionConflict:
    'محاولة هذا الطلب مرتبطة بجلسة سابقة. ارجع إلى الحساب أو وضع الزائر الذي بدأت به، ثم أعد المحاولة بنفس البيانات لاستعادة الإيصال. سلتك محفوظة. لو المشكلة مستمرة، تواصل معنا قبل إنشاء طلب آخر.',
  validation: 'تعذر تأكيد الطلب. راجع بياناتك وتوفّر المنتجات، ثم حاول مرة أخرى. سلتك محفوظة.',
  uncertain:
    'لم نتمكن من تأكيد استلام الطلب. احتفظ بنفس البيانات وحاول مرة أخرى؛ إعادة المحاولة لن تكرر طلبك.',
  detailsConflict:
    'توجد محاولة طلب سابقة لم تتأكد نتيجتها. تعديلاتك الحالية محفوظة ولم تُرسل. استخدم إعادة محاولة الطلب السابق ببياناته المحفوظة، أو تواصل معنا قبل إنشاء طلب آخر.',
  rejected:
    'لم تُقبل بيانات الطلب. صحح الحقول ثم أعد المحاولة؛ سنراجع المواصفات والأسعار قبل إرسال البيانات المصححة كمحاولة جديدة.',
  recoveryUnavailable: 'لا توجد محاولة سابقة متاحة للاستعادة. راجع بيانات السلة قبل تأكيد الطلب.',
};

export const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
  'شمال سيناء',
  'جنوب سيناء',
];

function egyptMobileValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  return normalizeEgyptMobile(value) ? null : { egyptMobile: true };
}

function trimmedTextValidator(minimumLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value.length >= minimumLength ? null : { trimmedLength: true };
  };
}

export interface DeliveryFormControls {
  fullName: FormControl<string>;
  whatsappNumber: FormControl<string>;
  email: FormControl<string>;
  governorate: FormControl<string>;
  city: FormControl<string>;
  address: FormControl<string>;
  notes: FormControl<string>;
}

export function createDeliveryForm(formBuilder: FormBuilder): FormGroup<DeliveryFormControls> {
  return formBuilder.nonNullable.group({
    fullName: ['', [trimmedTextValidator(3), Validators.maxLength(100)]],
    whatsappNumber: ['', [egyptMobileValidator]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    governorate: ['', [Validators.required]],
    city: ['', [trimmedTextValidator(2), Validators.maxLength(100)]],
    address: ['', [trimmedTextValidator(10), Validators.maxLength(500)]],
    notes: ['', [Validators.maxLength(1000)]],
  });
}
