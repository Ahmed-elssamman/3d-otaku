import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';
import { CartItem } from '../models/cart-item.model';

const CART_STORAGE_KEY = '3d_otaku_cart_items';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(this.loadFromStorage());

  readonly items = computed(() => this.itemsSignal());

  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((total, item) => total + ((item.product.price || 0) * item.quantity), 0)
  );

  addItem(product: Product, quantity: number = 1): void {
    const targetId = product.id || product._id;
    const currentItems = [...this.itemsSignal()];
    const index = currentItems.findIndex(i => (i.product.id || i.product._id) === targetId);

    if (index > -1) {
      currentItems[index] = {
        ...currentItems[index],
        quantity: currentItems[index].quantity + quantity
      };
    } else {
      currentItems.push({ product, quantity });
    }

    this.itemsSignal.set(currentItems);
    this.saveToStorage();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const currentItems = this.itemsSignal().map(item => {
      const id = item.product.id || item.product._id;
      if (id === productId) {
        return { ...item, quantity };
      }
      return item;
    });

    this.itemsSignal.set(currentItems);
    this.saveToStorage();
  }

  removeItem(productId: string): void {
    const filtered = this.itemsSignal().filter(item => {
      const id = item.product.id || item.product._id;
      return id !== productId;
    });
    this.itemsSignal.set(filtered);
    this.saveToStorage();
  }

  clearCart(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      // Ignore quota error if any
    }
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
