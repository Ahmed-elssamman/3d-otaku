import { TestBed } from '@angular/core/testing';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { Product } from '@core/models/product.model';
import { AdminProductTableComponent } from './admin-product-table.component';

describe('Admin server-paginated product table', () => {
  it('renders all products on page two without slicing the server page again', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductTableComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminProductTableComponent);
    const secondPage: Product[] = Array.from({ length: 10 }, (_, index) => ({
      id: `product-${index + 11}`,
      slug: `product-${index + 11}`,
      name: `Product ${index + 11}`,
      category: ProductCategory.COLLECTIBLES,
      shortDescription: '',
      description: '',
      price: 100,
      image: '',
      gallery: [],
      tags: [],
      material: ProductMaterial.PLA,
      finish: 'Matte',
      color: 'Green',
      size: '10 cm',
      weight: '30 g',
      printTime: '2 hours',
      isFeatured: false,
      isActive: true,
      safetyNote: '',
      createdAt: '2026-09-16',
      updatedAt: '2026-09-16',
    }));
    fixture.componentRef.setInput('products', secondPage);
    fixture.componentRef.setInput('totalRecords', 23);
    fixture.componentRef.setInput('first', 10);
    fixture.componentRef.setInput('rows', 10);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(element.textContent).toContain('Product 11');
    expect(element.textContent).toContain('Product 20');
    expect(element.textContent).not.toContain('Product 21');
  });
});
