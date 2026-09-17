import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import { AdminProductFormValue } from '../../models/admin-product-form.model';

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
  ...ADMIN_PRODUCT_SPEC_FIELDS.filter((field) => field.required).map((field) => ({
    key: field.key,
    id: field.id,
    field: field.label,
    message: `${field.label} مطلوب عند نشر المنتج.`,
    category: 'المواصفات',
    requiredWhenPublished: true,
  })),
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
  activeCreationError: 'لا يمكن إنشاء منتج منشور مباشرة. احفظ مسودة ثم أكمل مراجعة التصنيع قبل النشر.',
};

function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value || '').trim() ? null : { required: true };
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
      mainImage: [''],
      galleryImages: [''],
      modelUrl: [''],
      modelType: [ProductModelType.GLB],
      posterImage: [''],
      imageAlt: [''],
      socialImage: [''],
      material: builder.control<ProductMaterial | null>(null, Validators.required),
      finish: [''],
      color: [''],
      size: [''],
      weight: [''],
      printTime: [''],
      isMadeToOrder: [false],
      productionTimeMin: builder.control<number | null>(null),
      productionTimeMax: builder.control<number | null>(null),
      productionTimeUnit: builder.control<ProductionTimeUnit | null>(null),
      layerHeight: [''],
      infill: [''],
      metaTitle: [''],
      metaDescription: [''],
      keywords: [''],
      tags: [''],
      safetyNote: [''],
    },
    { validators: [productPricingValidator, productionRangeValidator, publishedProductValidator] },
  );
}
