export interface NavItem {
  label: string;
  link: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', link: '/', icon: 'pi pi-home' },
  { label: 'Products', link: '/products', icon: 'pi pi-box' },
  { label: 'About Us', link: '/about', icon: 'pi pi-info-circle' },
  { label: 'Custom Order', link: '/contact', icon: 'pi pi-sparkles' }
];
