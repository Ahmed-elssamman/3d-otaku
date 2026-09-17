import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import { AdminProductFormValue, AdminProductRecord } from '../../models/admin-product-form.model';
import { getModelTypeFromPath } from '@core/constants/model-file.constants';
import { PRODUCT_MODEL_TYPE_OPTIONS } from '../../data/admin-products.data';

export const ADMIN_PRODUCT_LIMITS = {
  gallery: 30,
  url: 2000,
  specification: 500,
  safetyNote: 5000,
};

export const ADMIN_PRODUCT_LIMIT_TEXT = {
  gallery: `استخدم ${ADMIN_PRODUCT_LIMITS.gallery} صورة كحد أقصى، وكل رابط لا يزيد على ${ADMIN_PRODUCT_LIMITS.url} حرف. احذف الروابط الزائدة قبل الحفظ.`,
  url: `رابط الملف لا يزيد على ${ADMIN_PRODUCT_LIMITS.url} حرف.`,
  specification: `المواصفة لا تزيد على ${ADMIN_PRODUCT_LIMITS.specification} حرف.`,
  safetyNote: `ملاحظات الاستخدام والعناية لا تزيد على ${ADMIN_PRODUCT_LIMITS.safetyNote} حرف.`,
};

export const ADMIN_PRODUCT_API_FIELD_ALIASES: Record<string, keyof AdminProductFormValue> = {
  image: 'mainImage',
  gallery: 'galleryImages',
};

export const ADMIN_PRODUCT_SAVE_TEXT = {
  conflict:
    'تغيّرت النسخة المحفوظة أو لم تتأكد نتيجة الحفظ. تعديلاتك باقية هنا؛ حمّل أحدث نسخة وراجعها قبل الحفظ مجددًا.',
  unavailable: 'رقم مراجعة المنتج غير متاح. لم نرسل أي تعديل؛ حمّل أحدث نسخة للمراجعة.',
  reload: 'تحميل أحدث نسخة للمراجعة',
  loading: 'جارٍ تحميل النسخة الحالية دون تغيير تعديلاتك…',
  reloadError: 'تعذّر تحميل النسخة الحالية. تعديلاتك باقية ولم نرسل حفظًا جديدًا.',
  keep: 'الاحتفاظ بتعديلاتي ومراجعة الحفظ',
  discard: 'تجاهل تعديلاتي واستخدام النسخة الحالية',
  guidance:
    'ستُحفظ فقط الحقول التي عدّلتها محليًا فوق النسخة الحالية. حالة النشر تؤخذ من الخادم؛ غيّرها صراحةً بعد المراجعة إذا لزم. راجع الحقول ثم اضغط حفظ بنفسك.',
  noFields: 'لم تتغير الحقول المعروضة، لكن حالة المراجعة أو بيانات المنتج المحفوظة قد تغيّرت.',
  deleted: 'المنتج غير متاح أو حُذف. تعديلاتك باقية هنا ولن نعيد إنشاءه تلقائيًا.',
  rejectedCreate:
    'لم يُنشأ المنتج لأن الخادم رفض بعض البيانات. تعديلاتك باقية؛ صحّح الحقول الموضحة ثم احفظ مجددًا.',
  rejectedUpdate:
    'لم تُحفظ التعديلات لأن الخادم رفض بعض البيانات. صحّح الحقول الموضحة ثم احفظ مجددًا.',
  rejectedField: 'لم يقبل الخادم قيمة هذا الحقل. راجعها وصحّحها قبل الحفظ مجددًا.',
};

export const ADMIN_PRODUCT_FORM_LABELS: Record<keyof AdminProductFormValue, string> = {
  name: 'اسم المنتج',
  slug: 'الرابط',
  category: 'التصنيف',
  shortDescription: 'الوصف المختصر',
  description: 'الوصف',
  price: 'السعر',
  discountPrice: 'سعر الخصم',
  badge: 'الشارة',
  isFeatured: 'منتج مميز',
  isActive: 'منشور في المتجر',
  mainImage: 'الصورة الرئيسية',
  galleryImages: 'صور المعرض',
  modelUrl: 'ملف المجسم',
  modelType: 'صيغة المجسم',
  posterImage: 'صورة المعاينة',
  imageAlt: 'وصف الصورة',
  socialImage: 'صورة المشاركة',
  material: 'الخامة',
  finish: 'التشطيب',
  color: 'اللون',
  size: 'الأبعاد',
  weight: 'الوزن',
  printTime: 'وقت الطباعة',
  isMadeToOrder: 'يصنع حسب الطلب',
  productionTimeMin: 'أقل مدة إنتاج',
  productionTimeMax: 'أقصى مدة إنتاج',
  productionTimeUnit: 'وحدة مدة الإنتاج',
  layerHeight: 'ارتفاع الطبقة',
  infill: 'الحشو الداخلي',
  metaTitle: 'عنوان البحث',
  metaDescription: 'وصف البحث',
  keywords: 'الكلمات المفتاحية',
  tags: 'الوسوم',
  safetyNote: 'ملاحظة السلامة',
};

export function adminProductFormValue(product: AdminProductRecord): AdminProductFormValue {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice ?? null,
    badge: product.badge ?? ProductBadge.NONE,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    mainImage: product.image,
    galleryImages: (product.gallery ?? []).join(', '),
    modelUrl: product.modelUrl || '',
    modelType:
      PRODUCT_MODEL_TYPE_OPTIONS.find((option) => option.value === product.modelType)?.value ||
      getModelTypeFromPath(product.modelUrl || '') ||
      ProductModelType.GLB,
    posterImage: product.posterImage ?? '',
    imageAlt: product.imageAlt ?? '',
    socialImage: product.socialImage ?? '',
    material: product.material,
    finish: product.finish,
    color: product.color,
    size: product.size,
    weight: product.weight,
    printTime: product.printTime,
    isMadeToOrder: product.isMadeToOrder ?? false,
    productionTimeMin: product.productionTimeMin ?? null,
    productionTimeMax: product.productionTimeMax ?? null,
    productionTimeUnit: product.productionTimeUnit ?? null,
    layerHeight: product.layerHeight ?? '',
    infill: product.infill ?? '',
    metaTitle: product.metaTitle ?? '',
    metaDescription: product.metaDescription ?? '',
    keywords: (product.keywords ?? []).join(', '),
    tags: (product.tags ?? []).join(', '),
    safetyNote: product.safetyNote,
  };
}

export function mergeAdminProductDraft(
  saved: AdminProductFormValue,
  draft: AdminProductFormValue,
  current: AdminProductFormValue,
): AdminProductFormValue {
  let merged = { ...current };
  for (const key of Object.keys(ADMIN_PRODUCT_FORM_LABELS) as Array<keyof AdminProductFormValue>) {
    if (key !== 'isActive' && draft[key] !== saved[key]) merged = { ...merged, [key]: draft[key] };
  }
  return merged;
}

export function adminProductComparisonValue(
  value: AdminProductFormValue[keyof AdminProductFormValue],
): string {
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  return value === null || value === '' ? 'غير محدد' : String(value);
}

export interface AdminProductField {
  key: keyof AdminProductFormValue;
  id: string;
  label: string;
  hint: string;
  required: boolean;
  multiline: boolean;
  wide: boolean;
}

export enum AdminImageField {
  Main = 'mainImage',
  Poster = 'posterImage',
  Social = 'socialImage',
}

export interface FormValidationError {
  id: string;
  field: string;
  message: string;
  category: string;
}

export interface AdminProductValidationField extends FormValidationError {
  key: keyof AdminProductFormValue;
  requiredWhenPublished: boolean;
}

export interface AdminProductServerFieldError extends FormValidationError {
  key: keyof AdminProductFormValue;
  rejectedValue: AdminProductFormValue[keyof AdminProductFormValue];
}

export function adminProductServerFieldErrors(
  errors: Record<string, string[]>,
  values: AdminProductFormValue,
): AdminProductServerFieldError[] {
  const result: AdminProductServerFieldError[] = [];
  for (const apiField of Object.keys(errors)) {
    if (!Array.isArray(errors[apiField]) || !errors[apiField].length) continue;
    const key = Object.hasOwn(ADMIN_PRODUCT_API_FIELD_ALIASES, apiField)
      ? ADMIN_PRODUCT_API_FIELD_ALIASES[apiField]
      : ((Object.keys(ADMIN_PRODUCT_FORM_LABELS) as Array<keyof AdminProductFormValue>).find(
          (field) => field === apiField,
        ) ?? null);
    if (!key) continue;
    const field = ADMIN_PRODUCT_VALIDATION_FIELDS.find((entry) => entry.key === key);
    result.push({
      key,
      id: field?.id ?? `product-${key}`,
      field: ADMIN_PRODUCT_FORM_LABELS[key],
      category: field?.category ?? 'بيانات المنتج',
      message: field
        ? `${ADMIN_PRODUCT_SAVE_TEXT.rejectedField} ${field.message}`
        : ADMIN_PRODUCT_SAVE_TEXT.rejectedField,
      rejectedValue: values[key],
    });
  }
  return result;
}

export const ADMIN_PRODUCT_SPEC_FIELDS: AdminProductField[] = [
  {
    key: 'finish',
    id: 'field-finish',
    label: 'التشطيب',
    hint: 'التشطيب الفعلي للقطعة، بدون افتراضات.',
    required: true,
    multiline: false,
    wide: false,
  },
  {
    key: 'color',
    id: 'field-color',
    label: 'اللون المتاح',
    hint: '',
    required: true,
    multiline: false,
    wide: false,
  },
  {
    key: 'size',
    id: 'field-size',
    label: 'الأبعاد',
    hint: 'أدخل القياسات ووحدتها.',
    required: true,
    multiline: false,
    wide: false,
  },
  {
    key: 'weight',
    id: 'field-weight',
    label: 'الوزن',
    hint: 'الوزن المؤكد مع الوحدة.',
    required: true,
    multiline: false,
    wide: false,
  },
  {
    key: 'printTime',
    id: 'field-print-time',
    label: 'وقت الطباعة',
    hint: 'تقدير الطباعة؛ ليس وعدًا بموعد التوصيل.',
    required: true,
    multiline: false,
    wide: false,
  },
  {
    key: 'layerHeight',
    id: 'field-layer-height',
    label: 'ارتفاع الطبقة (اختياري)',
    hint: '',
    required: false,
    multiline: false,
    wide: false,
  },
  {
    key: 'infill',
    id: 'field-infill',
    label: 'الحشو الداخلي (اختياري)',
    hint: '',
    required: false,
    multiline: false,
    wide: false,
  },
];

export const ADMIN_PRODUCT_VALIDATION_FIELDS: AdminProductValidationField[] = [
  {
    key: 'name',
    id: 'field-name',
    field: 'اسم المنتج',
    message: 'اكتب اسم المنتج بحد أقصى 200 حرف.',
    category: 'البيانات الأساسية',
    requiredWhenPublished: false,
  },
  {
    key: 'slug',
    id: 'field-slug',
    field: 'رابط المنتج',
    message: 'استخدم حروفًا وأرقامًا وشرطات فقط، بحد أقصى 160 حرفًا.',
    category: 'البيانات الأساسية',
    requiredWhenPublished: false,
  },
  {
    key: 'category',
    id: 'field-category',
    field: 'التصنيف',
    message: 'اختر التصنيف المناسب للقطعة.',
    category: 'البيانات الأساسية',
    requiredWhenPublished: false,
  },
  {
    key: 'shortDescription',
    id: 'field-short-description',
    field: 'الوصف المختصر',
    message: 'الوصف المختصر مطلوب لنشر المنتج.',
    category: 'البيانات الأساسية',
    requiredWhenPublished: true,
  },
  {
    key: 'description',
    id: 'field-description',
    field: 'وصف المنتج',
    message: 'الوصف مطلوب لنشر المنتج.',
    category: 'البيانات الأساسية',
    requiredWhenPublished: true,
  },
  {
    key: 'price',
    id: 'field-price',
    field: 'السعر',
    message: 'أدخل سعرًا غير سالب. يلزم سعر أكبر من صفر عند النشر.',
    category: 'التسعير',
    requiredWhenPublished: false,
  },
  {
    key: 'material',
    id: 'field-material',
    field: 'الخامة',
    message: 'اختر الخامة المقصودة للقطعة.',
    category: 'المواصفات',
    requiredWhenPublished: false,
  },
  ...ADMIN_PRODUCT_SPEC_FIELDS.map((field) => ({
    key: field.key,
    id: field.id,
    field: field.label,
    message: field.required
      ? `${field.label} مطلوب عند نشر المنتج. ${ADMIN_PRODUCT_LIMIT_TEXT.specification}`
      : ADMIN_PRODUCT_LIMIT_TEXT.specification,
    category: 'المواصفات',
    requiredWhenPublished: field.required,
  })),
  {
    key: 'discountPrice',
    id: 'field-discount',
    field: 'سعر الخصم',
    message: 'أدخل سعر خصم غير سالب وأقل من السعر الأساسي، أو اتركه فارغًا.',
    category: 'التسعير',
    requiredWhenPublished: false,
  },
  {
    key: 'mainImage',
    id: 'field-main-image',
    field: 'الصورة الرئيسية',
    message: ADMIN_PRODUCT_LIMIT_TEXT.url,
    category: 'الملفات',
    requiredWhenPublished: false,
  },
  {
    key: 'galleryImages',
    id: 'field-gallery-images',
    field: 'صور المعرض',
    message: ADMIN_PRODUCT_LIMIT_TEXT.gallery,
    category: 'الملفات',
    requiredWhenPublished: false,
  },
  {
    key: 'modelUrl',
    id: 'field-model-url',
    field: 'رابط المجسم',
    message: ADMIN_PRODUCT_LIMIT_TEXT.url,
    category: 'الملفات',
    requiredWhenPublished: false,
  },
  {
    key: 'posterImage',
    id: 'field-poster-image',
    field: 'صورة المعاينة',
    message: ADMIN_PRODUCT_LIMIT_TEXT.url,
    category: 'الملفات',
    requiredWhenPublished: false,
  },
  {
    key: 'socialImage',
    id: 'field-social-image',
    field: 'صورة المشاركة',
    message: ADMIN_PRODUCT_LIMIT_TEXT.url,
    category: 'الملفات',
    requiredWhenPublished: false,
  },
  {
    key: 'safetyNote',
    id: 'field-safety-note',
    field: 'ملاحظات الاستخدام والعناية',
    message: ADMIN_PRODUCT_LIMIT_TEXT.safetyNote,
    category: 'الاستخدام والعناية',
    requiredWhenPublished: false,
  },
];

export const ADMIN_PRODUCT_META_FIELDS: AdminProductField[] = [
  {
    key: 'metaTitle',
    id: 'field-meta-title',
    label: 'عنوان محركات البحث (اختياري)',
    hint: '',
    required: false,
    multiline: false,
    wide: false,
  },
  {
    key: 'keywords',
    id: 'field-keywords',
    label: 'كلمات البحث (اختياري)',
    hint: 'افصل الكلمات بفاصلة.',
    required: false,
    multiline: false,
    wide: false,
  },
  {
    key: 'tags',
    id: 'field-tags',
    label: 'وسوم المنتج (اختياري)',
    hint: 'افصل الوسوم بفاصلة.',
    required: false,
    multiline: false,
    wide: true,
  },
  {
    key: 'metaDescription',
    id: 'field-meta-description',
    label: 'وصف محركات البحث (اختياري)',
    hint: '',
    required: false,
    multiline: true,
    wide: true,
  },
  {
    key: 'safetyNote',
    id: 'field-safety-note',
    label: 'ملاحظات الاستخدام والعناية (اختياري)',
    hint: 'أدخل تعليمات تخص القطعة وخامتها الفعلية.',
    required: false,
    multiline: true,
    wide: true,
  },
];

export const MAX_ADMIN_IMAGE_SIZE = 10 * 1024 * 1024;
export const ADMIN_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ADMIN_IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const ADMIN_PRODUCT_REVIEW_TEXT = {
  introduction:
    'تُحفظ المنتجات الجديدة والنسخ كمسودات تحتاج مراجعة التصنيع والعينة والحقوق والتسعير قبل النشر.',
  newDraftGuidance:
    'احفظ المنتج أولًا كمسودة. تبدأ مراجعة التصنيع تلقائيًا بعد الحفظ؛ استخدم «حفظ ومتابعة التعديل» لإدخال القياسات والتكاليف والمراجع.',
  pendingGuidance:
    'هذه المسودة تحتاج إلى اعتماد مراجعة التصنيع والعينة والحقوق والتسعير قبل النشر. يمكنك حفظ بياناتها وهي غير منشورة.',
  createdSummary: 'تم إنشاء مسودة للمراجعة',
  createdDetail: 'المنتج غير منشور. أكمل مراجعة التصنيع والتكاليف والعينة والحقوق قبل نشره.',
  activeCreationError:
    'لا يمكن إنشاء منتج منشور مباشرة. احفظ مسودة ثم أكمل مراجعة التصنيع قبل النشر.',
};

function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value || '').trim() ? null : { required: true };
}

export function adminProductListValues(value: string | null): string[] {
  return (value ?? '')
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function adminProductGalleryCapacityMessage(remaining: number): string {
  return `المساحة المتبقية في المعرض ${remaining} صورة. لم نرفع أي ملف؛ اختر عددًا ضمن المساحة المتبقية أو احذف صورًا من المعرض.`;
}

function productGalleryValidator(control: AbstractControl): ValidationErrors | null {
  const urls = adminProductListValues(control.value as string | null);
  return urls.length <= ADMIN_PRODUCT_LIMITS.gallery &&
    urls.every((url) => url.length <= ADMIN_PRODUCT_LIMITS.url)
    ? null
    : { galleryLimit: true };
}

function productPricingValidator(control: AbstractControl): ValidationErrors | null {
  const price = control.get('price')?.value as number | null;
  const discount = control.get('discountPrice')?.value as number | null;
  if (discount === null) return null;
  return typeof price === 'number' &&
    typeof discount === 'number' &&
    discount >= 0 &&
    discount < price
    ? null
    : { invalidDiscount: true };
}

function productionRangeValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.get('isMadeToOrder')?.value) return null;
  const minimum = control.get('productionTimeMin')?.value as number | null;
  const maximum = control.get('productionTimeMax')?.value as number | null;
  return typeof minimum === 'number' &&
    typeof maximum === 'number' &&
    minimum > 0 &&
    maximum >= minimum &&
    Boolean(control.get('productionTimeUnit')?.value)
    ? null
    : { invalidProductionRange: true };
}

function publishedProductValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.get('isActive')?.value) return null;
  const price = control.get('price')?.value as number | null;
  if (price === null || price <= 0) return { invalidPublishedPrice: true };
  return ADMIN_PRODUCT_VALIDATION_FIELDS.filter((field) => field.requiredWhenPublished).every(
    (field) => String(control.get(field.key)?.value || '').trim(),
  )
    ? null
    : { missingPublishedFields: true };
}

export function createAdminProductForm(builder: FormBuilder) {
  return builder.nonNullable.group(
    {
      name: ['', [requiredText, Validators.maxLength(200)]],
      slug: [
        '',
        [
          Validators.required,
          Validators.maxLength(160),
          Validators.pattern(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
        ],
      ],
      category: builder.control<string | null>(null, requiredText),
      shortDescription: [''],
      description: [''],
      price: builder.control<number | null>(null, [Validators.required, Validators.min(0)]),
      discountPrice: builder.control<number | null>(null),
      badge: [ProductBadge.NONE],
      isFeatured: [false],
      isActive: [{ value: false, disabled: true }],
      mainImage: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.url)],
      galleryImages: ['', productGalleryValidator],
      modelUrl: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.url)],
      modelType: [ProductModelType.GLB],
      posterImage: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.url)],
      imageAlt: [''],
      socialImage: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.url)],
      material: builder.control<ProductMaterial | null>(null, [
        Validators.required,
        Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification),
      ]),
      finish: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      color: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      size: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      weight: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      printTime: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      isMadeToOrder: [false],
      productionTimeMin: builder.control<number | null>(null),
      productionTimeMax: builder.control<number | null>(null),
      productionTimeUnit: builder.control<ProductionTimeUnit | null>(null),
      layerHeight: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      infill: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.specification)],
      metaTitle: [''],
      metaDescription: [''],
      keywords: [''],
      tags: [''],
      safetyNote: ['', Validators.maxLength(ADMIN_PRODUCT_LIMITS.safetyNote)],
    },
    { validators: [productPricingValidator, productionRangeValidator, publishedProductValidator] },
  );
}
