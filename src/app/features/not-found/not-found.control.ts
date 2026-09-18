export interface NotFoundText {
  code: string;
  title: string;
  subtitle: string;
  backHomeText: string;
  browseCatalogText: string;
}

export const NOT_FOUND_TEXT: NotFoundText = {
  code: '404',
  title: 'الصفحة غير موجودة.',
  subtitle:
    'قد يكون الرابط قد تغيّر أو كُتب بشكل غير صحيح. يمكنك العودة للرئيسية أو البحث عن القطعة التي تريدها.',
  backHomeText: 'العودة للرئيسية',
  browseCatalogText: 'تصفح المنتجات',
};
