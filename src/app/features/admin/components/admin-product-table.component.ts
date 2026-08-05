import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '@core/models/product.model';
import { Button } from 'primeng/button';
import { Rating } from 'primeng/rating';
import { Table } from 'primeng/table';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-admin-product-table',
  standalone: true,
  imports: [FormsModule, Button, CurrencyPipe, DatePipe, DecimalPipe, Rating, Table, Tag],
  templateUrl: './admin-product-table.component.html',
  styleUrl: './admin-product-table.component.scss'
})
export class AdminProductTableComponent {
  products = input.required<Product[]>();
  totalRecords = input.required<number>();
  first = input.required<number>();
  rows = input.required<number>();

  pageChange = output<{ first: number; rows: number }>();
  edit = output<string>();
  duplicate = output<string>();
  delete = output<string>();
  preview = output<string>();

  pagedProducts = computed(() => this.products().slice(this.first(), this.first() + this.rows()));
}
