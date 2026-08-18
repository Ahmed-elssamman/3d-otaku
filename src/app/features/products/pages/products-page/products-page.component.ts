import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { ApiMeta, ApiErrorResponse } from '@core/models/api-response.model';
import { Product } from '@core/models/product.model';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { SORT_OPTIONS, SortOption } from '../../products.control';
import { ProductSort } from '../../enums/product-sort.enum';
import { ProductQuery } from '../../models/product-query.model';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [ProductCardComponent, EmptyStateComponent, OtakuLoaderComponent],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss'
})
export class ProductsPageComponent implements OnInit {
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);

  sortOptions: SortOption[] = SORT_OPTIONS;
  categoryOptions = signal<string[]>([ProductCategory.ALL]);
  searchTerm = signal<string>('');
  selectedCategory = signal<string>(ProductCategory.ALL);
  selectedSort = signal<ProductSort>(ProductSort.FEATURED);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  isUnauthorized = signal<boolean>(false);
  productsList = signal<Product[]>([]);
  meta = signal<ApiMeta>({
    page: 1,
    limit: 12,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  hasActiveFilters = computed(() => Boolean(this.searchTerm().trim()) || this.selectedCategory() !== ProductCategory.ALL);
  isGenuinelyEmpty = computed(() => !this.hasActiveFilters() && this.meta().totalItems === 0);
  hasNoFilterResults = computed(() => this.hasActiveFilters() && this.productsList().length === 0);

  ngOnInit(): void {
    this.seoService.setTitle('Browse models and prices');
    this.seoService.setMetaDescription('Browse available 3D printed models, compare product details, and review prices before ordering.');
    this.analytics.track(AnalyticsEventName.VIEW_PRODUCT_LIST);
    this.loadCategories();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const category = typeof params['category'] === 'string' ? params['category'] : ProductCategory.ALL;
        this.selectedCategory.set(category);
        this.loadProducts(1);
      });
  }

  loadProducts(page: number = this.meta().page): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.isUnauthorized.set(false);

    const query: ProductQuery = {
      page,
      limit: this.meta().limit,
      sort: this.selectedSort()
    };
    if (this.searchTerm().trim()) {
      query.search = this.searchTerm().trim();
    }
    if (this.selectedCategory() !== ProductCategory.ALL) {
      query.category = this.selectedCategory();
    }

    this.productService.getProducts(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.productsList.set(response.data ?? []);
        this.meta.set(response.meta);
        this.isLoading.set(false);
      },
      error: (error: ApiErrorResponse) => {
        this.productsList.set([]);
        this.isUnauthorized.set(error.statusCode === 401 || error.statusCode === 403);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.analytics.track(AnalyticsEventName.SEARCH_PRODUCTS, { has_query: Boolean(this.searchTerm().trim()) });
    this.loadProducts(1);
  }

  onCategorySelect(category: string): void {
    this.selectedCategory.set(category);
    this.analytics.track(AnalyticsEventName.FILTER_PRODUCTS, { category });
    this.loadProducts(1);
  }

  onSortSelect(event: Event): void {
    this.selectedSort.set((event.target as HTMLSelectElement).value as ProductSort);
    this.loadProducts(1);
  }

  goToPreviousPage(): void {
    if (this.meta().hasPreviousPage) {
      this.loadProducts(this.meta().page - 1);
    }
  }

  goToNextPage(): void {
    if (this.meta().hasNextPage) {
      this.loadProducts(this.meta().page + 1);
    }
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set(ProductCategory.ALL);
    this.selectedSort.set(ProductSort.FEATURED);
    this.loadProducts(1);
  }

  private loadCategories(): void {
    this.productService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const activeCategories = (response.data ?? [])
            .filter(category => category.productsCount > 0)
            .map(category => category.name);
          this.categoryOptions.set([ProductCategory.ALL, ...activeCategories]);
        },
        error: () => this.categoryOptions.set([ProductCategory.ALL])
      });
  }
}
