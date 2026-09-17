export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  stepNumber?: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'choose',
    stepNumber: '١',
    title: 'اختَر القطعة',
    description: 'تصفح المنتجات، واقرأ الوصف والمقاسات والخامة المتاحة في صفحة كل قطعة.',
    icon: 'pi pi-search',
  },
  {
    id: 'details',
    stepNumber: '٢',
    title: 'راجع التفاصيل',
    description:
      'حدد الخيارات المتاحة وأضف القطعة إلى السلة. اسألنا قبل الطلب إذا كانت هناك تفاصيل تحتاج إلى توضيح.',
    icon: 'pi pi-list',
  },
  {
    id: 'order',
    stepNumber: '٣',
    title: 'أرسل طلبك',
    description:
      'أدخل بياناتك وعنوانك داخل مصر. تكلفة الشحن منفصلة عن سعر المنتج وتُؤكّد عند التواصل.',
    icon: 'pi pi-shopping-bag',
  },
  {
    id: 'follow',
    stepNumber: '٤',
    title: 'تابع الطلب',
    description:
      'راجع الطلبات المسجلة بحسابك. وقت التصنيع والتوصيل يعتمد على القطعة وتفاصيل الطلب.',
    icon: 'pi pi-box',
  },
];

export const SERVICE_PRINCIPLES: WorkflowStep[] = [
  {
    id: 'physical',
    title: 'قطع تصل إلى يدك',
    description: 'المعروض للبيع منتجات مطبوعة ثلاثية الأبعاد، وليس ملفات رقمية للتنزيل.',
    icon: 'pi pi-box',
  },
  {
    id: 'material',
    title: 'لكل قطعة تفاصيلها',
    description:
      'الخامة والمقاس وطريقة الاستخدام تختلف حسب المنتج. راجع الوصف، واسأل عن أي معلومة غير مذكورة.',
    icon: 'pi pi-sliders-h',
  },
  {
    id: 'custom',
    title: 'فكرتك تبدأ بسؤال',
    description:
      'يمكنك إرسال مرجع لتصميم خاص. نراجع قابلية طباعته وحقوق استخدامه قبل تأكيد إمكانية تنفيذه وتكلفته.',
    icon: 'pi pi-pencil',
  },
];
