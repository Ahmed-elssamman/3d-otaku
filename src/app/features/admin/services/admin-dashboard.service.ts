import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { ApiResponse } from '@core/models/api-response.model';
import { AdminDashboardApiStats, AdminDashboardStats } from '../models/admin-dashboard.model';
import { Product } from '@core/models/product.model';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { AdminProductService } from './admin-product.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private api = inject(ApiService);
  private adminProductService = inject(AdminProductService);

  getStats(): Observable<ApiResponse<AdminDashboardStats>> {
    if (environment.useMockApi) {
      const products = this.adminProductService.products();
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.isActive).length;
      const inactiveProducts = totalProducts - activeProducts;
      const featuredProducts = products.filter(p => p.isFeatured).length;
      const totalCategories = new Set(products.map(p => p.category)).size;
      const averagePrice = totalProducts ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0;

      const mockStats: AdminDashboardStats = {
        totalProducts,
        activeProducts,
        inactiveProducts,
        featuredProducts,
        totalCategories,
        averagePrice: Math.round(averagePrice),
        totalCustomOrders: 0,
        pendingCustomOrders: 0,
        whatsappClicks: 0
      };

      return of({
        success: true,
        message: 'Dashboard stats fetched successfully.',
        data: mockStats
      });
    }

    return this.api.get<AdminDashboardApiStats>(API_ENDPOINTS.admin.dashboard.stats).pipe(
      map(res => {
        const d = res.data;
        const mappedStats: AdminDashboardStats = {
            totalProducts: d.products?.total ?? d.totalProducts ?? 0,
            activeProducts: d.products?.active ?? d.activeProducts ?? 0,
            inactiveProducts: d.products?.inactive ?? d.inactiveProducts ?? 0,
            featuredProducts: d.featuredProducts ?? 0,
            totalCategories: d.categoriesCount ?? d.totalCategories ?? 0,
            averagePrice: Math.round(d.averagePrice ?? 0),
            totalCustomOrders: d.customOrders?.total ?? d.totalCustomOrders ?? 0,
            pendingCustomOrders: d.customOrders?.byStatus?.pending ?? d.pendingCustomOrders ?? 0,
            whatsappClicks: d.whatsappClicks ?? 0
          };
        return {
          ...res,
          data: mappedStats
        };
      })
    );
  }

  getRecentProducts(limit: number = 5): Observable<ApiResponse<Product[]>> {
    if (environment.useMockApi) {
      const recent = this.adminProductService.products().slice(0, limit);
      return of({
        success: true,
        message: 'Recent products fetched successfully.',
        data: recent
      });
    }

    return this.api.get<Product[]>(API_ENDPOINTS.admin.dashboard.recentProducts, { limit });
  }
}
