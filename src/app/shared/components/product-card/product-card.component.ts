import { ChangeDetectionStrategy, Component, input, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { getSalePrice, hasValidDiscount } from '@core/utils/product-display.util';
import {
  formatProductCardSize,
  formatProductSpecValue,
} from '@core/utils/product-spec-display.util';
import { ProductSpecField } from '@core/enums/product-spec-field.enum';
import { CATEGORY_PRESENTATION, PRODUCT_BADGE_LABELS } from './product-card.control';
import { getProductImage } from '@core/utils/product-image.util';
import { ProductImageKind } from '@core/enums/product-image-kind.enum';
import { CartAdditionStatus } from '@core/enums/cart-addition-status.enum';
import { CART_ADDITION_TEXT } from '@core/constants/cart.constants';
import { MAX_CART_QUANTITY } from '@core/constants/order.constants';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  private cartService = inject(CartService);
  product = input.required<Product>();
  priority = input(false);
  imageLoading = computed(() => (this.priority() ? 'eager' : 'lazy'));
  imagePriority = computed(() => (this.priority() ? 'high' : 'auto'));
  failedImages = signal<string[]>([]);
  image = computed(() =>
    getProductImage(
      this.product(),
      this.product().image,
      ProductImageKind.CARD,
      this.failedImages(),
    ),
  );
  additionStatus = signal<CartAdditionStatus | null>(null);
  added = computed(() => this.additionStatus() === CartAdditionStatus.Added);
  remainingQuantity = computed(() =>
    this.cartService.remainingCapacity(this.product().id || this.product()._id || ''),
  );
  hasCartItems = computed(() => this.remainingQuantity() < MAX_CART_QUANTITY);
  productLink = computed(() => ['/products', this.product().slug]);
  imageAlt = computed(() => this.product().imageAlt || this.product().name);
  hasImage = computed(
    () =>
      Boolean(this.product().image?.trim()) && !this.failedImages().includes(this.product().image),
  );
  badgeLabel = computed(
    () => PRODUCT_BADGE_LABELS.find((badge) => badge.value === this.product().badge)?.label ?? '',
  );
  categoryLabel = computed(
    () =>
      CATEGORY_PRESENTATION.find((category) => category.value === this.product().category)?.label ??
      this.product().category,
  );
  hasDiscount = computed(() =>
    hasValidDiscount(this.product().price, this.product().discountPrice ?? null),
  );
  salePrice = computed(() =>
    getSalePrice(this.product().price, this.product().discountPrice ?? null),
  );
  cartLabel = computed(() => {
    if (this.remainingQuantity() === 0) return CART_ADDITION_TEXT.limitLabel;
    return this.added() ? CART_ADDITION_TEXT.addAnother : CART_ADDITION_TEXT.add;
  });
  statusLabel = computed(() => {
    if (this.remainingQuantity() === 0) return CART_ADDITION_TEXT.limitMessage;
    if (this.additionStatus() === CartAdditionStatus.Invalid) return CART_ADDITION_TEXT.invalid;
    if (this.additionStatus() === CartAdditionStatus.QuantityLimit)
      return CART_ADDITION_TEXT.quantityLimit;
    return this.added() ? CART_ADDITION_TEXT.added : '';
  });
  materialLabel = computed(() =>
    formatProductSpecValue(ProductSpecField.MATERIAL, this.product().material ?? ''),
  );
  sizeLabel = computed(() => formatProductCardSize(this.product().size ?? ''));
  canPurchase = computed(
    () =>
      this.product().isActive &&
      Number.isFinite(this.salePrice()) &&
      this.salePrice() > 0 &&
      this.remainingQuantity() > 0,
  );

  addToCart(): void {
    if (!this.canPurchase()) return;
    this.additionStatus.set(this.cartService.addItem(this.product(), 1));
  }

  onImageError(): void {
    this.failedImages.update((images) => [...images, this.image().url]);
  }
}
