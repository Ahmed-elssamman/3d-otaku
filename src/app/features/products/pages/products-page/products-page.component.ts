import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { SORT_OPTIONS, CATEGORY_OPTIONS, SortOption } from '../../products.control';
import { ProductCategory } from '@core/enums/product-category.enum';
import { Product } from '@core/models/product.model';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    FormsModule,
    ProductCardComponent,
    EmptyStateComponent,
    OtakuLoaderComponent
  ],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss'
})
export class ProductsPageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  readonly sortOptions: SortOption[] = SORT_OPTIONS;
  readonly categoryOptions: string[] = CATEGORY_OPTIONS;

  readonly searchTerm = signal<string>('');
  readonly selectedCategory = signal<string>(ProductCategory.ALL);
  readonly selectedSort = signal<'price-asc' | 'price-desc' | 'rating-desc' | 'name-asc'>('rating-desc');
  readonly maxPriceFilter = signal<number>(1500);
  readonly isLoading = signal<boolean>(true);
  readonly productsList = signal<Product[]>([]);

  ngOnInit(): void {
    this.seoService.setTitle('3D Anime Products & Cosplay Props Catalog');
    this.seoService.setMetaDescription('Browse 3D Otaku full catalog of 3D printed anime swords, daggers, cosplay masks, kunai, and desk figurines.');

    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.isLoading.set(true);

    const sortMap: Record<string, 'newest' | 'price_low' | 'price_high' | 'rating'> = {
      'price-asc': 'price_low',
      'price-desc': 'price_high',
      'rating-desc': 'rating',
      'name-asc': 'newest'
    };

    this.productService.getProducts({
      search: this.searchTerm(),
      category: this.selectedCategory() !== ProductCategory.ALL ? this.selectedCategory() : undefined,
      sort: sortMap[this.selectedSort()] || 'rating'
    }).subscribe({
      next: (res) => {
        let items = res.data || [];
        if (this.maxPriceFilter()) {
          items = items.filter(p => p.price <= this.maxPriceFilter());
        }
        this.productsList.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        let list = this.productService.allProducts();
        const query = this.searchTerm().trim().toLowerCase();
        const cat = this.selectedCategory();

        if (query) {
          list = list.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
        }

        if (cat && cat !== ProductCategory.ALL) {
          list = list.filter(p => p.category === cat);
        }

        this.productsList.set(list);
        this.isLoading.set(false);
      }
    });
  }

  get filteredProducts(): Product[] {
    return this.productsList();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.loadProducts();
  }

  onCategorySelect(category: string): void {
    this.selectedCategory.set(category);
    this.loadProducts();
  }

  onSortSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSort.set(select.value as 'price-asc' | 'price-desc' | 'rating-desc' | 'name-asc');
    this.loadProducts();
  }

  onPriceChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.maxPriceFilter.set(Number(input.value));
    this.loadProducts();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set(ProductCategory.ALL);
    this.selectedSort.set('rating-desc');
    this.maxPriceFilter.set(1500);
    this.loadProducts();
  }
}
