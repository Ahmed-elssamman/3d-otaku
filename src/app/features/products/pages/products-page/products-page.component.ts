import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  NgZone
} from '@angular/core';
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
import * as THREE from 'three';

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
export class ProductsPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('productsCanvas');

  readonly sortOptions: SortOption[] = SORT_OPTIONS;
  readonly categoryOptions: string[] = CATEGORY_OPTIONS;

  readonly searchTerm = signal<string>('');
  readonly selectedCategory = signal<string>(ProductCategory.ALL);
  readonly selectedSort = signal<'price-asc' | 'price-desc' | 'rating-desc' | 'name-asc'>('rating-desc');
  readonly maxPriceFilter = signal<number>(1500);
  readonly isLoading = signal<boolean>(true);
  readonly productsList = signal<Product[]>([]);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private particleSystem?: THREE.Points;
  private animationFrameId?: number;

  ngOnInit(): void {
    this.seoService.setTitle('3D Anime Products & Cosplay Props Catalog - 3D Otaku');
    this.seoService.setMetaDescription('Browse 3D Otaku full catalog of 3D printed anime katanas, daggers, cosplay props, and desk models.');

    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      this.loadProducts();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initProducts3dScene(), 50);
  }

  ngOnDestroy(): void {
    this.cleanProducts3dScene();
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
          list = list.filter(p => p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query));
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

  private initProducts3dScene(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.cleanProducts3dScene();

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || 450;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floating Cyber Grid Particles
    const particleCount = 260;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorChoices = [
      new THREE.Color(0xec4899),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xa855f7)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 18;
      positions[idx + 1] = (Math.random() - 0.5) * 18;
      positions[idx + 2] = (Math.random() - 0.5) * 18;

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    this.ngZone.runOutsideAngular(() => {
      let clock = new THREE.Clock();
      const animate = () => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        if (this.particleSystem) {
          this.particleSystem.rotation.y = elapsedTime * 0.04;
          this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private cleanProducts3dScene(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene = undefined;
    this.camera = undefined;
    this.particleSystem = undefined;
  }
}
