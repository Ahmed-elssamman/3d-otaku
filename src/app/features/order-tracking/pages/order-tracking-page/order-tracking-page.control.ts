import { ApiErrorResponse } from '@core/models/api-response.model';
import { Order } from '@core/models/order.model';

export const ORDER_TRACKING_CONTENT_ANCHOR = 'main-content';

export const ORDER_TRACKING_TEXT = {
  title: 'متابعة طلبك',
  description: 'راجع حالة الطلب وتفاصيله المحفوظة من رابط المتابعة الخاص بك.',
  privacy:
    'رابط المتابعة خاص: أي شخص معاه الرابط يقدر يشوف تفاصيل الطلب وعنوان التوصيل. احتفظ به بأمان، وما تنشرهوش أو تبعته لحد غير موثوق.',
  missing:
    'افتح رابط المتابعة الخاص اللي حفظته بعد تسجيل الطلب. رقم الطلب وحده مش كفاية لعرض بيانات التوصيل.',
  invalid:
    'رابط المتابعة غير صحيح أو ناقص. افتح الرابط كاملًا من نسختك المحفوظة، أو تواصل مع المتجر للمساعدة.',
  unavailable: 'مش قادرين نعرض الطلب بهذا الرابط. راجع النسخة المحفوظة أو تواصل مع المتجر.',
  failed:
    'تعذّر تحديث تفاصيل الطلب دلوقتي. جرّب إعادة المحاولة؛ ده تحديث للمتابعة فقط ومش هيسجّل طلب جديد.',
  limited: 'محاولات المتابعة كثيرة حاليًا. استنى قليلًا ثم أعد المحاولة.',
  unsafeResponse: 'وصلت تفاصيل غير مكتملة للطلب. أعد المحاولة قبل الاعتماد على البيانات.',
  loading: 'جاري تحميل تفاصيل الطلب…',
  retry: 'إعادة محاولة المتابعة',
  refresh: 'تحديث تفاصيل الطلب',
  saved: 'عرض آخر طلب محفوظ في هذا التبويب',
  savedHint: 'ده آخر إيصال موجود في جلسة هذا التبويب، وقد يكون مختلفًا عن رابط كنت بتحاول تفتحه.',
  confirmedTotal: 'إجمالي الطلب',
  provisionalTotal: 'الإجمالي قبل الشحن',
  notPayment: 'المتابعة بتعرض ما سجّله المتجر. تسجيل الطلب أو تحديثه لا يعني إتمام الدفع.',
  robots: 'noindex, nofollow, noarchive',
};

export function trackingErrorMessage(error: ApiErrorResponse): string {
  if (error.statusCode === 429) return ORDER_TRACKING_TEXT.limited;
  if (
    error.statusCode === 400 ||
    error.statusCode === 401 ||
    error.statusCode === 403 ||
    error.statusCode === 404
  )
    return ORDER_TRACKING_TEXT.unavailable;
  return ORDER_TRACKING_TEXT.failed;
}

export function isUsableTrackedOrder(order: Order | null, orderNumber: string): boolean {
  return Boolean(
    order &&
    order.orderNumber === orderNumber &&
    typeof order.id === 'string' &&
    order.id &&
    order.customer &&
    typeof order.customer.fullName === 'string' &&
    typeof order.customer.phone === 'string' &&
    typeof order.customer.address === 'string' &&
    Array.isArray(order.items) &&
    order.items.every(
      (item) =>
        item &&
        typeof item.productId === 'string' &&
        typeof item.name === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.lineTotal),
    ) &&
    Number.isFinite(order.subtotal) &&
    Number.isFinite(order.deliveryFee) &&
    Number.isFinite(order.discount) &&
    Number.isFinite(order.total),
  );
}
