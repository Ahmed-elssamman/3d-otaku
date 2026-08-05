import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Product } from '@core/models/product.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { Toolbar } from 'primeng/toolbar';
import { FormsModule } from '@angular/forms';
import { AdminProductService } from '../../services/admin-product.service';
import {
  ADMIN_CATEGORY_OPTIONS,
  ADMIN_FEATURED_FILTER_OPTIONS,
  ADMIN_SORT_OPTIONS,
  AdminOption
} from '../../data/admin-products.data';
import { AdminFeaturedFilter } from '../../enums/admin-featured-filter.enum';
import { AdminProductSort } from '../../enums/admin-product-sort.enum';
import { AdminFilePreviewComponent } from '../../components/admin-file-preview.component';
import { AdminProductTableComponent } from '../../components/admin-product-table.component';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    Dialog,
    InputText,
    Select,
    Skeleton,
    Toolbar,
    AdminFilePreviewComponent,
    AdminProductTableComponent
  ],
  templateUrl: './admin-products-page.component.html',
  styleUrl: './admin-products-page.component.scss'
})
export class AdminProductsPageComponent implements OnInit {
  private adminProductService = inject(AdminProductService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  categoryOptions: AdminOption[] = ADMIN_CATEGORY_OPTIONS;
  featuredFilterOptions: AdminOption[] = ADMIN_FEATURED_FILTER_OPTIONS;
  sortOptions: AdminOption[] = ADMIN_SORT_OPTIONS;

  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');
  selectedFeaturedFilter = signal<string>(AdminFeaturedFilter.ALL);
  selectedSort = signal<string>(AdminProductSort.NEWEST);
  first = signal<number>(0);
  rows = signal<number>(10);
  selectedPreviewProduct = signal<Product | null>(null);
  previewVisible = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  productsList = signal<Product[]>([]);

  products = this.adminProductService.products;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.adminProductService.getProducts({
      search: this.searchTerm(),
      category: this.selectedCategory() !== 'all' ? this.selectedCategory() : undefined
    }).subscribe({
      next: (res) => {
        if (res.data) {
          this.productsList.set(res.data);
        } else {
          this.productsList.set(this.products());
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.productsList.set(this.products());
        this.isLoading.set(false);
      }
    });
  }

  filteredProducts = computed(() => {
    let list = [...this.productsList()];
    const searchTerm = this.searchTerm().trim().toLowerCase();

    if (searchTerm) {
      list = list.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.slug.toLowerCase().includes(searchTerm)
      );
    }

    if (this.selectedCategory() !== 'all') {
      list = list.filter(product => product.category === this.selectedCategory());
    }

    if (this.selectedFeaturedFilter() === AdminFeaturedFilter.FEATURED) {
      list = list.filter(product => product.isFeatured);
    }

    if (this.selectedFeaturedFilter() === AdminFeaturedFilter.NOT_FEATURED) {
      list = list.filter(product => !product.isFeatured);
    }

    if (this.selectedSort() === AdminProductSort.PRICE_ASC) {
      list.sort((first, second) => first.price - second.price);
    } else if (this.selectedSort() === AdminProductSort.PRICE_DESC) {
      list.sort((first, second) => second.price - first.price);
    } else if (this.selectedSort() === AdminProductSort.RATING_DESC) {
      list.sort((first, second) => second.rating - first.rating);
    } else {
      list.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    }

    return list;
  });

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    this.first.set(0);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value);
    this.first.set(0);
  }

  onFeaturedFilterChange(value: string): void {
    this.selectedFeaturedFilter.set(value);
    this.first.set(0);
  }

  onSortChange(value: string): void {
    this.selectedSort.set(value);
    this.first.set(0);
  }

  onPageChange(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.rows.set(event.rows);
  }

  openPreview(productId: string): void {
    this.adminProductService.getProductById(productId).subscribe({
      next: (res) => {
        const product = res.data || this.products().find(p => p.id === productId) || null;
        this.selectedPreviewProduct.set(product);
        this.previewVisible.set(product !== null);
      },
      error: () => {
        const product = this.products().find(p => p.id === productId) || null;
        this.selectedPreviewProduct.set(product);
        this.previewVisible.set(product !== null);
      }
    });
  }

  editProduct(productId: string): void {
    this.router.navigate(['/admin/products', productId, 'edit']);
  }

  duplicateProduct(productId: string): void {
    this.adminProductService.duplicateProduct(productId).subscribe({
      next: (res) => {
        if (res.data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Product duplicated',
            detail: `${res.data.name} was created successfully.`
          });
          this.loadProducts();
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Duplication failed',
          detail: err?.message || 'Unable to duplicate product.'
        });
      }
    });
  }

  deleteProduct(productId: string): void {
    this.confirmationService.confirm({
      message: 'Delete this product from the catalog?',
      header: 'Delete Product',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.adminProductService.deleteProduct(productId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Product removed',
              detail: 'The product was deleted successfully.'
            });
            this.loadProducts();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Delete failed',
              detail: err?.message || 'Unable to delete product.'
            });
          }
        });
      }
    });
  }
}
