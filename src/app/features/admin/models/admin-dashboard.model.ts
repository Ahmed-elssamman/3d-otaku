import { AdminOperationStatus } from '../enums/admin-operation.enum';

export interface AdminProductCounts {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
}

export interface AdminOrderCounts {
  total: number;
  byStatus: Partial<Record<AdminOperationStatus, number>>;
}

export interface AdminMessageCounts {
  unread: number;
}

export interface AdminDashboardStats {
  products: AdminProductCounts;
  categoriesCount: number;
  averagePrice: number;
  customOrders: AdminOrderCounts;
  productOrders: AdminOrderCounts;
  contactMessages: AdminMessageCounts;
  customersCount: number;
}

export interface AdminDashboardCard {
  label: string;
  value: number;
  hint: string;
  route: string;
  icon: string;
}

export interface AdminDashboardLink {
  label: string;
  description: string;
  route: string;
  icon: string;
}
