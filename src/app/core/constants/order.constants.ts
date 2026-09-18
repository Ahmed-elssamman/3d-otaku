import { OrderStorageIssue } from '../enums/order-storage-issue.enum';
import { PendingOrderState } from '../enums/pending-order-state.enum';

export const ORDER_STORAGE_KEYS = {
  receipt: '3d-otaku-order-receipt',
  pendingSubmission: '3d-otaku-pending-order',
  deliveryDraft: '3d-otaku-delivery-draft',
};

export const MAX_CART_QUANTITY = 99;

export const ORDER_TRACKING_RESPONSE_MESSAGE = 'The tracking response could not be verified.';

export const ORDER_PENDING_KEY_PATTERN = /^[A-Za-z0-9-]{16,128}$/;
export const ORDER_PENDING_STATES = Object.values(PendingOrderState);
export const ORDER_STORAGE_ERROR_FIELD = 'checkoutStorage';
export const ORDER_STORAGE_MESSAGES: Record<OrderStorageIssue, string> = {
  [OrderStorageIssue.None]: '',
  [OrderStorageIssue.WriteFailed]:
    'تعذّر حفظ بيانات محاولة الطلب في هذا التبويب، فلم نرسل الطلب. أتح تخزين الجلسة ثم أعد فحص التخزين والمحاولة، أو تواصل مع المتجر.',
  [OrderStorageIssue.Unavailable]:
    'تعذّر التحقق من بيانات محاولة الطلب المحفوظة. أوقفنا إرسال الطلبات لحماية محاولتك السابقة من التكرار. أتح تخزين الجلسة ثم أعد فحصه؛ لا تمسح بيانات التبويب أو تبدأ طلبًا آخر قبل التأكد من النتيجة مع المتجر.',
  [OrderStorageIssue.CleanupRequired]:
    'وصل إيصال الطلب، لكن تعذّر حفظه أو إنهاء بيانات المحاولة في هذا التبويب. احتفظ برابط الطلب الخاص إن كان متاحًا، ثم أعد فحص التخزين قبل بدء طلب آخر. فحص التخزين لا يرسل طلبًا جديدًا.',
};
