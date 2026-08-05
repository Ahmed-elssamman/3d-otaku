import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService } from '@core/services/cart.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { OrderService } from '@core/services/order.service';
import { AdminSettingsService } from '../../../../features/admin/services/admin-settings.service';
import { SeoService } from '@core/services/seo.service';
import { CartItem, CustomerDeliveryInfo } from '@core/models/cart-item.model';
import { CreateOrderPayload, OrderItem } from '@core/models/order.model';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss'
})
export class CartPageComponent implements OnInit {
  readonly cartService = inject(CartService);
  readonly whatsAppService = inject(WhatsAppService);
  readonly orderService = inject(OrderService);
  readonly adminSettingsService = inject(AdminSettingsService);
  private readonly seoService = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly isSubmittingOrder = signal<boolean>(false);
  readonly items = this.cartService.items;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;

  readonly settings = computed(() => this.adminSettingsService.settings());

  readonly deliveryFee = computed(() => {
    const s = this.settings();
    return typeof s.deliveryFee === 'number' ? s.deliveryFee : 60;
  });

  readonly deliveryDays = computed(() => {
    const s = this.settings();
    return s.deliveryDays || '3 - 5 Business Days';
  });

  readonly deliveryInfoNote = computed(() => {
    const s = this.settings();
    return s.deliveryInfoNote || 'Delivery available nationwide. Order printing starts upon WhatsApp confirmation.';
  });

  readonly totalPrice = computed(() => this.subtotal() + this.deliveryFee());

  deliveryForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    secondaryPhone: ['', [Validators.pattern(/^[0-9]{10,15}$/)]],
    governorate: ['', [Validators.required]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.seoService.setTitle('Shopping Cart & WhatsApp Checkout - 3D OTAKU');
    this.seoService.setMetaDescription('Review your selected 3D anime models and complete your order via WhatsApp.');
    this.adminSettingsService.getPublicSettings().subscribe();
  }

  getProductId(item: CartItem): string {
    return item.product.id || item.product._id || item.product.slug || '';
  }

  incrementQuantity(productId: string, currentQty: number): void {
    this.cartService.updateQuantity(productId, currentQty + 1);
  }

  decrementQuantity(productId: string, currentQty: number): void {
    this.cartService.updateQuantity(productId, currentQty - 1);
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  submitOrderToWhatsApp(): void {
    if (this.items().length === 0 || this.isSubmittingOrder()) {
      return;
    }

    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    this.isSubmittingOrder.set(true);
    const customerInfo = this.deliveryForm.getRawValue() as CustomerDeliveryInfo;

    const orderItems: OrderItem[] = this.items().map(item => ({
      productId: item.product.id || item.product._id || item.product.slug || 'N/A',
      productName: item.product.name,
      productImage: item.product.image,
      quantity: item.quantity,
      unitPrice: item.product.price || 0,
      lineTotal: (item.product.price || 0) * item.quantity
    }));

    const payload: CreateOrderPayload = {
      items: orderItems,
      customer: customerInfo,
      subtotal: this.subtotal(),
      deliveryFee: this.deliveryFee(),
      totalAmount: this.totalPrice(),
      deliveryDays: this.deliveryDays()
    };

    const currentCartItems = [...this.items()];

    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        this.isSubmittingOrder.set(false);
        const orderNumber = res.data?.orderNumber || ('ORD-' + Math.floor(100000 + Math.random() * 900000));

        const whatsappUrl = this.whatsAppService.getCartCheckoutUrl(
          currentCartItems,
          customerInfo,
          payload.subtotal,
          payload.deliveryFee,
          payload.totalAmount,
          payload.deliveryDays,
          orderNumber
        );

        // 1. Open WhatsApp
        window.open(whatsappUrl, '_blank');

        // 2. Clear Cart Items
        this.cartService.clearCart();

        // 3. Redirect user to Orders Page
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.isSubmittingOrder.set(false);
        const fallbackOrderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

        const whatsappUrl = this.whatsAppService.getCartCheckoutUrl(
          currentCartItems,
          customerInfo,
          payload.subtotal,
          payload.deliveryFee,
          payload.totalAmount,
          payload.deliveryDays,
          fallbackOrderNumber
        );

        window.open(whatsappUrl, '_blank');
        this.cartService.clearCart();
        this.router.navigate(['/orders']);
      }
    });
  }
}
