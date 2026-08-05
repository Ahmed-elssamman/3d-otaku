import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { API_ENDPOINTS } from '@core/api/api-endpoints';
import { ApiResponse } from '@core/models/api-response.model';
import { Order, CreateOrderPayload } from '../models/order.model';
import { environment } from '../../../environments/environment';

const ORDERS_STORAGE_KEY = '3d_otaku_user_orders';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly api = inject(ApiService);
  private readonly ordersSignal = signal<Order[]>(this.loadFromStorage());

  readonly orders = computed(() => this.ordersSignal());

  createOrder(payload: CreateOrderPayload): Observable<ApiResponse<Order>> {
    const generatedOrderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const mockOrder: Order = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9),
      orderNumber: generatedOrderNumber,
      items: payload.items,
      customer: payload.customer,
      subtotal: payload.subtotal,
      deliveryFee: payload.deliveryFee,
      totalAmount: payload.totalAmount,
      status: 'pending',
      estimatedDeliveryDays: payload.deliveryDays,
      createdAt: new Date().toISOString(),
      whatsappMessageSent: true
    };

    if (environment.useMockApi) {
      this.saveLocalOrder(mockOrder);
      return of({
        success: true,
        message: 'Order created successfully.',
        data: mockOrder
      });
    }

    return this.api.post<Order>(API_ENDPOINTS.orders.create, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.saveLocalOrder(res.data);
        } else {
          this.saveLocalOrder(mockOrder);
        }
      }),
      catchError(() => {
        // Fallback to local storage on API error
        this.saveLocalOrder(mockOrder);
        return of({
          success: true,
          message: 'Order created locally.',
          data: mockOrder
        });
      })
    );
  }

  getOrders(): Observable<ApiResponse<Order[]>> {
    if (environment.useMockApi) {
      return of({
        success: true,
        message: 'Orders loaded.',
        data: this.ordersSignal()
      });
    }

    return this.api.get<Order[]>(API_ENDPOINTS.orders.list).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.ordersSignal.set(res.data);
          this.saveToStorage();
        }
      }),
      catchError(() =>
        of({
          success: true,
          message: 'Local orders loaded.',
          data: this.ordersSignal()
        })
      )
    );
  }

  trackOrder(orderNumber: string): Observable<ApiResponse<Order | null>> {
    const found = this.ordersSignal().find(
      o => o.orderNumber.toUpperCase() === orderNumber.trim().toUpperCase() ||
           o.id === orderNumber || o._id === orderNumber
    );

    if (environment.useMockApi) {
      return of({
        success: !!found,
        message: found ? 'Order details retrieved.' : 'Order not found.',
        data: found || null
      });
    }

    return this.api.get<Order>(API_ENDPOINTS.orders.track(orderNumber)).pipe(
      catchError(() =>
        of({
          success: !!found,
          message: found ? 'Local order found.' : 'Order not found.',
          data: found || null
        })
      )
    );
  }

  private saveLocalOrder(order: Order): void {
    const updated = [order, ...this.ordersSignal()];
    this.ordersSignal.set(updated);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.ordersSignal()));
    } catch {
      // Ignore quota errors
    }
  }

  private loadFromStorage(): Order[] {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
