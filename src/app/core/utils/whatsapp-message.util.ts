import { CustomOrderRequest } from '../models/custom-order-request.model';
import { Order } from '../models/order.model';

export function buildCustomRequestMessage(
  request: CustomOrderRequest,
  requestNumber: string = '',
): string {
  const requestReference = requestNumber
    ? `رقم الطلب الخاص: ${requestNumber}`
    : 'استفسار عن إمكانية طباعة تصميم';
  return [
    'أهلًا، حابب أتابع مراجعة فكرة للطباعة.',
    requestReference,
    `المقاس التقريبي: ${request.dimensions || 'محتاج يتحدد'}`,
    'محتاج أعرف إمكانية التنفيذ والسعر ومدة التجهيز.',
  ].join('\n');
}

export function buildOrderSupportMessage(order: Order, statusLabel: string): string {
  return `أهلًا، محتاج مساعدة بخصوص الطلب رقم ${order.orderNumber}.\nالحالة الحالية: ${statusLabel}.`;
}
