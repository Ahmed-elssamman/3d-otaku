import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, finalize, of, switchMap } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { ApiMeta } from '@core/models/api-response.model';
import { Product } from '@core/models/product.model';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { CATEGORY_PRESENTATION } from '@shared/components/product-card/product-card.control';
import { SORT_OPTIONS, INITIAL_PRODUCT_META } from '../../products.control';
import { ProductSort } from '../../enums/product-sort.enum';
import { ProductQuery } from '../../models/product-query.model';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPageComponent implements OnInit {
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private requests = new Subject<ProductQuery>();
  private searchChanges = new Subject<string>();
  sortOptions = SORT_OPTIONS;
  categoryOptions = signal<string[]>([ProductCategory.ALL]);
  searchTerm = signal('');
  selectedCategory = signal<string>(ProductCategory.ALL);
  selectedSort = signal(ProductSort.FEATURED);
  isLoading = signal(true);
  hasError = signal(false);
  productsList = signal<Product[]>([]);
  meta = signal<ApiMeta>({ ...INITIAL_PRODUCT_META });
  hasActiveFilters = computed(
    () => Boolean(this.searchTerm().trim()) || this.selectedCategory() !== ProductCategory.ALL,
  );
  categoryViews = computed(() =>
    this.categoryOptions().map((value) => ({
      value,
      label: CATEGORY_PRESENTATION.find((category) => category.value === value)?.label ?? value,
      selected: value === this.selectedCategory(),
    })),
  );

  ngOnInit(): void {
    this.seoService.setTitle('تصفح المجسمات والهدايا المطبوعة 3D');
    this.seoService.setMetaDescription(
      'اختار مجسمات وهدايا وإكسسوارات مكتب مطبوعة في مصر. قارن المنتجات والخامات والأسعار بالجنيه المصري.',
    );
    this.requests
      .pipe(
        switchMap((query) => {
          this.isLoading.set(true);
          this.hasError.set(false);
          return this.productService.getProducts(query).pipe(
            catchError(() => {
              this.hasError.set(true);
              this.seoService.setResponseStatus(503);
              return of(null);
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.productsList.set(response?.data ?? []);
        if (response) {
          this.meta.set(response.meta);
          this.seoService.setResponseStatus(200);
        }
      });
    this.searchChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateQuery(1, true));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchTerm.set(params.get('search') ?? '');
      this.selectedCategory.set(params.get('category') ?? ProductCategory.ALL);
      const sort =
        SORT_OPTIONS.find((option) => option.value === params.get('sort'))?.value ??
        ProductSort.FEATURED;
      this.selectedSort.set(sort);
      const page = Number(params.get('page') ?? 1);
      this.requestProducts(Number.isInteger(page) && page > 0 ? page : 1);
    });
    this.productService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.categoryOptions.set([
            ProductCategory.ALL,
            ...response.data
              .filter((category) => category.productsCount > 0)
              .map((category) => category.name),
          ]),
        error: () => this.categoryOptions.set([ProductCategory.ALL]),
      });
  }

  onSearchChange(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTerm.set(event.target.value);
      this.searchChanges.next(event.target.value);
    }
  }
  onCategorySelect(category: string): void {
    this.selectedCategory.set(category);
    this.updateQuery(1);
  }
  onSortSelect(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      const selected = SORT_OPTIONS.find(
        (option) => option.value === (event.target as HTMLSelectElement).value,
      );
      this.selectedSort.set(selected?.value ?? ProductSort.FEATURED);
      this.updateQuery(1);
    }
  }
  goToPreviousPage(): void {
    if (this.meta().hasPreviousPage) this.updateQuery(this.meta().page - 1);
  }
  goToNextPage(): void {
    if (this.meta().hasNextPage) this.updateQuery(this.meta().page + 1);
  }
  retry(): void {
    this.requestProducts(this.meta().page);
  }
  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set(ProductCategory.ALL);
    this.selectedSort.set(ProductSort.FEATURED);
    this.updateQuery(1);
  }
  private updateQuery(page: number, replaceUrl = false): void {
    const queryParams = {
      search: this.searchTerm().trim() || null,
      category: this.selectedCategory() === ProductCategory.ALL ? null : this.selectedCategory(),
      sort: this.selectedSort() === ProductSort.FEATURED ? null : this.selectedSort(),
      page: page > 1 ? page : null,
    };
    void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl });
  }
  private requestProducts(page: number): void {
    const query: ProductQuery = {
      page,
      limit: INITIAL_PRODUCT_META.limit,
      sort: this.selectedSort(),
    };
    if (this.searchTerm().trim()) query.search = this.searchTerm().trim();
    if (this.selectedCategory() !== ProductCategory.ALL) query.category = this.selectedCategory();
    this.requests.next(query);
  }
}
