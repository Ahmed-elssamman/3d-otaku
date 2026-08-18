export interface AdminDashboardStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  totalCategories: number;
  averagePrice: number;
  totalCustomOrders: number;
  pendingCustomOrders: number;
  whatsappClicks: number;
}

export interface AdminDashboardApiStats {
  products?: { total?: number; active?: number; inactive?: number };
  totalProducts?: number;
  activeProducts?: number;
  inactiveProducts?: number;
  featuredProducts?: number;
  categoriesCount?: number;
  totalCategories?: number;
  averagePrice?: number;
  customOrders?: { total?: number; byStatus?: { pending?: number } };
  totalCustomOrders?: number;
  pendingCustomOrders?: number;
  whatsappClicks?: number;
}
