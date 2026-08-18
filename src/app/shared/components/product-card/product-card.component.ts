import { Component, input, inject, computed, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { CurrencyPipe } from '@angular/common';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';
import { formatProductionEstimate, getSalePrice, hasValidDiscount } from '@core/utils/product-display.util';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  private cartService = inject(CartService);
  private router = inject(Router);
  private settingsService = inject(AdminSettingsService);

  product = input.required<Product>();
  imageFailed = signal<boolean>(false);

  displayBadge = computed(() => {
    const badge = this.product().badge;
    return badge && badge !== ProductBadge.NONE ? badge : null;
  });
  hasImage = computed(() => {
    const img = this.product().image;
    return !!(img && typeof img === 'string' && img.trim().length > 0 && !img.includes('placeholder') && !this.imageFailed());
  });

  hasValidDiscount = computed(() => {
    const product = this.product();
    return hasValidDiscount(product.price, product.discountPrice ?? null);
  });
  salePrice = computed(() => getSalePrice(this.product().price, this.product().discountPrice ?? null));
  discountPercentage = computed(() => {
    if (!this.hasValidDiscount() || this.product().price <= 0) {
      return 0;
    }
    return Math.round((1 - this.salePrice() / this.product().price) * 100);
  });
  productionEstimate = computed(() => {
    const product = this.product();
    return formatProductionEstimate(
      product.isMadeToOrder ?? false,
      product.productionTimeMin ?? null,
      product.productionTimeMax ?? null,
      product.productionTimeUnit ?? null
    );
  });

  addToCartAndCheckout(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addItem(this.product(), 1);
    this.router.navigate(['/cart']);
  }

  onImageError(): void {
    this.imageFailed.set(true);
  }
}
