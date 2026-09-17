import { MAX_CART_QUANTITY } from './order.constants';

export const CART_ADDITION_TEXT = {
  add: 'أضف للسلة',
  addAnother: 'ضيف قطعة كمان',
  added: 'اتضافت للسلة',
  detailsAdded: 'القطعة اتضافت للسلة',
  limitLabel: 'وصلت للحد الأقصى',
  limitMessage: `الحد الأقصى ${MAX_CART_QUANTITY} قطعة من هذا المنتج في السلة.`,
  quantityLimit: 'الكمية المطلوبة تتجاوز الحد الأقصى في السلة. قلّلها قبل الإضافة.',
  invalid: 'تعذرت إضافة القطعة. راجع المنتج وحاول مرة أخرى.',
  remainingPrefix: 'يمكنك إضافة',
  remainingSuffix: 'قطعة أخرى من هذا المنتج قبل بلوغ حد السلة.',
};
