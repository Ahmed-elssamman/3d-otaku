import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '@core/models/product.model';
import { Button } from 'primeng/button';
import { TableModule, TablePageEvent } from 'primeng/table';
import { adminCategoryLabel } from '../data/admin-products.data';
import { ADMIN_PRODUCT_PAGE_SIZES, AdminProductPageEvent } from './admin-product-table.control';

@Component({
  selector: 'app-admin-product-table',
  standalone: true,
  imports: [FormsModule, Button, CurrencyPipe, DatePipe, TableModule],
  templateUrl: './admin-product-table.component.html',
  styleUrl: './admin-product-table.component.scss',
})
export class AdminProductTableComponent {
  products = input.required<Product[]>();
  totalRecords = input.required<number>();
  first = input.required<number>();
  rows = input.required<number>();
  busyProductId = input('');
  tableRows = computed(() =>
    this.products().map((product) => ({
      ...product,
      categoryLabel: adminCategoryLabel(product.category),
      statusLabel: product.isActive ? 'منشور' : 'مسودة غير منشورة',
      featuredLabel: product.isFeatured ? 'مميز' : 'عادي',
      busy: this.busyProductId() !== '',
    })),
  );

  pageChange = output<AdminProductPageEvent>();
  edit = output<string>();
  duplicate = output<string>();
  delete = output<string>();
  preview = output<string>();

  pageSizes = ADMIN_PRODUCT_PAGE_SIZES;

  onPageChange(event: TablePageEvent): void {
    this.pageChange.emit({ first: event.first, rows: event.rows });
  }

  previewProduct(id: string): void {
    this.preview.emit(id);
  }
  editProduct(id: string): void {
    this.edit.emit(id);
  }
  duplicateProduct(id: string): void {
    this.duplicate.emit(id);
  }
  deleteProduct(id: string): void {
    this.delete.emit(id);
  }
}
