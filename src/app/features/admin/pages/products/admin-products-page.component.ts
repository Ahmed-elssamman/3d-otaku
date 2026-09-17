import { Component, DestroyRef, computed, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, finalize, of, switchMap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { Product } from '@core/models/product.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { getModelTypeFromPath } from '@core/constants/model-file.constants';
import { FormsModule } from '@angular/forms';
import { AdminProductService } from '../../services/admin-product.service';
import {
  ADMIN_ALL_CATEGORY_OPTION,
  ADMIN_CATEGORY_TEXT,
  adminCategoryOptions,
  ADMIN_FEATURED_FILTER_OPTIONS,
  ADMIN_SORT_OPTIONS,
  ADMIN_PRODUCT_PREVIEW_STYLE,
  ADMIN_PRODUCT_SORT_API_MAP,
  AdminOption,
} from '../../data/admin-products.data';
import { AdminFeaturedFilter } from '../../enums/admin-featured-filter.enum';
import { AdminProductSort } from '../../enums/admin-product-sort.enum';
import { AdminFilePreviewComponent } from '../../components/admin-file-preview.component';
import { AdminProductTableComponent } from '../../components/admin-product-table.component';
import { AdminProductQuery } from '../../../products/models/product-query.model';
import { AdminProductPageEvent } from '../../components/admin-product-table.control';
import { AdminProductCategory } from '../../models/admin-product-category.model';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    Dialog,
    InputText,
    Select,
    AdminFilePreviewComponent,
    AdminProductTableComponent,
  ],
  templateUrl: './admin-products-page.component.html',
  styleUrl: './admin-products-page.component.scss',
})
export class AdminProductsPageComponent implements OnInit {
  private adminProductService = inject(AdminProductService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  private productRequests = new Subject<AdminProductQuery>();
  private searchChanges = new Subject<string>();
  private previewRequests = new Subject<string>();

  categories = signal<AdminProductCategory[]>([]);
  categoriesLoading = signal(false);
  categoryLoadError = signal('');
  categoryText = ADMIN_CATEGORY_TEXT;
  categoryOptions = computed<AdminOption[]>(() => [
    ADMIN_ALL_CATEGORY_OPTION,
    ...adminCategoryOptions(this.categories(), this.selectedCategory()),
  ]);
  featuredFilterOptions: AdminOption[] = ADMIN_FEATURED_FILTER_OPTIONS;
  sortOptions: AdminOption[] = ADMIN_SORT_OPTIONS;
  previewStyle = ADMIN_PRODUCT_PREVIEW_STYLE;

  searchTerm = signal<string>('');
  selectedCategory = signal<string>(ADMIN_ALL_CATEGORY_OPTION.value);
  selectedFeaturedFilter = signal<AdminFeaturedFilter>(AdminFeaturedFilter.ALL);
  selectedSort = signal<AdminProductSort>(AdminProductSort.NEWEST);
  first = signal<number>(0);
  rows = signal<number>(10);
  selectedPreviewProduct = signal<Product | null>(null);
  previewVisible = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  productsList = signal<Product[]>([]);
  totalRecords = signal(0);
  loadError = signal('');
  previewLoading = signal(false);
  previewError = signal('');
  previewProductId = signal('');
  busyProductId = signal('');
  previewModelType = computed(
    () =>
      getModelTypeFromPath(this.selectedPreviewProduct()?.modelUrl || '') || ProductModelType.GLB,
  );

  constructor() {
    this.previewRequests
      .pipe(
        switchMap((id) => {
          this.previewLoading.set(true);
          this.previewError.set('');
          this.selectedPreviewProduct.set(null);
          return this.adminProductService.getProductById(id).pipe(
            catchError(() => {
              this.previewError.set('تعذّر تحميل بيانات المنتج للمعاينة. أعد المحاولة.');
              return of(null);
            }),
            finalize(() => this.previewLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => this.selectedPreviewProduct.set(response?.data || null));
    this.productRequests
      .pipe(
        switchMap((query) => {
          this.isLoading.set(true);
          this.loadError.set('');
          return this.adminProductService.getProducts(query).pipe(
            catchError(() => {
              this.loadError.set('تعذر تحميل المنتجات. حاول مرة أخرى.');
              return of(null);
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) return;
        this.productsList.set(response.data);
        this.totalRecords.set(response.meta.totalItems);
        const lastPageStart =
          Math.max(0, Math.ceil(response.meta.totalItems / this.rows()) - 1) * this.rows();
        if (this.first() > lastPageStart) {
          this.first.set(lastPageStart);
          this.loadProducts();
        }
      });
    this.searchChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProducts());
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    if (this.categoriesLoading()) return;
    this.categoriesLoading.set(true);
    this.categoryLoadError.set('');
    this.adminProductService
      .getCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.categories.set(response.data),
        error: () => this.categoryLoadError.set(ADMIN_CATEGORY_TEXT.loadError),
      });
  }

  loadProducts(): void {
    const query: AdminProductQuery = {
      page: Math.floor(this.first() / this.rows()) + 1,
      limit: this.rows(),
      sort: ADMIN_PRODUCT_SORT_API_MAP[this.selectedSort()],
    };
    if (this.searchTerm().trim()) query.search = this.searchTerm().trim();
    if (this.selectedCategory() !== ADMIN_ALL_CATEGORY_OPTION.value) {
      query.category = this.selectedCategory();
    }
    if (this.selectedFeaturedFilter() !== AdminFeaturedFilter.ALL) {
      query.featured = this.selectedFeaturedFilter() === AdminFeaturedFilter.FEATURED;
    }
    this.productRequests.next(query);
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    this.first.set(0);
    this.searchChanges.next(value);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value);
    this.first.set(0);
    this.loadProducts();
  }

  onFeaturedFilterChange(value: AdminFeaturedFilter): void {
    this.selectedFeaturedFilter.set(value);
    this.first.set(0);
    this.loadProducts();
  }

  onSortChange(value: AdminProductSort): void {
    this.selectedSort.set(value);
    this.first.set(0);
    this.loadProducts();
  }

  onPageChange(event: AdminProductPageEvent): void {
    this.first.set(event.first);
    this.rows.set(event.rows);
    this.loadProducts();
  }

  onPreviewVisibleChange(visible: boolean): void {
    this.previewVisible.set(visible);
  }

  openPreview(productId: string): void {
    this.previewProductId.set(productId);
    this.previewVisible.set(true);
    this.previewRequests.next(productId);
  }

  retryPreview(): void {
    if (this.previewProductId()) this.previewRequests.next(this.previewProductId());
  }

  editProduct(productId: string): void {
    this.router.navigate(['/admin/products', productId, 'edit']);
  }

  duplicateProduct(productId: string): void {
    if (this.busyProductId()) return;
    this.busyProductId.set(productId);
    this.adminProductService
      .duplicateProduct(productId)
      .pipe(
        finalize(() => this.busyProductId.set('')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.messageService.add({
              severity: 'success',
              summary: 'تم نسخ المنتج',
              detail: 'أُنشئت مسودة جديدة. راجع بياناتها قبل النشر.',
            });
            this.loadProducts();
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'لم يتم تأكيد النسخ',
            detail: 'راجع القائمة قبل تكرار العملية لتجنب إنشاء نسخة إضافية.',
          });
        },
      });
  }

  deleteProduct(productId: string): void {
    if (this.busyProductId()) return;
    this.confirmationService.confirm({
      message: 'سيُزال المنتج من الكتالوج. تأكد من اختيار المنتج الصحيح قبل الحذف.',
      header: 'تأكيد حذف المنتج',
      acceptLabel: 'حذف المنتج',
      rejectLabel: 'إلغاء',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (this.busyProductId()) return;
        this.busyProductId.set(productId);
        this.adminProductService
          .deleteProduct(productId)
          .pipe(
            finalize(() => this.busyProductId.set('')),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'تم حذف المنتج',
                detail: 'أُزيل المنتج من الكتالوج.',
              });
              this.loadProducts();
              this.loadCategories();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'لم يتم تأكيد الحذف',
                detail: 'أعد تحميل القائمة للتحقق من حالة المنتج قبل المحاولة مرة أخرى.',
              });
            },
          });
      },
    });
  }
}
