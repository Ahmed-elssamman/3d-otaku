import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { ProductDetailsPageComponent } from './product-details-page.component';

describe('product details cart capacity', () => {
  const product: Product = {
    id: 'details-capacity',
    slug: 'details-capacity',
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

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('retains an over-cap selection for explicit correction instead of partially adding it', () => {
    const cart = TestBed.inject(CartService);
    const page = TestBed.runInInjectionContext(() => new ProductDetailsPageComponent());
    page.product.set(product);
    page.incrementQuantity();
    expect(page.quantity()).toBe(2);
    cart.addItem(product, 98);
    expect(page.canPurchase()).toBe(false);
    expect(page.additionFeedback()).toContain('قلّلها قبل الإضافة');
    page.addToCart();
    expect(page.quantity()).toBe(2);
    expect(cart.itemCount()).toBe(98);
    expect(page.addedToCart()).toBe(false);
    page.decrementQuantity();
    expect(page.canPurchase()).toBe(true);
    page.incrementQuantity();
    expect(page.quantity()).toBe(1);
    page.addToCart();
    expect(cart.itemCount()).toBe(99);
    expect(page.canPurchase()).toBe(false);
    expect(page.additionFeedback()).toContain('الحد الأقصى 99 قطعة');
    cart.clearCart();
    page.incrementQuantity();
    cart.addItem(product, 96);
    page.addToCart();
    expect(cart.itemCount()).toBe(98);
    expect(page.quantity()).toBe(2);
    expect(page.remainingQuantity()).toBe(1);
    expect(page.additionFeedback()).toBe('القطعة اتضافت للسلة');
    expect(page.canPurchase()).toBe(false);
    page.decrementQuantity();
    expect(page.additionFeedback()).toBe('');
    expect(page.canPurchase()).toBe(true);
  });
});
