import { CustomOrderRequest } from '@core/models/custom-order-request.model';
import {
  ContactMode,
  CustomProductType,
  DesignSource,
  PrintMaterial,
} from '../../enums/contact.enum';
import { ContactMessageRequest } from '../../models/contact-message.model';
import { CreateCustomOrderRequest } from '../../models/custom-order.model';
import {
  ContactPageState,
  ContactReceipt,
  ContactRequestSummary,
  CustomFormDraft,
} from './contact-page.model';

export const CONTACT_PAGE_STORAGE = {
  key: '3d-otaku:contact-page',
  version: 1,
  maximumLength: 80000,
};

export const CONTACT_RECOVERY_TEXT = {
  pendingCustom: 'طلب سابق محتاج تأكيد الاستلام',
  pendingMessage: 'رسالة سابقة محتاجة تأكيد الاستلام',
  explanation:
    'إعادة المحاولة هتبعت نفس البيانات المحفوظة. لو وصلت قبل كده هنسترجع رقمها؛ ولو ما وصلتش، المحاولة ممكن تسجلها مرة واحدة. التعديلات الحالية هتفضل محفوظة.',
  retryCustom: 'إعادة محاولة الفكرة السابقة',
  retryMessage: 'إعادة محاولة الرسالة السابقة',
  changed:
    'في محاولة سابقة لسه ما اتأكدش استلامها. استخدم إعادة المحاولة للبيانات المحفوظة قبل إرسال تفاصيل مختلفة.',
  uncertain:
    'تعذر تأكيد استلام رسالتك دلوقتي. المحاولة السابقة محفوظة؛ استخدم إعادة المحاولة من غير تغيير بياناتها.',
  storageUnavailable:
    'تعذّر حفظ بيانات المحاولة في هذا التبويب، فلم نرسل الطلب. أتح تخزين الجلسة ثم أعد المحاولة أو تواصل مع المتجر.',
  draftStorageUnavailable:
    'تعذّر استخدام تخزين المسودة في هذا التبويب. التعديلات الحالية موجودة في الصفحة، لكن مش مضمونة بعد إعادة التحميل. خليك في الصفحة أو انسخ التعديلات لحد ما التخزين يشتغل.',
  rejected: 'راجع البيانات والرابط المكتوب وحاول تاني. ما تمش تأكيد الإرسال، وتقدر تصحح البيانات.',
  rateLimited:
    'وصلنا عدد كبير من المحاولات. استنى قليلًا قبل إعادة المحاولة؛ البيانات الأصلية والتعديلات محفوظة.',
  retained:
    'التعديلات الحالية لسه موجودة. البيانات الموضحة هنا تخص الرسالة اللي اتسجلت، مش التعديلات الجديدة.',
  backCustom: 'الرجوع لمسودة الفكرة المحفوظة',
  backMessage: 'الرجوع لمسودة الرسالة المحفوظة',
  newCustom: 'ابعت فكرة تانية',
  newMessage: 'ابعت رسالة تانية',
  savedDetails: 'البيانات التي تم إرسالها',
  pendingDetails: 'البيانات المحفوظة للمحاولة السابقة',
  unavailable: 'تفاصيل المحاولة مش متاحة للعرض. إعادة المحاولة تستخدم النسخة المحفوظة فقط.',
  unreadable:
    'مش قادرين نقرأ بيانات المحاولة السابقة بأمان، لذلك الإرسال متوقف لتجنب تكرارها. احتفظ بالصفحة وتواصل مع المتجر من وسائل التواصل الموضحة لمراجعة استلامها.',
  pendingStorage:
    'المحاولة والمسودات محفوظة في جلسة المتصفح الحالية فقط. احتفظ بالصفحة لحد ما تتأكد من الاستلام.',
};

const CUSTOM_DRAFT_STRINGS: Array<keyof CustomFormDraft> = [
  'fullName',
  'phone',
  'email',
  'referenceUrl',
  'dimensions',
  'colorFinish',
  'details',
];
const MESSAGE_FIELDS: Array<keyof ContactMessageRequest> = [
  'fullName',
  'email',
  'phone',
  'subject',
  'message',
];
const CUSTOM_OPTIONAL_STRINGS: Array<keyof CreateCustomOrderRequest> = [
  'preferredColor',
  'estimatedSize',
  'referenceImageUrl',
  'notes',
  'preferredMaterial',
];
const boundedText = (value: string | null): boolean =>
  typeof value === 'string' && value.length <= 5000;

export function customSummary(body: CreateCustomOrderRequest | null): ContactRequestSummary | null {
  if (
    !body ||
    !boundedText(body.fullName) ||
    !boundedText(body.phone) ||
    !boundedText(body.description)
  )
    return null;
  return {
    fullName: body.fullName,
    contact: body.phone,
    title: '',
    description: body.description,
    dimensions: typeof body.estimatedSize === 'string' ? body.estimatedSize : '',
  };
}

export function messageSummary(body: ContactMessageRequest | null): ContactRequestSummary | null {
  if (!body || !MESSAGE_FIELDS.every((field) => boundedText(body[field]))) return null;
  return {
    fullName: body.fullName,
    contact: body.email,
    title: body.subject,
    description: body.message,
    dimensions: '',
  };
}

export function customWhatsAppRequest(body: CreateCustomOrderRequest): CustomOrderRequest | null {
  if (
    !customSummary(body) ||
    typeof body.quantity !== 'number' ||
    !Number.isInteger(body.quantity) ||
    body.quantity < 1 ||
    typeof body.rightsConfirmed !== 'boolean'
  )
    return null;
  return {
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    designSource: body.designSource ?? '',
    productType: body.productIdea,
    referenceUrl: body.referenceImageUrl ?? '',
    dimensions: body.estimatedSize ?? '',
    material: body.preferredMaterial ?? '',
    colorFinish: body.preferredColor ?? '',
    quantity: body.quantity,
    details: body.description,
    rightsConfirmed: body.rightsConfirmed,
  };
}

function customBodyValid(body: CreateCustomOrderRequest | null): boolean {
  return Boolean(
    body &&
    customSummary(body) &&
    boundedText(body.email) &&
    boundedText(body.whatsappNumber) &&
    boundedText(body.productIdea) &&
    CUSTOM_OPTIONAL_STRINGS.every(
      (field) => !(field in body) || boundedText(body[field] as string),
    ),
  );
}

function receiptValid<TBody extends object>(receipt: ContactReceipt<TBody> | null): boolean {
  return Boolean(
    receipt &&
    typeof receipt.reference === 'string' &&
    receipt.reference.length > 0 &&
    receipt.reference.length <= 100 &&
    typeof receipt.retainsDraft === 'boolean' &&
    receipt.request &&
    typeof receipt.request === 'object',
  );
}

export function parseContactPageState(raw: string): ContactPageState | null {
  if (raw.length > CONTACT_PAGE_STORAGE.maximumLength) return null;
  try {
    const state = JSON.parse(raw) as ContactPageState;
    const custom = state?.custom;
    if (
      state?.version !== CONTACT_PAGE_STORAGE.version ||
      !Object.values(ContactMode).includes(state.mode) ||
      !custom ||
      !CUSTOM_DRAFT_STRINGS.every((field) => boundedText(custom[field] as string)) ||
      !Object.values(DesignSource).includes(custom.designSource) ||
      !Object.values(CustomProductType).includes(custom.productType) ||
      !Object.values(PrintMaterial).includes(custom.material) ||
      typeof custom.rightsConfirmed !== 'boolean' ||
      (custom.quantity !== null &&
        (typeof custom.quantity !== 'number' || !Number.isFinite(custom.quantity))) ||
      !messageSummary(state.message)
    )
      return null;
    if (
      state.customReceipt !== null &&
      (!receiptValid(state.customReceipt) || !customBodyValid(state.customReceipt.request))
    )
      return null;
    if (
      state.messageReceipt !== null &&
      (!receiptValid(state.messageReceipt) || !messageSummary(state.messageReceipt.request))
    )
      return null;
    return state;
  } catch {
    return null;
  }
}
