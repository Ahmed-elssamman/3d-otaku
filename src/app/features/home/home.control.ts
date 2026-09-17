export interface HomeContentItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}
export interface HomeFaqItem {
  id: string;
  question: string;
  answer: string;
}
export const HOME_HERO_FALLBACK_IMAGE = 'assets/storefront/knight-phone-holder.c8fc790b3bd5e17bd7747a844a3e3ff4f05844b4acddc5780f89aa236959882f.webp';
export const HOME_HERO_TITLE = 'تفاصيل صغيرة.\nعالم يشبهك.';
export const HOME_HERO_SUBTITLE =
  'مجسمات، هدايا وإكسسوارات مكتب مطبوعة بتقنية 3D. اختار القطعة اللي تحبها، وخلي لركنك المفضل شخصية.';
export const MADE_TO_ORDER_STEPS: HomeContentItem[] = [
  {
    id: 'choose',
    title: 'اختار قطعتك',
    description: 'شوف الصور والمقاسات والخامة والسعر قبل ما تطلب.',
    icon: 'pi pi-search',
  },
  {
    id: 'confirm',
    title: 'نأكد التفاصيل معاك',
    description: 'بنراجع طلبك وموعد التجهيز وتكلفة الشحن لعنوانك.',
    icon: 'pi pi-check-circle',
  },
  {
    id: 'produce',
    title: 'نجهزها لحد بابك',
    description: 'القطع المصنوعة حسب الطلب بتدخل الطباعة بعد التأكيد.',
    icon: 'pi pi-box',
  },
];
export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    id: 'physical',
    question: 'هستلم منتج مطبوع ولا ملف 3D؟',
    answer:
      'المتجر للمنتجات المطبوعة فعليًا. الصور والمواصفات في صفحة كل منتج بتوضح القطعة اللي هتستلمها.',
  },
  {
    id: 'shipping',
    question: 'الأسعار شاملة الشحن؟',
    answer:
      'أسعار المنتجات بالجنيه المصري ومن غير الشحن. تكلفة الشحن وميعاد التسليم بيتحددوا حسب عنوانك داخل مصر قبل تأكيد الطلب.',
  },
  {
    id: 'production',
    question: 'الطلب بياخد وقت قد إيه؟',
    answer:
      'وقت التجهيز حسب المنتج وتفاصيل الطباعة. بنأكد المدة معاك قبل التنفيذ، ووقت الشحن بيكون منفصل عن وقت التجهيز.',
  },
  {
    id: 'custom',
    question: 'ممكن أطبع تصميم عندي؟',
    answer:
      'أكيد، ابعت فكرتك أو رابط التصميم في طلب مخصص. بنراجع إمكانية الطباعة والمقاسات وحق استخدام التصميم، وبعدها بنبعتلك عرض السعر.',
  },
  {
    id: 'finish',
    question: 'إيه طبيعة خامة PLA وPLA+؟',
    answer:
      'خامات مناسبة للمجسمات وقطع الديكور والاستخدام الداخلي. خطوط الطباعة الخفيفة جزء من طبيعتها. ابعد القطعة عن الشمس المباشرة والحرارة العالية، وراجع تعليمات كل منتج.',
  },
];
