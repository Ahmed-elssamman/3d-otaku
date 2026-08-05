export interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-sparkles', route: '/admin/dashboard', exact: true },
  { label: 'Products', icon: 'pi pi-box', route: '/admin/products' },
  { label: 'Add Product', icon: 'pi pi-plus-circle', route: '/admin/products/new' },
  { label: 'Settings', icon: 'pi pi-cog', route: '/admin/settings' },
  { label: 'Back to Website', icon: 'pi pi-arrow-left', route: '/' }
];
