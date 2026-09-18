import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiErrorResponse, ApiMeta } from '@core/models/api-response.model';
import { Order } from '@core/models/order.model';
import { OrderService } from '@core/services/order.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { OrderPaymentSummaryComponent } from '@shared/components/order-payment-summary/order-payment-summary.component';
import { OrderItemConfigurationComponent } from '@shared/components/order-item-configuration/order-item-configuration.component';
import {
  ORDER_INITIAL_META,
  ORDER_LOADING_SKELETONS,
  ORDER_LOGIN_QUERY_PARAMS,
  ORDER_HISTORY_TEXT,
  ORDER_PAGE_TEXT,
  ORDER_STATUS_PRESENTATIONS,
  OrderHistoryViewItem,
  OrderStatusPresentation,
  UNRECOGNIZED_ORDER_STATUS,
} from '../../orders.control';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import { finalize, of, switchMap } from 'rxjs';
import { orderHistoryViews } from '../../order-history.util';

export interface OrderListViewItem {
  order: Order;
  status: OrderStatusPresentation;
  supportUrl: string;
  itemCount: number;
  expanded: boolean;
  history: OrderHistoryViewItem[];
}

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OrderPaymentSummaryComponent,
    OrderItemConfigurationComponent,
  ],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss',
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
  meta = signal<ApiMeta>({ ...ORDER_INITIAL_META });
  loginQueryParams = ORDER_LOGIN_QUERY_PARAMS;
  loadingSkeletons = ORDER_LOADING_SKELETONS;
  historyText = ORDER_HISTORY_TEXT;
  pageText = ORDER_PAGE_TEXT;
  orderViews = computed<OrderListViewItem[]>(() =>
    this.orders().map((order) => ({
      order,
      status: ORDER_STATUS_PRESENTATIONS[order.status] ?? UNRECOGNIZED_ORDER_STATUS,
      supportUrl: this.whatsAppService.getOrderSupportUrl(
        order,
        (ORDER_STATUS_PRESENTATIONS[order.status] ?? UNRECOGNIZED_ORDER_STATUS).labelAr,
      ),
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      expanded: order.id === this.selectedOrderId(),
      history: orderHistoryViews(order.statusHistory ?? []),
    })),
  );

  ngOnInit(): void {
    this.seoService.setTitle('طلباتي');
    this.seoService.setMetaDescription(
      'تابع طلباتك وحالة التنفيذ والشحن داخل مصر، وراجع تفاصيل كل طلب.',
    );
    this.analytics.track(AnalyticsEventName.VIEW_ORDERS);
    const pageParam = Number(this.route.snapshot.queryParamMap.get('page'));
    this.loadOrders(Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1);
  }

  loadOrders(page: number = this.meta().page): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.isUnauthorized.set(false);
    this.orderService
      .getOrders(page, this.meta().limit)
      .pipe(
        switchMap((response) =>
          page > 1 && response.data.length === 0
            ? this.orderService.getOrders(1, this.meta().limit)
            : of(response),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.orders.set(response.data ?? []);
          this.meta.set(response.meta);
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page: response.meta.page },
            replaceUrl: true,
          });
        },
        error: (error: ApiErrorResponse) => {
          this.isUnauthorized.set(error.statusCode === 401 || error.statusCode === 403);
          this.hasError.set(true);
        },
      });
  }

  showOrderDetails(orderId: string): void {
    this.selectedOrderId.update((current) => (current === orderId ? '' : orderId));
    this.analytics.track(AnalyticsEventName.VIEW_ORDER_DETAILS);
  }

  hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }

  firstPage(): void {
    if (!this.isLoading()) this.loadOrders(1);
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
