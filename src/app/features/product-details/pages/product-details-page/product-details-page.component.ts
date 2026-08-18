import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { ProductDisplayMode, ProductDisplaySpec } from '../../product-details.control';
import { formatProductionEstimate, getSalePrice, hasValidDiscount } from '@core/utils/product-display.util';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, Product3dViewerComponent, ProductCardComponent, OtakuLoaderComponent],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss'
})
export class ProductDetailsPageComponent implements OnInit {
  private productService = inject(ProductService);
  private whatsAppService = inject(WhatsAppService);
  private cartService = inject(CartService);
  private seoService = inject(SeoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private settingsService = inject(AdminSettingsService);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);

  productBadgeNone = ProductBadge.NONE;
  product = signal<Product | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  activeStageMode = signal<ProductDisplayMode>(ProductDisplayMode.IMAGE);
  selectedImageUrl = signal<string>('');
  failedImages = signal<string[]>([]);
  quantity = signal<number>(1);
  settings = this.settingsService.settings;
  whatsAppUrl = computed(() => this.product() ? this.whatsAppService.getProductOrderUrl(this.product() as Product) : '#');
  has3dModel = computed(() => Boolean(this.product()?.modelUrl?.trim()));
  galleryImages = computed(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    const images = [product.image, ...(product.gallery ?? [])].filter(image => Boolean(image?.trim()) && !this.failedImages().includes(image));
    return [...new Set(images)];
  });
  hasValidDiscount = computed(() => {
    const product = this.product();
    return Boolean(product && hasValidDiscount(product.price, product.discountPrice ?? null));
  });
  salePrice = computed(() => {
    const product = this.product();
    return product ? getSalePrice(product.price, product.discountPrice ?? null) : 0;
  });
  productionEstimate = computed(() => {
    const product = this.product();
    if (!product) {
      return '';
    }
    return formatProductionEstimate(product.isMadeToOrder ?? false, product.productionTimeMin ?? null, product.productionTimeMax ?? null, product.productionTimeUnit ?? null);
  });
  customerSpecs = computed<ProductDisplaySpec[]>(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return [
      { id: 'material', label: 'Material', value: product.material },
      { id: 'finish', label: 'Finish', value: product.finish },
      { id: 'color', label: 'Color', value: product.color },
      { id: 'size', label: 'Size / dimensions', value: product.size },
      { id: 'weight', label: 'Weight', value: product.weight }
    ].filter(spec => Boolean(spec.value?.trim()));
  });
  technicalSpecs = computed<ProductDisplaySpec[]>(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return [
      { id: 'print-time', label: 'Estimated print time', value: product.printTime },
      { id: 'layer-height', label: 'Layer height', value: product.layerHeight ?? '' },
      { id: 'infill', label: 'Infill', value: product.infill ?? '' }
    ].filter(spec => Boolean(spec.value?.trim()));
  });
  relatedProducts = computed(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return this.productService.allProducts().filter(item => item.id !== product.id && item.category === product.category).slice(0, 3);
  });

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const slug = typeof params['slug'] === 'string' ? params['slug'] : '';
      if (slug) {
        this.fetchProductDetails(slug);
      }
    });
  }

  addToCartAndCheckout(): void {
    const product = this.product();
    if (product) {
      this.cartService.addItem(product, this.quantity());
      void this.router.navigate(['/cart']);
    }
  }

  incrementQuantity(): void {
    this.quantity.update(value => Math.min(value + 1, 99));
  }

  decrementQuantity(): void {
    this.quantity.update(value => Math.max(value - 1, 1));
  }

  switchTo3d(): void {
    if (this.has3dModel()) {
      this.analytics.track(AnalyticsEventName.OPEN_3D_VIEWER, { product_id: this.product()?.id ?? '' });
      this.activeStageMode.set(ProductDisplayMode.MODEL);
    }
  }

  switchToImage(imageUrl: string): void {
    this.selectedImageUrl.set(imageUrl);
    this.activeStageMode.set(ProductDisplayMode.IMAGE);
  }

  onSelectedImageError(): void {
    const failedImage = this.selectedImageUrl();
    if (failedImage) {
      this.failedImages.update(images => [...images, failedImage]);
    }
    this.selectedImageUrl.set(this.galleryImages()[0] ?? '');
  }

  onGalleryImageError(imageUrl: string): void {
    this.failedImages.update(images => images.includes(imageUrl) ? images : [...images, imageUrl]);
    if (this.selectedImageUrl() === imageUrl) {
      this.selectedImageUrl.set(this.galleryImages()[0] ?? '');
    }
  }

  retry(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.fetchProductDetails(slug);
    }
  }

  private fetchProductDetails(slug: string): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.productService.getProductBySlug(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (!response.data || response.data.isActive === false || response.data.deletedAt) {
          void this.router.navigate(['/not-found']);
          return;
        }
        this.product.set(response.data);
        this.failedImages.set([]);
        const firstImage = [response.data.image, ...(response.data.gallery ?? []), response.data.posterImage ?? ''].find(image => Boolean(image?.trim())) ?? '';
        this.selectedImageUrl.set(firstImage);
        this.activeStageMode.set(ProductDisplayMode.IMAGE);
        const currency = this.settings().defaultCurrency.trim();
        this.seoService.setProductMetadata(response.data, currency);
        this.analytics.track(AnalyticsEventName.VIEW_PRODUCT, { product_id: response.data.id, category: response.data.category });
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }
}
