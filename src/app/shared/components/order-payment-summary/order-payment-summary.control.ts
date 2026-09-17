import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';

export interface PaymentSummaryPresentation {
  label: string;
  message: string;
  showRecordedAmounts: boolean;
  showBalance: boolean;
}

export const PAYMENT_SUMMARY_COPY = {
  title: 'ملخص الدفعات المسجلة',
  collected: 'المبالغ المحصّلة المسجلة',
  refunded: 'المبالغ المستردة المسجلة',
  net: 'صافي المبالغ المسجلة',
  balance: 'المتبقي حسب السجل',
  credit: 'المبلغ الزائد حسب السجل',
  currency: 'ج.م',
  basis: 'هذا الملخص يعرض ما سجله المتجر، وليس تحققًا إلكترونيًا من التحويلات.',
  creditNote: 'المبلغ الزائد يحتاج مراجعة مع المتجر؛ ظهوره لا يعني إتمام استرداده.',
};

export const PAYMENT_SUMMARY_PRESENTATIONS: Record<PaymentSummaryState, PaymentSummaryPresentation> = {
  [PaymentSummaryState.NoRecords]: {
    label: 'لا توجد دفعات مسجلة',
    message: 'لا توجد دفعات مسجلة حاليًا لهذا الطلب. غياب السجل لا يثبت أن الطلب غير مدفوع.',
    showRecordedAmounts: false,
    showBalance: false,
  },
  [PaymentSummaryState.ShippingUnconfirmed]: {
    label: 'الرصيد النهائي ينتظر تأكيد الشحن',
    message: 'الدفعات أدناه مسجلة، لكن تكلفة الشحن لم تتأكد بعد؛ لذلك لا يظهر مبلغ نهائي متبقٍ أو زائد.',
    showRecordedAmounts: true,
    showBalance: false,
  },
  [PaymentSummaryState.RecordedBalance]: {
    label: 'الرصيد حسب الدفعات المسجلة',
    message: 'الحساب يشمل رسوم الشحن المؤكدة والدفعات المسجلة حاليًا. الرصيد لا يغيّر حالة تنفيذ الطلب.',
    showRecordedAmounts: true,
    showBalance: true,
  },
  [PaymentSummaryState.SettlementReview]: {
    label: 'الطلب الملغى يحتاج مراجعة التسوية',
    message: 'هذه المبالغ مسجلة لطلب ملغى. الإلغاء لا يعني استرداد المبلغ تلقائيًا؛ راجع المتجر لتسوية الحساب.',
    showRecordedAmounts: true,
    showBalance: false,
  },
  [PaymentSummaryState.Unavailable]: {
    label: 'ملخص الدفعات غير متاح',
    message: 'لا تتوفر بيانات موثوقة لعرض الرصيد الآن. حدّث بيانات الطلب أو تواصل مع المتجر للمراجعة.',
    showRecordedAmounts: false,
    showBalance: false,
  },
};
