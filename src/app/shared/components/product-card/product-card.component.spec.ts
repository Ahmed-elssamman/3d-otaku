import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { ProductCardComponent } from './product-card.component';

describe('product card cart capacity', () => {
  const product: Product = {
    id: 'card-capacity',
    slug: 'card-capacity',
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
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('announces the limit and disables adding at 99, then reacts to a cart reduction', async () => {
    const cart = TestBed.inject(CartService);
    cart.addItem(product, 99);
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.add-button');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('الحد الأقصى 99 قطعة');
    expect(fixture.nativeElement.textContent).not.toContain('اتضافت للسلة');
    fixture.componentInstance.addToCart();
    expect(cart.itemCount()).toBe(99);
    expect(fixture.componentInstance.added()).toBe(false);
    cart.updateQuantity(product.id, 98);
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    button.click();
    await fixture.whenStable();
    expect(cart.itemCount()).toBe(99);
    expect(button.disabled).toBe(true);
  });
});
