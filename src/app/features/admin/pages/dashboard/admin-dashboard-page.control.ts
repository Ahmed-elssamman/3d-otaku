import {
  AdminDashboardCard,
  AdminDashboardLink,
  AdminDashboardStats,
} from '../../models/admin-dashboard.model';

export const ADMIN_DASHBOARD_LINKS: AdminDashboardLink[] = [
  {
    label: 'طلبات المتجر',
    description: 'تفاصيل المنتجات والتوصيل ومراحل التجهيز.',
    route: '/admin/orders',
    icon: 'pi pi-shopping-bag',
  },
  {
    label: 'طلبات التصميم الخاص',
    description: 'الأفكار والخامات والمقاسات ومتابعة التنفيذ.',
    route: '/admin/custom-orders',
    icon: 'pi pi-pencil',
  },
  {
    label: 'رسائل العملاء',
    description: 'استفسارات التواصل وحالة قراءتها.',
    route: '/admin/contact-messages',
    icon: 'pi pi-inbox',
  },
  {
    label: 'المنتجات',
    description: 'إدارة الأسعار والصور وتوافر المنتجات.',
    route: '/admin/products',
    icon: 'pi pi-box',
  },
  {
    label: 'إعدادات المتجر',
    description: 'بيانات المتجر والتواصل وسياسة التوصيل.',
    route: '/admin/settings',
    icon: 'pi pi-cog',
  },
];

export function buildDashboardCards(stats: AdminDashboardStats): AdminDashboardCard[] {
  return [
    {
      label: 'طلبات المتجر',
      value: stats.productOrders.total,
      hint: `${stats.productOrders.byStatus.pending || 0} طلب بانتظار المراجعة`,
      route: '/admin/orders',
      icon: 'pi pi-shopping-bag',
    },
    {
      label: 'طلبات التصميم الخاص',
      value: stats.customOrders.total,
      hint: `${stats.customOrders.byStatus.pending || 0} طلب بانتظار المراجعة`,
      route: '/admin/custom-orders',
      icon: 'pi pi-pencil',
    },
    {
      label: 'رسائل غير مقروءة',
      value: stats.contactMessages.unread,
      hint: 'تحتاج إلى مراجعة من الإدارة',
      route: '/admin/contact-messages',
      icon: 'pi pi-inbox',
    },
    {
      label: 'المنتجات المتاحة للإدارة',
      value: stats.products.total,
      hint: `${stats.products.active} منشور · ${stats.products.inactive} غير منشور`,
      route: '/admin/products',
      icon: 'pi pi-box',
    },
  ];
}
