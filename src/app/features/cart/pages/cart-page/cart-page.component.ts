import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CustomerDeliveryInfo } from '@core/models/cart-item.model';
import { CreateOrderPayload } from '@core/models/order.model';
import { CartService } from '@core/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import { AuthService } from '@core/services/auth.service';

export interface CartViewItem {
  id: string;
  item: CartItem;
  unitPrice: number;
  lineTotal: number;
}

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss'
})
export class CartPageComponent implements OnInit {
  private whatsAppService = inject(WhatsAppService);
  private orderService = inject(OrderService);
  private adminSettingsService = inject(AdminSettingsService);
  private seoService = inject(SeoService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private analytics = inject(AnalyticsService);
  private authService = inject(AuthService);

  cartService = inject(CartService);
  isSubmittingOrder = signal<boolean>(false);
  submitError = signal<string>('');
  items = this.cartService.items;
  itemCount = this.cartService.itemCount;
  subtotal = this.cartService.subtotal;
  settings = this.adminSettingsService.settings;
  currencyCode = computed(() => this.settings().defaultCurrency?.trim() || '');
  deliveryFee = computed(() => {
    const fee = this.settings().deliveryFee;
    return typeof fee === 'number' && fee >= 0 ? fee : null;
  });
  totalEstimate = computed(() => this.subtotal() + (this.deliveryFee() ?? 0));
  phoneUrl = computed(() => this.settings().phone ? 'tel:' + this.settings().phone.replace(/[^0-9+]/g, '') : '');
  whatsappSupportUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  itemViews = computed<CartViewItem[]>(() => this.items().map(item => {
    const discount = item.product.discountPrice;
    const unitPrice = typeof discount === 'number' && discount >= 0 && discount < item.product.price ? discount : item.product.price;
    return { id: item.product.id || item.product._id || item.product.slug, item, unitPrice, lineTotal: unitPrice * item.quantity };
  }));

  deliveryForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    whatsappNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s-]{8,20}$/)]],
    email: ['', [Validators.email]],
    city: ['', [Validators.required]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.seoService.setTitle('Cart and order details');
    this.seoService.setMetaDescription('Review selected products and submit order details for confirmation.');
    this.analytics.track(AnalyticsEventName.VIEW_CART, { item_count: this.itemCount() });
  }

  incrementQuantity(productId: string, currentQuantity: number): void {
    this.cartService.updateQuantity(productId, Math.min(currentQuantity + 1, 99));
  }

  decrementQuantity(productId: string, currentQuantity: number): void {
    this.cartService.updateQuantity(productId, currentQuantity - 1);
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
    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    this.isSubmittingOrder.set(true);
    this.analytics.track(AnalyticsEventName.BEGIN_CHECKOUT, { item_count: this.itemCount() });
    this.submitError.set('');
    const form = this.deliveryForm.getRawValue();
    const customer: CustomerDeliveryInfo = {
      fullName: form.fullName,
      phone: form.whatsappNumber,
      whatsappNumber: form.whatsappNumber,
      city: form.city,
      address: form.address,
      ...(form.email ? { email: form.email } : {}),
      ...(form.notes ? { notes: form.notes } : {})
    };
    const payload: CreateOrderPayload = {
      items: this.itemViews().map(view => ({ productId: view.id, quantity: view.item.quantity })),
      customer,
      subtotal: this.subtotal(),
      ...(this.deliveryFee() !== null ? { deliveryFee: Number(this.deliveryFee()), totalAmount: this.totalEstimate() } : {}),
      ...(this.settings().deliveryDays?.trim() ? { deliveryDays: this.settings().deliveryDays } : {}),
      ...(this.currencyCode() ? { currency: this.currencyCode() } : {})
    };

    this.orderService.createOrder(payload).subscribe({
      next: response => {
        this.isSubmittingOrder.set(false);
        this.analytics.track(AnalyticsEventName.ORDER_CREATED, { item_count: this.itemCount() });
        const continuationUrl = this.whatsAppService.getCheckoutContinuationUrl(response.data.orderNumber);
        if (continuationUrl) {
          window.open(continuationUrl, '_blank', 'noopener,noreferrer');
        }
        this.cartService.clearCart();
        void this.router.navigate(['/orders']);
      },
      error: () => {
        this.isSubmittingOrder.set(false);
        this.submitError.set('The order was not created. Your cart is unchanged—please check your connection and try again.');
      }
    });
  }
}
