import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '@core/models/product.model';
import { CartService } from '@core/services/cart.service';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { CATEGORY_PRESENTATION } from '@shared/components/product-card/product-card.control';
import { getModelTypeFromPath } from '@core/constants/model-file.constants';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import {
  CUSTOMER_SPEC_FIELDS,
  GALLERY_THUMBNAIL_CONTENT_SIZE,
  TECHNICAL_SPEC_FIELDS,
  ProductDisplayMode,
  ProductDisplaySpec,
  ProductGalleryImageView,
} from '../../product-details.control';
import {
  formatProductionEstimate,
  getSalePrice,
  hasValidDiscount,
} from '@core/utils/product-display.util';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import { getProductImage, getUniqueProductImageSources } from '@core/utils/product-image.util';
import { ProductImageKind } from '@core/enums/product-image-kind.enum';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { formatProductSpecValue } from '@core/utils/product-spec-display.util';
import { NotFoundPageComponent } from '../../../not-found/pages/not-found-page/not-found-page.component';
import { CartAdditionStatus } from '@core/enums/cart-addition-status.enum';
import { CART_ADDITION_TEXT } from '@core/constants/cart.constants';
import { MAX_CART_QUANTITY } from '@core/constants/order.constants';

@Component({
  selector: 'app-product-details-page',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    Product3dViewerComponent,
    ProductCardComponent,
    NotFoundPageComponent,
  ],
  templateUrl: './product-details-page.component.html',
  styleUrl: './product-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsPageComponent implements OnInit {
  private productService = inject(ProductService);
  private whatsAppService = inject(WhatsAppService);
  private cartService = inject(CartService);
  private seoService = inject(SeoService);
  private route = inject(ActivatedRoute);
  private settingsService = inject(AdminSettingsService);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);
  private detailRequest: Subscription | null = null;

  product = signal<Product | null>(null);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  notFound = signal(false);
  activeStageMode = signal<ProductDisplayMode>(ProductDisplayMode.IMAGE);
  selectedImageUrl = signal<string>('');
  failedImages = signal<string[]>([]);
  failedVariantUrls = signal<string[]>([]);
  selectedImage = computed(() => {
    const product = this.product();
    return product
      ? getProductImage(
          product,
          this.selectedImageUrl(),
          ProductImageKind.DETAIL,
          this.failedVariantUrls(),
        )
      : null;
  });
  galleryViews = computed<ProductGalleryImageView[]>(() => {
    const product = this.product();
    return product
      ? this.galleryImages().map((url) => {
          const image = getProductImage(
            product,
            url,
            ProductImageKind.THUMBNAIL,
            this.failedVariantUrls(),
          );
          const ratio = image.height > 0 ? Math.min(1, image.width / image.height) : 1;
          return { ...image, sizes: `calc((${GALLERY_THUMBNAIL_CONTENT_SIZE}) * ${ratio})` };
        })
      : [];
  });
  quantity = signal<number>(1);
  additionStatus = signal<CartAdditionStatus | null>(null);
  addedToCart = computed(() => this.additionStatus() === CartAdditionStatus.Added);
  cartText = CART_ADDITION_TEXT;
  remainingQuantity = computed(() =>
    this.cartService.remainingCapacity(this.product()?.id || this.product()?._id || ''),
  );
  hasCartItems = computed(() => this.remainingQuantity() < MAX_CART_QUANTITY);
  quantityHelp = computed(() =>
    this.hasCartItems() && this.remainingQuantity() > 0
      ? `${CART_ADDITION_TEXT.remainingPrefix} ${this.remainingQuantity()} ${CART_ADDITION_TEXT.remainingSuffix}`
      : '',
  );
  additionFeedback = computed(() => {
    if (this.remainingQuantity() === 0) return CART_ADDITION_TEXT.limitMessage;
    if (this.addedToCart()) return CART_ADDITION_TEXT.detailsAdded;
    if (
      this.quantity() > this.remainingQuantity() ||
      this.additionStatus() === CartAdditionStatus.QuantityLimit
    ) {
      return CART_ADDITION_TEXT.quantityLimit;
    }
    if (this.additionStatus() === CartAdditionStatus.Invalid) return CART_ADDITION_TEXT.invalid;
    return '';
  });
  modelViewActive = computed(
    () => this.activeStageMode() === ProductDisplayMode.MODEL && this.has3dModel(),
  );
  canPurchase = computed(
    () =>
      Boolean(this.product()?.isActive) &&
      Number.isFinite(this.salePrice()) &&
      this.salePrice() > 0 &&
      Number.isSafeInteger(this.quantity()) &&
      this.quantity() > 0 &&
      this.quantity() <= this.remainingQuantity(),
  );
  categoryLabel = computed(
    () =>
      CATEGORY_PRESENTATION.find((category) => category.value === this.product()?.category)
        ?.label ??
      this.product()?.category ??
      '',
  );
  settings = this.settingsService.settings;
  whatsAppUrl = computed(() => {
    const product = this.product();
    return product ? this.whatsAppService.getProductOrderUrl(product) : '';
  });
  has3dModel = computed(() => Boolean(getModelTypeFromPath(this.product()?.modelUrl ?? '')));
  galleryImages = computed(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    const images = [product.image, ...(product.gallery ?? [])].filter(
      (image) => Boolean(image?.trim()) && !this.failedImages().includes(image),
    );
    return getUniqueProductImageSources(images, product.imageVariants ?? []);
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
    return formatProductionEstimate(
      product.isMadeToOrder ?? false,
      product.productionTimeMin ?? null,
      product.productionTimeMax ?? null,
      product.productionTimeUnit ?? null,
    );
  });
  customerSpecs = computed<ProductDisplaySpec[]>(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return CUSTOMER_SPEC_FIELDS.map((field) => ({
      id: field.key,
      label: field.label,
      value: formatProductSpecValue(field.key, product[field.key] ?? ''),
    })).filter((spec) => Boolean(spec.value));
  });
  technicalSpecs = computed<ProductDisplaySpec[]>(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return TECHNICAL_SPEC_FIELDS.map((field) => ({
      id: field.key,
      label: field.label,
      value: formatProductSpecValue(field.key, product[field.key] ?? ''),
    })).filter((spec) => Boolean(spec.value));
  });
  relatedProducts = computed(() => {
    const product = this.product();
    if (!product) {
      return [];
    }
    return this.productService
      .allProducts()
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, 3);
  });

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = typeof params['slug'] === 'string' ? params['slug'] : '';
      if (slug) {
        this.fetchProductDetails(slug);
      }
    });
  }

  addToCart(): void {
    const product = this.product();
    if (product && this.canPurchase()) {
      this.additionStatus.set(this.cartService.addItem(product, this.quantity()));
    }
  }

  incrementQuantity(): void {
    this.quantity.update((value) => Math.min(value + 1, Math.max(1, this.remainingQuantity())));
    this.additionStatus.set(null);
  }

  decrementQuantity(): void {
    this.quantity.update((value) => Math.max(value - 1, 1));
    this.additionStatus.set(null);
  }

  switchTo3d(): void {
    if (this.has3dModel()) {
      this.analytics.track(AnalyticsEventName.OPEN_3D_VIEWER, {
        product_id: this.product()?.id ?? '',
      });
      this.activeStageMode.set(ProductDisplayMode.MODEL);
    }
  }

  switchToImage(imageUrl: string): void {
    this.selectedImageUrl.set(imageUrl);
    this.activeStageMode.set(ProductDisplayMode.IMAGE);
  }

  onSelectedImageError(): void {
    const failedImage = this.selectedImageUrl();
    const displayedUrl = this.selectedImage()?.url ?? '';
    if (displayedUrl && displayedUrl !== failedImage) {
      this.failedVariantUrls.update((urls) => [...urls, displayedUrl]);
      return;
    }
    if (failedImage) {
      this.failedImages.update((images) => [...images, failedImage]);
    }
    this.selectedImageUrl.set(this.galleryImages()[0] ?? '');
  }

  onGalleryImageError(imageUrl: string): void {
    const displayedUrl =
      this.galleryViews().find((image) => image.sourceUrl === imageUrl)?.url ?? '';
    if (displayedUrl && displayedUrl !== imageUrl) {
      this.failedVariantUrls.update((urls) => [...urls, displayedUrl]);
      return;
    }
    this.failedImages.update((images) =>
      images.includes(imageUrl) ? images : [...images, imageUrl],
    );
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
    this.detailRequest?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.notFound.set(false);
    this.product.set(null);
    this.quantity.set(1);
    this.additionStatus.set(null);
    this.detailRequest = this.productService
      .getProductBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.data || response.data.isActive === false || response.data.deletedAt) {
            this.notFound.set(true);
            this.isLoading.set(false);
            return;
          }
          this.product.set(response.data);
          this.failedImages.set([]);
          this.failedVariantUrls.set([]);
          const firstImage =
            [
              response.data.image,
              ...(response.data.gallery ?? []),
              response.data.posterImage ?? '',
            ].find((image) => Boolean(image?.trim())) ?? '';
          this.selectedImageUrl.set(firstImage);
          this.activeStageMode.set(ProductDisplayMode.IMAGE);
          const currency = this.settings().defaultCurrency.trim();
          this.seoService.setProductMetadata(response.data, currency);
          this.analytics.track(AnalyticsEventName.VIEW_PRODUCT, {
            product_id: response.data.id,
            category: response.data.category,
          });
          this.isLoading.set(false);
        },
        error: (error: ApiErrorResponse) => {
          this.notFound.set(error.statusCode === 404);
          this.hasError.set(error.statusCode !== 404);
          this.seoService.setTitle('تفاصيل المنتج');
          this.seoService.setResponseStatus(error.statusCode === 404 ? 404 : 503);
          this.isLoading.set(false);
        },
      });
  }
}
