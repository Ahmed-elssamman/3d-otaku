import { OrderStatus } from '@core/enums/order-status.enum';

export const ORDER_LOADING_SKELETONS = ['order-skeleton-1', 'order-skeleton-2', 'order-skeleton-3'];

export interface OrderStatusPresentation {
  status: OrderStatus;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  className: string;
}

export const ORDER_STATUS_PRESENTATIONS: Record<OrderStatus, OrderStatusPresentation> = {
  [OrderStatus.PENDING]: { status: OrderStatus.PENDING, label: 'Pending review', labelAr: 'قيد المراجعة', description: 'The store is reviewing the order.', descriptionAr: 'المتجر بيراجع الطلب.', className: 'border-amber-500/40 bg-amber-500/15 text-amber-200' },
  [OrderStatus.PROCESSING]: { status: OrderStatus.PROCESSING, label: 'Processing', labelAr: 'جاري التنفيذ', description: 'The order is being processed.', descriptionAr: 'الطلب جاري تنفيذه.', className: 'border-blue-500/40 bg-blue-500/15 text-blue-200' },
  [OrderStatus.PRINTED]: { status: OrderStatus.PRINTED, label: 'Print completed', labelAr: 'الطباعة اكتملت', description: 'The print stage is complete.', descriptionAr: 'مرحلة الطباعة اكتملت.', className: 'border-purple-500/40 bg-purple-500/15 text-purple-200' },
  [OrderStatus.CONFIRMED]: { status: OrderStatus.CONFIRMED, label: 'Confirmed', labelAr: 'تم التأكيد', description: 'The order has been confirmed.', descriptionAr: 'تم تأكيد الطلب.', className: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200' },
  [OrderStatus.AWAITING_PAYMENT]: { status: OrderStatus.AWAITING_PAYMENT, label: 'Awaiting payment', labelAr: 'في انتظار الدفع', description: 'Payment is required before the next step.', descriptionAr: 'الدفع مطلوب قبل الخطوة التالية.', className: 'border-orange-500/40 bg-orange-500/15 text-orange-200' },
  [OrderStatus.IN_PRODUCTION]: { status: OrderStatus.IN_PRODUCTION, label: 'In production', labelAr: 'قيد التصنيع', description: 'The product is being manufactured.', descriptionAr: 'المنتج قيد التصنيع.', className: 'border-purple-500/40 bg-purple-500/15 text-purple-200' },
  [OrderStatus.QUALITY_CHECK]: { status: OrderStatus.QUALITY_CHECK, label: 'Quality check', labelAr: 'فحص الجودة', description: 'The completed product is being checked.', descriptionAr: 'بيتم فحص المنتج بعد التصنيع.', className: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200' },
  [OrderStatus.READY_TO_SHIP]: { status: OrderStatus.READY_TO_SHIP, label: 'Ready to ship', labelAr: 'جاهز للشحن', description: 'The order is ready for delivery handoff.', descriptionAr: 'الطلب جاهز للتسليم للشحن.', className: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200' },
  [OrderStatus.SHIPPED]: { status: OrderStatus.SHIPPED, label: 'Shipped', labelAr: 'تم الشحن', description: 'The order has been handed to delivery.', descriptionAr: 'تم تسليم الطلب للشحن.', className: 'border-blue-500/40 bg-blue-500/15 text-blue-200' },
  [OrderStatus.DELIVERED]: { status: OrderStatus.DELIVERED, label: 'Delivered', labelAr: 'تم التوصيل', description: 'The order was marked delivered.', descriptionAr: 'تم تسجيل الطلب كمُسلّم.', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' },
  [OrderStatus.CANCELLED]: { status: OrderStatus.CANCELLED, label: 'Cancelled', labelAr: 'ملغي', description: 'The order was cancelled.', descriptionAr: 'تم إلغاء الطلب.', className: 'border-red-500/40 bg-red-500/15 text-red-200' },
  [OrderStatus.REJECTED]: { status: OrderStatus.REJECTED, label: 'Rejected', labelAr: 'غير مقبول', description: 'The order could not be accepted.', descriptionAr: 'تعذر قبول الطلب.', className: 'border-red-500/40 bg-red-500/15 text-red-200' },
  [OrderStatus.REQUIRES_CUSTOMER_ACTION]: { status: OrderStatus.REQUIRES_CUSTOMER_ACTION, label: 'Action required', labelAr: 'مطلوب إجراء', description: 'Please contact the store about the next step.', descriptionAr: 'تواصل مع المتجر لمعرفة الخطوة التالية.', className: 'border-orange-500/40 bg-orange-500/15 text-orange-200' }
};

export const UNRECOGNIZED_ORDER_STATUS: OrderStatusPresentation = {
  status: OrderStatus.PENDING,
  label: 'Status update',
  labelAr: 'تحديث حالة',
  description: 'Contact the store for the latest customer-facing status details.',
  descriptionAr: 'تواصل مع المتجر لمعرفة أحدث تفاصيل حالة الطلب.',
  className: 'border-neutral-600 bg-neutral-800 text-neutral-200'
};
