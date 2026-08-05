import { Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '@core/services/product.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SeoService } from '@core/services/seo.service';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { Product } from '@core/models/product.model';
import { PRODUCT_SPECS_CONFIG, ProductSpecItem } from '../../product-details.control';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';

export type DisplayStageMode = '3d' | 'image';

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    RouterLink,
    Product3dViewerComponent,
    OtakuLoaderComponent,
    ProductCardComponent
  ],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss'
})
export class ProductDetailsPageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly slug = input<string>();
  readonly productBadgeNone = ProductBadge.NONE;

  readonly product = signal<Product | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly activeStageMode = signal<DisplayStageMode>('3d');
  readonly selectedImageUrl = signal<string>('');

  readonly specsConfig: ProductSpecItem[] = PRODUCT_SPECS_CONFIG;
  readonly safetyNote = computed(() => this.product()?.safetyNote ?? '');

  readonly whatsAppUrl = computed(() => {
    const prod = this.product();
    return prod ? this.whatsAppService.getProductOrderUrl(prod) : '#';
  });

  readonly formattedPrice = computed(() => {
    const prod = this.product();
    return prod ? `${(prod.price || 0).toLocaleString()} EGP` : '0 EGP';
  });

  readonly has3dModel = computed(() => {
    const prod = this.product();
    return !!(prod?.modelUrl && typeof prod.modelUrl === 'string' && prod.modelUrl.trim().length > 0);
  });

  readonly hasMainImage = computed(() => {
    const prod = this.product();
    return !!(prod?.image && typeof prod.image === 'string' && prod.image.trim().length > 0 && !prod.image.includes('placeholder'));
  });

  readonly galleryImages = computed(() => {
    const prod = this.product();
    if (!prod) return [];
    const list: string[] = [];
    if (this.hasMainImage()) {
      list.push(prod.image);
    }
    if (prod.gallery && Array.isArray(prod.gallery)) {
      prod.gallery.forEach(img => {
        if (img && typeof img === 'string' && img.trim().length > 0 && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    return list;
  });

  readonly relatedProducts = computed(() => {
    const prod = this.product();
    if (!prod) return [];
    return this.productService.allProducts()
      .filter(p => p.id !== prod.id && p._id !== prod.id && p.category === prod.category)
      .slice(0, 3);
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const idOrSlug = params['slug'] || params['id'] || this.slug();
      if (idOrSlug) {
        this.fetchProductDetails(idOrSlug);
      }
    });
  }

  private fetchProductDetails(idOrSlug: string): void {
    this.isLoading.set(true);
    this.productService.getProductByIdOrSlug(idOrSlug).subscribe({
      next: (res) => {
        if (res.data) {
          this.product.set(res.data);
          this.seoService.setTitle(`${res.data.name} - 3D Anime Model`);
          this.seoService.setMetaDescription(`${res.data.name} (${res.data.category}). ${res.data.description}`);

          if (this.has3dModel()) {
            this.activeStageMode.set('3d');
          } else if (this.hasMainImage()) {
            this.activeStageMode.set('image');
            this.selectedImageUrl.set(res.data.image);
          }
        } else {
          this.fallbackSearch(idOrSlug);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.fallbackSearch(idOrSlug);
        this.isLoading.set(false);
      }
    });
  }

  private fallbackSearch(idOrSlug: string): void {
    const found = this.productService.getProductById(idOrSlug) ||
      this.productService.allProducts().find(p => p.slug === idOrSlug || p.id === idOrSlug || p._id === idOrSlug);

    if (found) {
      this.product.set(found);
      this.seoService.setTitle(`${found.name} - 3D Anime Model`);
      this.seoService.setMetaDescription(`${found.name} (${found.category}). ${found.description}`);
      if (this.has3dModel()) {
        this.activeStageMode.set('3d');
      } else if (this.hasMainImage()) {
        this.activeStageMode.set('image');
        this.selectedImageUrl.set(found.image);
      }
    } else {
      this.router.navigate(['/not-found']);
    }
  }

  switchTo3d(): void {
    this.activeStageMode.set('3d');
  }

  switchToImage(imageUrl: string): void {
    this.selectedImageUrl.set(imageUrl);
    this.activeStageMode.set('image');
  }
}
