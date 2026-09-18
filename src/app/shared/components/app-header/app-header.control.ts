export interface NavItem {
  label: string;
  link: string;
  exact: boolean;
}
export const NAV_ITEMS: NavItem[] = [
  { label: 'الرئيسية', link: '/', exact: true },
  { label: 'كل المنتجات', link: '/products', exact: false },
  { label: 'اطبع فكرتك', link: '/contact', exact: false },
  { label: 'عن أوتاكو', link: '/about', exact: false },
];
