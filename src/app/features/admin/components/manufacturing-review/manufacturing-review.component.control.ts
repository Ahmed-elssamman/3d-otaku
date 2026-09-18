import { FormBuilder, Validators } from '@angular/forms';
import {
  ManufacturingHistoryAction,
  ManufacturingMaterial,
  ManufacturingRounding,
} from '../../enums/manufacturing-review.enum';
import {
  ManufacturingCostBreakdown,
  ManufacturingReviewInputs,
} from '../../models/manufacturing-review.model';

export enum ManufacturingMeasurementField {
  ConsumedFilament = 'consumedFilamentGrams',
  FinishedWeight = 'verifiedWeightGrams',
  PrintHours = 'verifiedPrintHours',
}

export enum ManufacturingCostField {
  Machine = 'machineCostPerHourEgp',
  Electricity = 'electricityCostPerHourEgp',
  Labor = 'laborCostEgp',
  Packaging = 'packagingCostEgp',
  Hardware = 'hardwareCostEgp',
  Overhead = 'overheadCostEgp',
  FixedFee = 'fixedPaymentFeeEgp',
  Failure = 'failureRatePercent',
  Margin = 'targetGrossMarginPercent',
  VariableFee = 'variablePaymentFeePercent',
  Returns = 'returnReservePercent',
}

export enum ManufacturingReferenceField {
  Measurement = 'measurementReference',
  Sample = 'sampleReference',
  Rights = 'rightsReference',
}

export enum ManufacturingAction {
  Idle = 'idle',
  Saving = 'saving',
  Quoting = 'quoting',
  Approving = 'approving',
  Reloading = 'reloading',
  Unpublishing = 'unpublishing',
}

export interface ManufacturingMeasurementControl {
  key: ManufacturingMeasurementField;
  label: string;
  hint: string;
}

export interface ManufacturingCostControl {
  key: ManufacturingCostField;
  label: string;
  percent: boolean;
}

export interface ManufacturingReferenceControl {
  key: ManufacturingReferenceField;
  label: string;
  hint: string;
}

export interface ManufacturingBreakdownControl {
  key: keyof ManufacturingCostBreakdown;
  label: string;
  total: boolean;
}

export interface ManufacturingBreakdownRow extends ManufacturingBreakdownControl {
  amountEgp: number;
}

export interface ManufacturingHistoryRow {
  key: string;
  label: string;
  revision: number;
  createdAt: string;
}

export const MANUFACTURING_MEASUREMENT_FIELDS: ManufacturingMeasurementControl[] = [
  {
    key: ManufacturingMeasurementField.ConsumedFilament,
    label: 'الخامة المستهلكة (جرام)',
    hint: 'استهلاك القطعة شامل الدعامات والهدر؛ يختلف عن وزن القطعة النهائية.',
  },
  {
    key: ManufacturingMeasurementField.FinishedWeight,
    label: 'وزن القطعة بعد التصنيع (جرام)',
    hint: 'وزن العينة المنتهية حسب القياس الفعلي.',
  },
  {
    key: ManufacturingMeasurementField.PrintHours,
    label: 'زمن الطباعة المتحقق (ساعة)',
    hint: 'يستخدمه الخادم لحساب تكلفة الماكينة والكهرباء.',
  },
];

export const MANUFACTURING_COST_FIELDS: ManufacturingCostControl[] = [
  { key: ManufacturingCostField.Machine, label: 'تكلفة الماكينة لكل ساعة (ج.م)', percent: false },
  {
    key: ManufacturingCostField.Electricity,
    label: 'تكلفة الكهرباء لكل ساعة (ج.م)',
    percent: false,
  },
  { key: ManufacturingCostField.Labor, label: 'العمل والتشطيب للقطعة (ج.م)', percent: false },
  { key: ManufacturingCostField.Packaging, label: 'التغليف للقطعة (ج.م)', percent: false },
  { key: ManufacturingCostField.Hardware, label: 'الإكسسوارات للقطعة (ج.م)', percent: false },
  { key: ManufacturingCostField.Overhead, label: 'المصروفات العامة للقطعة (ج.م)', percent: false },
  { key: ManufacturingCostField.FixedFee, label: 'رسوم الدفع الثابتة (ج.م)', percent: false },
  { key: ManufacturingCostField.Failure, label: 'نسبة فشل الطباعة (%)', percent: true },
  { key: ManufacturingCostField.Margin, label: 'هامش الربح المستهدف (%)', percent: true },
  { key: ManufacturingCostField.VariableFee, label: 'رسوم الدفع المتغيرة (%)', percent: true },
  { key: ManufacturingCostField.Returns, label: 'احتياطي المرتجعات (%)', percent: true },
];

export const MANUFACTURING_REFERENCE_FIELDS: ManufacturingReferenceControl[] = [
  {
    key: ManufacturingReferenceField.Measurement,
    label: 'مرجع القياسات',
    hint: 'مرجع تقرير الطباعة أو سجل قياسات العينة، مع ما يكفي للوصول إليه.',
  },
  {
    key: ManufacturingReferenceField.Sample,
    label: 'مرجع فحص العينة',
    hint: 'مرجع فحص جودة العينة وسلامة استخدامها.',
  },
  {
    key: ManufacturingReferenceField.Rights,
    label: 'مرجع حقوق النموذج والصور',
    hint: 'مرجع الترخيص أو الإذن الذي يغطي النموذج والصور والاستخدام التجاري.',
  },
];

export const MANUFACTURING_MATERIAL_OPTIONS = [
  { value: ManufacturingMaterial.PLA, label: 'PLA' },
  { value: ManufacturingMaterial.PLAPlus, label: 'PLA+' },
];

export const MANUFACTURING_ROUNDING_OPTIONS = [
  { value: ManufacturingRounding.Piastre, label: 'لأعلى إلى أقرب قرش' },
  { value: ManufacturingRounding.FiveEgp, label: 'لأعلى إلى أقرب 5 جنيهات' },
];

export const MANUFACTURING_CONSUMPTION_OPTIONS = [
  { value: true, label: 'نعم، يشمل الدعامات والهدر' },
  { value: false, label: 'لا، لم يشملهما بعد' },
];

export const MANUFACTURING_BREAKDOWN_FIELDS: ManufacturingBreakdownControl[] = [
  { key: 'material', label: 'الخامة', total: false },
  { key: 'machine', label: 'الماكينة', total: false },
  { key: 'electricity', label: 'الكهرباء', total: false },
  { key: 'failureAllowance', label: 'مخصص فشل الطباعة', total: false },
  { key: 'expectedPrint', label: 'إجمالي الطباعة المتوقع', total: true },
  { key: 'labor', label: 'العمل والتشطيب', total: false },
  { key: 'packaging', label: 'التغليف', total: false },
  { key: 'hardware', label: 'الإكسسوارات', total: false },
  { key: 'overhead', label: 'المصروفات العامة', total: false },
  { key: 'fixedPaymentFee', label: 'رسوم الدفع الثابتة', total: false },
  { key: 'costBeforeSalesFees', label: 'إجمالي التكلفة قبل رسوم البيع', total: true },
  { key: 'variablePaymentFee', label: 'رسوم الدفع المتغيرة', total: false },
  { key: 'returnReserve', label: 'احتياطي المرتجعات', total: false },
  { key: 'expectedProfit', label: 'الربح المتوقع عند السعر المحسوب', total: false },
  { key: 'minimumPrice', label: 'الحد الأدنى المحسوب للسعر', total: true },
  { key: 'roundingIncrease', label: 'زيادة التقريب', total: false },
  { key: 'retailPrice', label: 'السعر المستهدف بعد التقريب', total: true },
];

export const MANUFACTURING_EXCLUSION_LABELS: Record<string, string> = {
  shipping: 'الشحن',
  taxes: 'الضرائب',
  'machine-time': 'وقت الماكينة',
  electricity: 'الكهرباء',
};

export const MANUFACTURING_HISTORY_LABELS: Record<ManufacturingHistoryAction, string> = {
  [ManufacturingHistoryAction.Started]: 'بدأت مراجعة التصنيع',
  [ManufacturingHistoryAction.Saved]: 'حُفظت بيانات المراجعة',
  [ManufacturingHistoryAction.Approved]: 'اعتُمدت مراجعة التصنيع',
  [ManufacturingHistoryAction.Invalidated]: 'أُلغي الاعتماد بعد تغيير بيانات المنتج',
  [ManufacturingHistoryAction.Duplicated]: 'أُنشئت نسخة تحتاج مراجعة مستقلة',
};

export const MANUFACTURING_ERROR_LABELS: Record<string, string> = {
  ...Object.fromEntries(MANUFACTURING_MEASUREMENT_FIELDS.map((field) => [field.key, field.label])),
  ...Object.fromEntries(MANUFACTURING_COST_FIELDS.map((field) => [field.key, field.label])),
  ...Object.fromEntries(MANUFACTURING_REFERENCE_FIELDS.map((field) => [field.key, field.label])),
  material: 'خامة المنتج وخامة التسعير',
  consumptionIncludesSupportAndWaste: 'تأكيد شمول الدعامات والهدر',
  retailRounding: 'طريقة تقريب السعر',
  price: 'سعر البيع الحالي',
  discountPrice: 'سعر الخصم الحالي',
  sampleApproved: 'إقرار فحص العينة',
  rightsReviewed: 'إقرار الحقوق',
  pricingApproved: 'إقرار التسعير',
};

export function emptyManufacturingInputs(): ManufacturingReviewInputs {
  return {
    consumedFilamentGrams: null,
    verifiedWeightGrams: null,
    verifiedPrintHours: null,
    measurementReference: '',
    sampleReference: '',
    rightsReference: '',
    costing: {
      material: null,
      consumptionIncludesSupportAndWaste: null,
      machineCostPerHourEgp: null,
      electricityCostPerHourEgp: null,
      laborCostEgp: null,
      packagingCostEgp: null,
      hardwareCostEgp: null,
      overheadCostEgp: null,
      fixedPaymentFeeEgp: null,
      failureRatePercent: null,
      targetGrossMarginPercent: null,
      variablePaymentFeePercent: null,
      returnReservePercent: null,
      retailRounding: null,
    },
  };
}

export function createManufacturingReviewForm(builder: FormBuilder) {
  const quantity = () =>
    builder.control<number | null>(null, [
      Validators.min(0.001),
      Validators.pattern(/^\d+(\.\d{1,3})?$/),
    ]);
  const cost = () =>
    builder.control<number | null>(null, [
      Validators.min(0),
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]);
  const percent = () =>
    builder.control<number | null>(null, [
      Validators.min(0),
      Validators.max(99.99),
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]);
  return builder.group({
    consumedFilamentGrams: quantity(),
    verifiedWeightGrams: quantity(),
    verifiedPrintHours: quantity(),
    measurementReference: builder.nonNullable.control('', Validators.maxLength(1000)),
    sampleReference: builder.nonNullable.control('', Validators.maxLength(1000)),
    rightsReference: builder.nonNullable.control('', Validators.maxLength(1000)),
    costing: builder.group({
      material: builder.control<ManufacturingMaterial | null>(null),
      consumptionIncludesSupportAndWaste: builder.control<boolean | null>(null),
      machineCostPerHourEgp: cost(),
      electricityCostPerHourEgp: cost(),
      laborCostEgp: cost(),
      packagingCostEgp: cost(),
      hardwareCostEgp: cost(),
      overheadCostEgp: cost(),
      fixedPaymentFeeEgp: cost(),
      failureRatePercent: percent(),
      targetGrossMarginPercent: percent(),
      variablePaymentFeePercent: percent(),
      returnReservePercent: percent(),
      retailRounding: builder.control<ManufacturingRounding | null>(null),
    }),
  });
}

export function createManufacturingAttestationsForm(builder: FormBuilder) {
  return builder.nonNullable.group({
    sampleApproved: false,
    rightsReviewed: false,
    pricingApproved: false,
  });
}
