import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, map, tap } from 'rxjs';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductQuery } from '../../features/products/models/product-query.model';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { environment } from '../../../environments/environment';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = inject(ApiService);
  private productsSignal = signal<Product[]>(this.loadFromStorage());

  allProducts = computed(() =>
    this.productsSignal().filter(p => p.isActive !== false && this.hasImageOrModel(p))
  );

  featuredProducts = computed(() =>
    this.productsSignal().filter(p => p.isFeatured && this.hasImageOrModel(p))
  );

  adminProducts = computed(() => this.productsSignal());

  private hasImageOrModel(p: Product): boolean {
    const hasImg = !!(p.image && typeof p.image === 'string' && p.image.trim().length > 0 && !p.image.includes('placeholder'));
    const hasModel = !!(p.modelUrl && typeof p.modelUrl === 'string' && p.modelUrl.trim().length > 0);
    return hasImg || hasModel;
  }

  getProducts(query?: ProductQuery): Observable<PaginatedResponse<Product>> {
    if (environment.useMockApi) {
      let items = this.productsSignal().filter(p => this.hasImageOrModel(p));

      if (query?.search) {
        const searchLower = query.search.toLowerCase();
        items = items.filter(
          p => p.name.toLowerCase().includes(searchLower) || (p.description || '').toLowerCase().includes(searchLower)
        );
      }

      if (query?.category && query.category !== 'all' && query.category !== 'All Categories') {
        items = items.filter(p => p.category === query.category);
      }

      if (query?.featured) {
        items = items.filter(p => p.isFeatured);
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
          const normalized = res.data
            .map(p => ({
              ...p,
              id: p.id || p._id || ''
            }))
            .filter(p => this.hasImageOrModel(p));
          return { ...res, data: normalized };
        }
        return res;
      }),
      tap(res => {
        if (res.data && res.data.length > 0) {
          this.productsSignal.set(res.data);
          this.saveToStorage();
        }
      })
    );
  }

  getFeaturedProducts(limit: number = 6): Observable<ApiResponse<Product[]>> {
    if (environment.useMockApi) {
      const featured = this.productsSignal()
        .filter(p => p.isFeatured && this.hasImageOrModel(p))
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
          const normalized = res.data
            .map(p => ({
              ...p,
              id: p.id || p._id || ''
            }))
            .filter(p => this.hasImageOrModel(p));
          return { ...res, data: normalized };
        }
        return res;
      }),
      tap(res => {
        if (res.data && res.data.length > 0) {
          this.productsSignal.set(res.data);
          this.saveToStorage();
        }
      })
    );
  }

  getProductByIdOrSlug(idOrSlug: string): Observable<ApiResponse<Product>> {
    if (environment.useMockApi) {
      const found = this.productsSignal().find(p => p.id === idOrSlug || p._id === idOrSlug || p.slug === idOrSlug);
      return of({
        success: !!found,
        message: found ? 'Product details fetched successfully.' : 'Product not found.',
        data: found as Product
      });
    }

    return this.api.get<Product>(API_ENDPOINTS.products.details(idOrSlug)).pipe(
      map(res => {
        if (res.data) {
          return { ...res, data: { ...res.data, id: res.data.id || res.data._id || idOrSlug } };
        }
        return res;
      })
    );
  }

  getProductBySlug(slug: string): Observable<ApiResponse<Product>> {
    return this.getProductByIdOrSlug(slug);
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    if (environment.useMockApi) {
      const categoriesMap = new Map<string, number>();
      this.productsSignal().forEach(p => {
        if (this.hasImageOrModel(p)) {
          categoriesMap.set(p.category, (categoriesMap.get(p.category) || 0) + 1);
        }
      });

      const categories: Category[] = Array.from(categoriesMap.entries()).map(([name, count], index) => ({
        id: `cat_${index + 1}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description: `${name} items`,
        image: '',
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
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as Product[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
