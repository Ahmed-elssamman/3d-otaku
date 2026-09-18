import { TestBed } from '@angular/core/testing';
import { CartAdditionStatus } from '../enums/cart-addition-status.enum';
import { ProductMaterial } from '../enums/product-material.enum';
import { Product } from '../models/product.model';
import { CartService } from './cart.service';

describe('cart quantity capacity', () => {
  const product: Product = {
    id: 'capacity-product',
    slug: 'capacity-product',
    name: 'قطعة اختبار',
    category: 'Desk',
    shortDescription: '',
    description: '',
    price: 100,
    image: '',
    gallery: [],
    tags: [],
    material: ProductMaterial.PLA,
    finish: '',
    color: '',
    size: '',
    weight: '',
    printTime: '',
    isFeatured: false,
    isActive: true,
    safetyNote: '',
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => localStorage.clear());

  it('rejects the whole requested quantity without updating the saved product when it exceeds capacity', () => {
    const cart = TestBed.inject(CartService);
    expect(cart.addItem(product, 98)).toBe(CartAdditionStatus.Added);
    const saved = localStorage.getItem('3d_otaku_cart_items');
    expect(cart.addItem({ ...product, price: 120 }, 2)).toBe(CartAdditionStatus.QuantityLimit);
    expect(cart.itemCount()).toBe(98);
    expect(cart.items()[0].product.price).toBe(100);
    expect(cart.remainingCapacity(product.id)).toBe(1);
    expect(localStorage.getItem('3d_otaku_cart_items')).toBe(saved);
  });

  it('accepts exactly the remaining quantity and makes capacity available again after a reduction', () => {
    const cart = TestBed.inject(CartService);
    cart.addItem(product, 98);
    expect(cart.addItem(product, 1)).toBe(CartAdditionStatus.Added);
    expect(cart.itemCount()).toBe(99);
    expect(cart.addItem(product, 1)).toBe(CartAdditionStatus.QuantityLimit);
    expect(cart.itemCount()).toBe(99);
    cart.updateQuantity(product.id, 97);
    expect(cart.remainingCapacity(product.id)).toBe(2);
    expect(cart.addItem(product, 2)).toBe(CartAdditionStatus.Added);
    expect(cart.itemCount()).toBe(99);
  });

  it('preserves an existing saved quantity of 99 and rejects fractional or oversized additions', () => {
    localStorage.setItem('3d_otaku_cart_items', JSON.stringify([{ product, quantity: 99 }]));
    const cart = TestBed.inject(CartService);
    cart.initialize();
    expect(cart.itemCount()).toBe(99);
    expect(cart.remainingCapacity(product.id)).toBe(0);
    expect(cart.addItem(product)).toBe(CartAdditionStatus.QuantityLimit);
    cart.clearCart();
    expect(cart.addItem(product, 0.5)).toBe(CartAdditionStatus.Invalid);
    expect(cart.addItem(product, 100)).toBe(CartAdditionStatus.QuantityLimit);
    expect(cart.items()).toEqual([]);
  });
});
