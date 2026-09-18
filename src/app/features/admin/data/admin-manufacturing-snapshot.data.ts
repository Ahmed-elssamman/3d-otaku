import { ProductModelType } from '@core/enums/product-model-type.enum';
import { AdminManufacturingSnapshotState } from '../enums/admin-manufacturing-snapshot.enum';
import { ManufacturingReviewStatus } from '../enums/manufacturing-review.enum';

export const ADMIN_MANUFACTURING_SNAPSHOT_RULES = {
  urlLength: 2000,
  referenceLength: 1000,
  attributionLength: 2000,
  galleryLength: 30,
  maximumGrams: 100000,
  maximumHours: 10000,
  fingerprint: /^[a-f0-9]{64}$/,
  objectId: /^[a-f0-9]{24}$/,
};

export const ADMIN_MANUFACTURING_MODEL_TYPES: ProductModelType[] = [
  ProductModelType.GLB,
  ProductModelType.GLTF,
  ProductModelType.GLTF_EMBEDDED,
  ProductModelType.STL,
  ProductModelType.OBJ,
  ProductModelType.PLY,
];

export const ADMIN_MANUFACTURING_SNAPSHOT_TEXT = {
  title: 'مراجع التصنيع المحفوظة وقت الطلب',
  hint: 'بيانات خاصة بفريق المتجر من لحظة تسجيل الطلب. لا تُستبدل بمواصفات المنتج الحالية، ولا يتم فتح الملفات أو الروابط تلقائيًا.',
  missing: 'غير مسجل',
  required: 'كان المنتج يتطلب مراجعة تصنيع',
  notRequired: 'لم يكن المنتج مسجّلًا ضمن مسار مراجعة التصنيع',
  grams: 'جم',
  hours: 'ساعة',
};

export const ADMIN_MANUFACTURING_SNAPSHOT_MESSAGES: Record<
  AdminManufacturingSnapshotState,
  string
> = {
  [AdminManufacturingSnapshotState.NotLoaded]:
    'لم تُحمّل مراجع تصنيع هذه القطعة. أعد فتح تفاصيل الطلب لاسترجاعها.',
  [AdminManufacturingSnapshotState.Missing]:
    'لا تتوفر مراجع تصنيع محفوظة لهذه القطعة. لا تفترض أن مواصفات المنتج الحالية هي ما طُلب.',
  [AdminManufacturingSnapshotState.Available]: '',
  [AdminManufacturingSnapshotState.Unavailable]:
    'تعذّر التحقق من مراجع التصنيع المحفوظة. أعد تحميل التفاصيل وراجع السجل قبل التنفيذ.',
};

export const ADMIN_MANUFACTURING_REVIEW_LABELS: Record<ManufacturingReviewStatus, string> = {
  [ManufacturingReviewStatus.Pending]: 'كانت المراجعة قيد الانتظار',
  [ManufacturingReviewStatus.Approved]: 'كانت المراجعة معتمدة',
};

export const ADMIN_MANUFACTURING_FIELD_LABELS = {
  modelUrl: 'مرجع ملف النموذج',
  modelType: 'صيغة النموذج',
  gallery: 'مرجع صورة محفوظة',
  requiresManufacturingReview: 'مسار مراجعة المنتج',
  reviewRevision: 'رقم مراجعة التصنيع',
  reviewStatus: 'حالة المراجعة وقت الطلب',
  approvedAt: 'وقت الاعتماد المسجل',
  approvedBy: 'معرّف مسؤول الاعتماد',
  approvedFingerprint: 'بصمة المراجعة المعتمدة',
  consumedFilamentGrams: 'استهلاك الخيط المسجل',
  verifiedWeightGrams: 'وزن القطعة المقاس',
  verifiedPrintHours: 'مدة الطباعة المقاسة',
  measurementReference: 'مرجع القياسات',
  sampleReference: 'مرجع العينة',
  rightsReference: 'مرجع حقوق الاستخدام',
  manifestPath: 'مرجع بيان المصدر',
  manifestSha256: 'بصمة بيان المصدر',
  provenanceUrl: 'مرجع مصدر التصميم',
  attribution: 'نسبة التصميم لصاحبه',
  previewLabel: 'وصف مرجع المعاينة',
};
