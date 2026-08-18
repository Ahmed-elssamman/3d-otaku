import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { CreateOrderPayload, Order, OrderApiRecord } from '../models/order.model';
import { OrderStatus } from '../enums/order-status.enum';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = inject(ApiService);
  private ordersSignal = signal<Order[]>([]);

  orders = computed(() => this.ordersSignal());

  createOrder(payload: CreateOrderPayload): Observable<ApiResponse<Order>> {
    const normalizedPayload: CreateOrderPayload = {
      ...payload,
      currency: environment.defaultCurrency
    };

    if (environment.useMockApi) {
      const now = new Date().toISOString();
      const mockOrder: Order = {
        id: `mock-${Date.now()}`,
        orderNumber: `MOCK-${Date.now()}`,
        items: [],
        customer: normalizedPayload.customer,
        subtotal: normalizedPayload.subtotal ?? 0,
        deliveryFee: normalizedPayload.deliveryFee ?? 0,
        discount: 0,
        total: normalizedPayload.totalAmount ?? normalizedPayload.subtotal ?? 0,
        currency: environment.defaultCurrency,
        status: OrderStatus.PENDING,
        paymentMethod: 'mock',
        estimatedDeliveryDays: normalizedPayload.deliveryDays,
        createdAt: now,
        updatedAt: now
      };
      return of({ success: true, message: 'Mock order created.', data: mockOrder });
    }

    return this.api.post<OrderApiRecord>(API_ENDPOINTS.orders.create, normalizedPayload).pipe(
      map(response => ({ ...response, data: this.normalizeOrder(response.data) })),
      tap(response => this.ordersSignal.update(orders => [response.data, ...orders.filter(order => order.id !== response.data.id)]))
    );
  }

  getOrders(page: number = 1, limit: number = 10): Observable<PaginatedResponse<Order>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Mock orders loaded.',
        data: this.ordersSignal(),
        meta: { page, limit, totalItems: this.ordersSignal().length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      });
    }

    return this.api.getPaginated<OrderApiRecord>(API_ENDPOINTS.orders.list, { page, limit }).pipe(
      map(response => ({ ...response, data: response.data.map(order => this.normalizeOrder(order)) })),
      tap(response => this.ordersSignal.set(response.data))
    );
  }

  trackOrder(orderNumber: string): Observable<ApiResponse<Order>> {
    return this.api.get<OrderApiRecord>(API_ENDPOINTS.orders.track(orderNumber)).pipe(
      map(response => ({ ...response, data: this.normalizeOrder(response.data) }))
    );
  }

  private normalizeOrder(record: OrderApiRecord): Order {
    return {
      id: record.id || record._id || record.orderNumber,
      orderNumber: record.orderNumber,
      items: (record.items ?? []).map(item => ({
        productId: item.productId,
        slug: item.slug,
        name: item.name || item.productName || 'Product',
        image: item.image || item.productImage || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPrice: item.discountPrice ?? null,
        lineTotal: item.lineTotal
      })),
      customer: record.customer,
      subtotal: record.subtotal,
      deliveryFee: record.deliveryFee ?? 0,
      discount: record.discount ?? 0,
      total: record.total ?? record.totalAmount ?? 0,
      currency: environment.defaultCurrency,
      status: record.status,
      paymentMethod: record.paymentMethod?.trim() || '',
      estimatedDeliveryDays: record.estimatedDeliveryDays,
      statusHistory: record.statusHistory,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt || record.createdAt
    };
  }
}
