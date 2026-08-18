import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiErrorResponse, ApiMeta } from '@core/models/api-response.model';
import { Order } from '@core/models/order.model';
import { OrderService } from '@core/services/order.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { ORDER_LOADING_SKELETONS, ORDER_STATUS_PRESENTATIONS, OrderStatusPresentation, UNRECOGNIZED_ORDER_STATUS } from '../../orders.control';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';

export interface OrderListViewItem {
  order: Order;
  status: OrderStatusPresentation;
  supportUrl: string;
  itemCount: number;
}

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent implements OnInit {
  private orderService = inject(OrderService);
  private whatsAppService = inject(WhatsAppService);
  private seoService = inject(SeoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);

  orders = signal<Order[]>([]);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  isUnauthorized = signal<boolean>(false);
  selectedOrderId = signal<string>('');
  meta = signal<ApiMeta>({ page: 1, limit: 10, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  isArabic = document.documentElement.lang.toLowerCase().startsWith('ar');
  loadingSkeletons = ORDER_LOADING_SKELETONS;
  orderViews = computed<OrderListViewItem[]>(() => this.orders().map(order => ({
    order,
    status: ORDER_STATUS_PRESENTATIONS[order.status] ?? UNRECOGNIZED_ORDER_STATUS,
    supportUrl: this.whatsAppService.getOrderSupportUrl(order),
    itemCount: order.items.reduce((total, item) => total + item.quantity, 0)
  })));
  selectedOrder = computed(() => this.orders().find(order => order.id === this.selectedOrderId()) ?? null);
  selectedStatus = computed(() => {
    const order = this.selectedOrder();
    return order ? ORDER_STATUS_PRESENTATIONS[order.status] ?? UNRECOGNIZED_ORDER_STATUS : null;
  });

  ngOnInit(): void {
    this.seoService.setTitle('My orders');
    this.seoService.setMetaDescription('Review your orders, current status, totals, and available next actions.');
    this.analytics.track(AnalyticsEventName.VIEW_ORDERS);
    const pageParam = Number(this.route.snapshot.queryParamMap.get('page'));
    this.loadOrders(Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1);
  }

  loadOrders(page: number = this.meta().page): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.isUnauthorized.set(false);
    this.orderService.getOrders(page, this.meta().limit).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.orders.set(response.data ?? []);
        this.meta.set(response.meta);
        this.isLoading.set(false);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { page }, replaceUrl: true });
      },
      error: (error: ApiErrorResponse) => {
        this.isUnauthorized.set(error.statusCode === 401 || error.statusCode === 403);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  showOrderDetails(orderId: string): void {
    this.selectedOrderId.set(orderId);
    this.analytics.track(AnalyticsEventName.VIEW_ORDER_DETAILS);
  }

  closeOrderDetails(): void {
    this.selectedOrderId.set('');
  }

  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }

  previousPage(): void {
    if (this.meta().hasPreviousPage) {
      this.loadOrders(this.meta().page - 1);
    }
  }

  nextPage(): void {
    if (this.meta().hasNextPage) {
      this.loadOrders(this.meta().page + 1);
    }
  }
}
