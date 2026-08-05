import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '@core/services/order.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SeoService } from '@core/services/seo.service';
import { Order, OrderStatus } from '@core/models/order.model';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.scss'
})
export class OrdersPageComponent implements OnInit {
  readonly orderService = inject(OrderService);
  readonly whatsAppService = inject(WhatsAppService);
  private readonly seoService = inject(SeoService);

  readonly orders = this.orderService.orders;
  readonly isLoading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');

  readonly filteredOrders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.orders();
    if (!q) return list;
    return list.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.fullName.toLowerCase().includes(q) ||
      o.customer.phone.includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.seoService.setTitle('My Orders & Tracking - 3D OTAKU');
    this.seoService.setMetaDescription('Track your 3D anime model print orders, shipping status, and order history.');

    this.orderService.getOrders().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  getStatusBadgeClass(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      case 'processing':
        return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
      case 'printed':
        return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
      case 'shipped':
        return 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300';
      case 'delivered':
        return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      case 'cancelled':
        return 'bg-red-500/20 border-red-500/40 text-red-300';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  }

  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pending': return 'Pending Confirmation';
      case 'processing': return 'Processing & Printing';
      case 'printed': return '3D Print Completed';
      case 'shipped': return 'Shipped / Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getWhatsAppLink(order: Order): string {
    const text = `Hello 3D Otaku, I am following up on Order ID #${order.orderNumber}.\nStatus: ${order.status.toUpperCase()}`;
    return `https://wa.me/201112961724?text=${encodeURIComponent(text)}`;
  }
}
