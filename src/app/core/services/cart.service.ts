import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, inject, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';
import { CartItem } from '../models/cart-item.model';
import { MAX_CART_QUANTITY } from '../constants/order.constants';
import { checkoutPiastres } from '../utils/checkout-quote.util';
import { getSalePrice } from '../utils/product-display.util';
import { CartAdditionStatus } from '../enums/cart-addition-status.enum';

const CART_STORAGE_KEY = '3d_otaku_cart_items';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private initialized = false;
  private itemsSignal = signal<CartItem[]>([]);

  constructor() {
    afterNextRender(() => this.initialize());
  }

  initialize(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) return;
    this.initialized = true;
    this.itemsSignal.set(this.loadFromStorage());
  }

  items = computed(() => this.itemsSignal());

  itemCount = computed(() => this.itemsSignal().reduce((total, item) => total + item.quantity, 0));

  subtotal = computed(
    () =>
      this.itemsSignal().reduce((total, item) => {
        const minor = checkoutPiastres(
          getSalePrice(item.product.price, item.product.discountPrice ?? null),
        );
        return total + (minor ?? 0) * item.quantity;
      }, 0) / 100,
  );

  remainingCapacity(productId: string): number {
    const item = this.itemsSignal().find(
      (entry) => (entry.product.id || entry.product._id) === productId,
    );
    return Math.max(0, MAX_CART_QUANTITY - (item?.quantity ?? 0));
  }

  addItem(product: Product, quantity: number = 1): CartAdditionStatus {
    this.initialize();
    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      product.isActive === false ||
      product.deletedAt
    )
      return CartAdditionStatus.Invalid;
    const targetId = product.id || product._id;
    if (
      !targetId ||
      checkoutPiastres(product.price) === null ||
      checkoutPiastres(getSalePrice(product.price, product.discountPrice ?? null)) === null
    )
      return CartAdditionStatus.Invalid;
    if (quantity > this.remainingCapacity(targetId)) {
      return CartAdditionStatus.QuantityLimit;
    }
    const currentItems = [...this.itemsSignal()];
    const index = currentItems.findIndex((i) => (i.product.id || i.product._id) === targetId);

    if (index > -1) {
      currentItems[index] = {
        ...currentItems[index],
        product,
        quantity: currentItems[index].quantity + quantity,
      };
    } else {
      currentItems.push({
        product,
        quantity,
      });
    }

    this.itemsSignal.set(currentItems);
    this.saveToStorage();
    return CartAdditionStatus.Added;
  }

  updateQuantity(productId: string, quantity: number): void {
    this.initialize();
    if (!Number.isFinite(quantity)) return;
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const currentItems = this.itemsSignal().map((item) => {
      const id = item.product.id || item.product._id;
      if (id === productId) {
        return {
          ...item,
          quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(quantity))),
        };
      }
      return item;
    });

    this.itemsSignal.set(currentItems);
    this.saveToStorage();
  }

  removeItem(productId: string): void {
    this.initialize();
    const filtered = this.itemsSignal().filter((item) => {
      const id = item.product.id || item.product._id;
      return id !== productId;
    });
    this.itemsSignal.set(filtered);
    this.saveToStorage();
  }

  clearCart(): void {
    this.initialize();
    this.itemsSignal.set([]);
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      return;
    }
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (item) =>
            item &&
            item.product &&
            typeof item.product.name === 'string' &&
            typeof item.product.slug === 'string' &&
            Boolean(item.product.id || item.product._id) &&
            checkoutPiastres(item.product.price) !== null &&
            checkoutPiastres(
              getSalePrice(item.product.price, item.product.discountPrice ?? null),
            ) !== null &&
            Number.isFinite(item.quantity) &&
            item.quantity > 0,
        )
        .map((item) => ({
          ...item,
          quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(item.quantity))),
        }));
    } catch {
      return [];
    }
  }
}
