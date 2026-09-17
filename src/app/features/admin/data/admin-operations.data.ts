import { ApiMeta } from '@core/models/api-response.model';
import { AdminOperationKind, AdminOperationStatus } from '../enums/admin-operation.enum';
import { AdminOperationConfig, AdminStatusOption } from '../models/admin-operation.model';

export const ADMIN_STATUS_LABELS: Record<AdminOperationStatus, string> = {
  [AdminOperationStatus.Pending]: 'بانتظار المراجعة',
  [AdminOperationStatus.Processing]: 'قيد التجهيز',
  [AdminOperationStatus.Printed]: 'تمت الطباعة',
  [AdminOperationStatus.Shipped]: 'تم الشحن',
  [AdminOperationStatus.Delivered]: 'تم التسليم',
  [AdminOperationStatus.Cancelled]: 'ملغي',
  [AdminOperationStatus.Contacted]: 'تم التواصل',
  [AdminOperationStatus.InProgress]: 'قيد التنفيذ',
  [AdminOperationStatus.Completed]: 'مكتمل',
  [AdminOperationStatus.Unread]: 'غير مقروءة',
  [AdminOperationStatus.Read]: 'مقروءة',
};

export function adminStatusOption(value: AdminOperationStatus): AdminStatusOption {
  return { value, label: ADMIN_STATUS_LABELS[value] || value };
}

const ORDER_STATUSES: AdminOperationStatus[] = [
  AdminOperationStatus.Pending,
  AdminOperationStatus.Processing,
  AdminOperationStatus.Printed,
  AdminOperationStatus.Shipped,
  AdminOperationStatus.Delivered,
  AdminOperationStatus.Cancelled,
];

const CUSTOM_STATUSES: AdminOperationStatus[] = [
  AdminOperationStatus.Pending,
  AdminOperationStatus.Contacted,
  AdminOperationStatus.InProgress,
  AdminOperationStatus.Completed,
  AdminOperationStatus.Cancelled,
];

export const ADMIN_OPERATION_CONFIG: Record<AdminOperationKind, AdminOperationConfig> = {
  [AdminOperationKind.Orders]: {
    kind: AdminOperationKind.Orders,
    title: 'طلبات المتجر',
    description: 'راجع بيانات التوصيل والمنتجات، وحدّث مراحل الطلب بعد تنفيذ الخطوة فعليًا.',
    searchLabel: 'ابحث برقم الطلب أو اسم العميل أو الهاتف',
    emptyText: 'لا توجد طلبات تطابق البحث الحالي.',
    statuses: ORDER_STATUSES.map(adminStatusOption),
    noteLabel: 'ملاحظة للعميل (اختيارية)',
    noteHint: 'تظهر هذه الملاحظة للعميل في سجل الطلب. لا تكتب بيانات داخلية أو معلومات دفع حساسة.',
  },
  [AdminOperationKind.CustomOrders]: {
    kind: AdminOperationKind.CustomOrders,
    title: 'طلبات التصميم الخاص',
    description: 'راجع الفكرة والمقاسات والخامة المطلوبة، وتابع التواصل والتنفيذ مع العميل.',
    searchLabel: 'ابحث برقم الطلب أو اسم العميل أو الفكرة',
    emptyText: 'لا توجد طلبات تصميم تطابق البحث الحالي.',
    statuses: CUSTOM_STATUSES.map(adminStatusOption),
    noteLabel: 'ملاحظة متابعة داخلية (اختيارية)',
    noteHint: 'تُحفظ في سجل المتابعة للإدارة. لا ترسل رسالة تلقائية للعميل.',
  },
  [AdminOperationKind.Messages]: {
    kind: AdminOperationKind.Messages,
    title: 'رسائل العملاء',
    description:
      'اقرأ استفسارات العملاء وغيّر حالة القراءة بعد مراجعتها. الرد يتم عبر قناة التواصل المناسبة.',
    searchLabel: 'ابحث بالاسم أو البريد أو موضوع الرسالة',
    emptyText: 'لا توجد رسائل تطابق البحث الحالي.',
    statuses: [AdminOperationStatus.Unread, AdminOperationStatus.Read].map(adminStatusOption),
    noteLabel: '',
    noteHint: '',
  },
};

export const ADMIN_OPERATIONS_META: ApiMeta = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export const ADMIN_OPERATION_PAGE_SIZES: number[] = [10, 20, 50];

export const ADMIN_DESIGN_SOURCE_LABELS: Record<string, string> = {
  'written-idea': 'فكرة مكتوبة',
  'reference-image': 'صورة مرجعية',
  'makerworld-url': 'رابط تصميم من MakerWorld',
  'other-model-url': 'رابط تصميم من منصة أخرى',
  'ready-model': 'ملف تصميم جاهز',
  'existing-model': 'ملف تصميم جاهز',
};

export const ADMIN_CUSTOM_PRODUCT_LABELS: Record<string, string> = {
  'desk-model': 'قطعة للمكتب أو ترتيب الأدوات',
  'display-model': 'مجسم للعرض',
  collectible: 'هدية أو قطعة للاقتناء',
  'cosplay-prop': 'إكسسوار تنكري للعرض',
  other: 'استخدام آخر',
};
