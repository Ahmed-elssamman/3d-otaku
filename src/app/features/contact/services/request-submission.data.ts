import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';
import { PublicRequestError } from '../enums/public-request-error.enum';

export const PUBLIC_REQUEST_ENDPOINTS: PublicRequestEndpoint[] = [
  PublicRequestEndpoint.CustomOrders,
  PublicRequestEndpoint.ContactMessages,
];

export const PUBLIC_REQUEST_STORAGE_PREFIX = '3d-otaku:pending-submission:';

export const PUBLIC_REQUEST_ERRORS: Record<PublicRequestError, string> = {
  [PublicRequestError.Details]:
    'لم نتأكد من نتيجة الإرسال السابق. استعد نفس الطلب أولًا؛ التعديلات الحالية محفوظة.',
  [PublicRequestError.Recovery]:
    'تعذّر استعادة بيانات الإرسال السابق. تواصل مع المتجر للتحقق قبل إرسال طلب آخر.',
  [PublicRequestError.Receipt]:
    'لم يصل تأكيد صالح للإرسال. أعد محاولة الطلب السابق للتحقق من استلامه.',
  [PublicRequestError.Storage]:
    'تعذّر حفظ بيانات المحاولة في هذا التبويب، فلم نرسل الطلب. أتح تخزين الجلسة ثم أعد المحاولة أو تواصل مع المتجر.',
};
