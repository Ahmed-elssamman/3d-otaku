import { CurrencyPipe } from '@angular/common';
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminProductService } from '../../services/admin-product.service';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminStatCardComponent } from '../../components/admin-stat-card.component';
import { Product } from '@core/models/product.model';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, AdminStatCardComponent],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss'
})
export class AdminDashboardPageComponent implements OnInit {
  private adminProductService = inject(AdminProductService);
  private adminDashboardService = inject(AdminDashboardService);

  readonly totalProducts = signal<string>('0');
  readonly featuredProducts = signal<string>('0');
  readonly activeCategories = signal<string>('0');
  readonly averagePrice = signal<number>(0);
  readonly ctaCount = signal<string>('0');
  readonly customOrders = signal<string>('0');
  readonly recentProducts = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.adminDashboardService.getStats().subscribe({
      next: (res) => {
        if (res.data) {
          const stats = res.data;
          this.totalProducts.set(stats.totalProducts.toString());
          this.featuredProducts.set(stats.featuredProducts.toString());
          this.activeCategories.set(stats.totalCategories.toString());
          this.averagePrice.set(stats.averagePrice);
          this.ctaCount.set(stats.whatsappClicks.toString());
          this.customOrders.set(stats.totalCustomOrders.toString());
        } else {
          this.fallbackLocalStats();
        }
      },
      error: () => this.fallbackLocalStats()
    });

    this.adminDashboardService.getRecentProducts(5).subscribe({
      next: (res) => {
        if (res.data) {
          this.recentProducts.set(res.data);
        } else {
          this.fallbackLocalRecent();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.fallbackLocalRecent();
        this.isLoading.set(false);
      }
    });
  }

  private fallbackLocalStats(): void {
    this.totalProducts.set(this.adminProductService.totalProducts().toString());
    this.featuredProducts.set(this.adminProductService.featuredProducts().toString());
    this.activeCategories.set(this.adminProductService.categories().length.toString());
    this.averagePrice.set(this.adminProductService.averagePrice());
    this.ctaCount.set(`${this.adminProductService.totalProducts() * 12}`);
    this.customOrders.set(`${Math.max(this.adminProductService.featuredProducts() * 3, 8)}`);
  }

  private fallbackLocalRecent(): void {
    this.recentProducts.set(
      [...this.adminProductService.products()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
    );
  }
}
