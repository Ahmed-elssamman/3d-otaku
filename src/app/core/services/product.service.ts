import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductQuery } from '../../features/products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { environment } from '../../../environments/environment';
import { APP_CONSTANTS } from '../constants/app.constants';
import { MOCK_PRODUCTS } from '../../features/admin/data/mock-products.data';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = inject(ApiService);
  private productsSignal = signal<Product[]>(this.loadFromStorage());

  allProducts = computed(() => this.productsSignal().filter(product => product.isActive));
  featuredProducts = computed(() => this.productsSignal().filter(product => product.isActive && product.isFeatured));
  adminProducts = computed(() => this.productsSignal());

  getProducts(query?: ProductQuery): Observable<PaginatedResponse<Product>> {
    if (environment.useMockApi) {
      let items = this.productsSignal().filter(p => p.isActive);

      if (query?.search) {
        const searchLower = query.search.toLowerCase();
        items = items.filter(
          p => p.name.toLowerCase().includes(searchLower) || p.description.toLowerCase().includes(searchLower)
        );
      }

      if (query?.category && query.category !== 'all' && query.category !== 'All Categories') {
        items = items.filter(p => p.category === query.category);
      }

      if (query?.featured) {
        items = items.filter(p => p.isFeatured);
      }

      if (query?.minPrice !== undefined) {
        items = items.filter(p => p.price >= query.minPrice!);
      }

      if (query?.maxPrice !== undefined) {
        items = items.filter(p => p.price <= query.maxPrice!);
      }

      if (query?.sort) {
        if (query.sort === 'price_low') {
          items.sort((a, b) => a.price - b.price);
        } else if (query.sort === 'price_high') {
          items.sort((a, b) => b.price - a.price);
        } else if (query.sort === 'rating') {
          items.sort((a, b) => b.rating - a.rating);
        }
      }

      const page = query?.page || 1;
      const limit = query?.limit || 12;
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit) || 1;
      const start = (page - 1) * limit;
      const paginatedData = items.slice(start, start + limit);

      return of({
        success: true,
        message: 'Products fetched successfully.',
        data: paginatedData,
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    }

    return this.api.getPaginated<Product>(API_ENDPOINTS.products.list, query as Record<string, unknown>).pipe(
      map(res => {
        if (res.data) {
          const normalized = res.data.map(p => ({
            ...p,
            id: p.id || p._id || ''
          }));
          return { ...res, data: normalized };
        }
        return res;
      })
    );
  }

  getFeaturedProducts(limit: number = 6): Observable<ApiResponse<Product[]>> {
    if (environment.useMockApi) {
      const featured = this.productsSignal()
        .filter(p => p.isActive && p.isFeatured)
        .slice(0, limit);

      return of({
        success: true,
        message: 'Featured products fetched successfully.',
        data: featured
      });
    }

    return this.api.get<Product[]>(API_ENDPOINTS.products.featured, { limit }).pipe(
      map(res => {
        if (res.data) {
          const normalized = res.data.map(p => ({
            ...p,
            id: p.id || p._id || ''
          }));
          return { ...res, data: normalized };
        }
        return res;
      })
    );
  }

  getProductBySlug(slug: string): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      const found = this.productsSignal().find(p => p.slug === slug);
      if (!found) {
        return of({
          success: false,
          message: 'Product not found.',
          data: null as unknown as Product
        });
      }
      return of({
        success: true,
        message: 'Product details fetched successfully.',
        data: found
      });
    }

    return this.api.get<Product>(API_ENDPOINTS.products.details(slug)).pipe(
      map(res => {
        if (res.data) {
          return { ...res, data: { ...res.data, id: res.data.id || res.data._id || '' } };
        }
        return res;
      })
    );
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    if (environment.useMockApi) {
      const categoriesMap = new Map<string, number>();
      this.productsSignal().forEach(p => {
        if (p.isActive) {
          categoriesMap.set(p.category, (categoriesMap.get(p.category) || 0) + 1);
        }
      });

      const categories: Category[] = Array.from(categoriesMap.entries()).map(([name, count], index) => ({
        id: `cat_${index + 1}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description: `${name} items`,
        image: 'assets/images/placeholder.webp',
        productsCount: count
      }));

      return of({
        success: true,
        message: 'Categories fetched successfully.',
        data: categories
      });
    }

    return this.api.get<Category[]>(API_ENDPOINTS.products.categories);
  }

  getProductById(id: string): Product | null {
    return this.productsSignal().find(product => product.id === id || product._id === id) || null;
  }

  createProduct(product: Product): void {
    this.productsSignal.update(products => [product, ...products]);
    this.saveToStorage();
  }

  updateProduct(id: string, product: Product): void {
    this.productsSignal.update(products =>
      products.map(item => (item.id === id || item._id === id ? product : item))
    );
    this.saveToStorage();
  }

  deleteProduct(id: string): void {
    this.productsSignal.update(products => products.filter(product => product.id !== id && product._id !== id));
    this.saveToStorage();
  }

  duplicateProduct(id: string): Product | null {
    const source = this.getProductById(id);
    if (!source) return null;

    const timestamp = Date.now().toString();
    const duplicate: Product = {
      ...source,
      id: `prod-${timestamp}`,
      slug: `${source.slug}-copy-${timestamp.slice(-4)}`,
      name: `${source.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.createProduct(duplicate);
    return duplicate;
  }

  toggleFeatured(id: string): void {
    const product = this.getProductById(id);
    if (!product) return;
    this.updateProduct(id, {
      ...product,
      isFeatured: !product.isFeatured,
      updatedAt: new Date().toISOString()
    });
  }

  toggleActive(id: string): void {
    const product = this.getProductById(id);
    if (!product) return;
    this.updateProduct(id, {
      ...product,
      isActive: !product.isActive,
      updatedAt: new Date().toISOString()
    });
  }

  saveToStorage(): void {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.PRODUCTS, JSON.stringify(this.productsSignal()));
  }

  loadFromStorage(): Product[] {
    const raw = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.PRODUCTS);
    if (!raw) return [...MOCK_PRODUCTS];

    try {
      const parsed = JSON.parse(raw) as Product[];
      return parsed.length ? parsed : [...MOCK_PRODUCTS];
    } catch {
      return [...MOCK_PRODUCTS];
    }
  }
}
