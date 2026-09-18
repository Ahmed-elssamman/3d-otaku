import { ProductCategory } from '@core/enums/product-category.enum';

export interface FooterLink {
  label: string;
  url: string;
  query?: { category: ProductCategory };
}
export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}
export interface FooterSocialDefinition {
  id: string;
  label: string;
  icon: string;
}
export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: 'اختار عالمك',
    links: [
      { label: 'كل المنتجات', url: '/products' },
      {
        label: 'إكسسوارات المكتب',
        url: '/products',
        query: { category: ProductCategory.DESK_MODELS },
      },
      {
        label: 'مجسمات ومقتنيات',
        url: '/products',
        query: { category: ProductCategory.COLLECTIBLES },
      },
      { label: 'اطبع فكرتك', url: '/contact' },
    ],
  },
  {
    title: 'نساعدك تطلب',
    links: [
      { label: 'عن 3D Otaku', url: '/about' },
      { label: 'تواصل معانا', url: '/contact' },
      { label: 'طلباتي', url: '/orders' },
      { label: 'سلة التسوق', url: '/cart' },
    ],
  },
];
export const FOOTER_SOCIAL_DEFINITIONS: FooterSocialDefinition[] = [
  { id: 'facebook', label: 'Facebook', icon: 'pi pi-facebook' },
  { id: 'instagram', label: 'Instagram', icon: 'pi pi-instagram' },
  { id: 'tiktok', label: 'TikTok', icon: 'pi pi-tiktok' },
  { id: 'youtube', label: 'YouTube', icon: 'pi pi-youtube' },
];
