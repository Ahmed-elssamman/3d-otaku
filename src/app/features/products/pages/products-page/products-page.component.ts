import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { SORT_OPTIONS, CATEGORY_OPTIONS, SortOption } from '../../products.control';
import { ProductCategory } from '@core/enums/product-category.enum';
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
  readonly maxPriceFilter = signal<number>(150);
  readonly isLoading = signal<boolean>(false);

  readonly allProducts = this.productService.allProducts;

  readonly filteredProducts = computed(() => {
    let list = this.allProducts();
    const query = this.searchTerm().trim().toLowerCase();
    const cat = this.selectedCategory();
    const maxP = this.maxPriceFilter();
    const sort = this.selectedSort();

    if (query) {
      list = list.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.tags.some(t => t.toLowerCase().includes(query)));
    }

    if (cat && cat !== ProductCategory.ALL) {
      list = list.filter(p => p.category === cat);
    }

    list = list.filter(p => p.price <= maxP);

    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      return b.rating - a.rating;
    });
  });

  ngOnInit(): void {
    this.seoService.setTitle('3D Anime Products & Cosplay Props Catalog');
    this.seoService.setMetaDescription('Browse 3D Otaku full catalog of 3D printed anime swords, daggers, cosplay masks, kunai, and desk figurines.');

    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  onCategorySelect(category: string): void {
    this.selectedCategory.set(category);
  }

  onSortSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSort.set(select.value as 'price-asc' | 'price-desc' | 'rating-desc' | 'name-asc');
  }

  onPriceChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.maxPriceFilter.set(Number(input.value));
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set(ProductCategory.ALL);
    this.selectedSort.set('rating-desc');
    this.maxPriceFilter.set(150);
  }
}
