export interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  matchOptions: AdminNavMatchOptions;
}

export interface AdminNavMatchOptions {
  exact: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: 'نظرة عامة',
    icon: 'pi pi-chart-bar',
    route: '/admin/dashboard',
    matchOptions: { exact: true },
  },
  {
    label: 'طلبات المتجر',
    icon: 'pi pi-shopping-bag',
    route: '/admin/orders',
    matchOptions: { exact: false },
  },
  {
    label: 'طلبات التصميم الخاص',
    icon: 'pi pi-pencil',
    route: '/admin/custom-orders',
    matchOptions: { exact: false },
  },
  {
    label: 'رسائل العملاء',
    icon: 'pi pi-inbox',
    route: '/admin/contact-messages',
    matchOptions: { exact: false },
  },
  { label: 'المنتجات', icon: 'pi pi-box', route: '/admin/products', matchOptions: { exact: true } },
  {
    label: 'إضافة منتج',
    icon: 'pi pi-plus-circle',
    route: '/admin/products/new',
    matchOptions: { exact: false },
  },
  {
    label: 'إعدادات المتجر',
    icon: 'pi pi-cog',
    route: '/admin/settings',
    matchOptions: { exact: false },
  },
  { label: 'زيارة المتجر', icon: 'pi pi-arrow-up-left', route: '/', matchOptions: { exact: true } },
];
