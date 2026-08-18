import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { Product } from '@core/models/product.model';
import { Category } from '@core/models/category.model';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import {
  CUSTOM_ORDER_STEPS,
  HOME_FAQ_ITEMS,
  HOME_HERO_FALLBACK_IMAGE,
  HOME_HERO_FALLBACK_SRCSET,
  HOME_HERO_SUBTITLE,
  HOME_HERO_TITLE,
  MADE_TO_ORDER_STEPS,
  QUALITY_POINTS,
  SHOP_INTENT_ITEMS
} from '../../home.control';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, OtakuLoaderComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private settingsService = inject(AdminSettingsService);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);

  featuredProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  isLoading = signal<boolean>(true);
  featuredError = signal<boolean>(false);
  heroImageFailed = signal<boolean>(false);
  settings = this.settingsService.settings;
  heroTitle = HOME_HERO_TITLE;
  heroSubtitle = HOME_HERO_SUBTITLE;
  heroImage = computed(() => this.settings().heroImageUrl?.trim() && !this.heroImageFailed() ? this.settings().heroImageUrl.trim() : HOME_HERO_FALLBACK_IMAGE);
  heroSrcset = computed(() => this.settings().heroImageUrl?.trim() && !this.heroImageFailed() ? '' : HOME_HERO_FALLBACK_SRCSET);
  shopIntentItems = SHOP_INTENT_ITEMS;
  madeToOrderSteps = MADE_TO_ORDER_STEPS;
  customOrderSteps = CUSTOM_ORDER_STEPS;
  qualityPoints = QUALITY_POINTS;
  faqItems = HOME_FAQ_ITEMS;

  ngOnInit(): void {
    this.seoService.setTitle('Anime-inspired 3D printed models');
    this.seoService.setMetaDescription('Browse available 3D printed products and prices, or send a custom design for feasibility review.');
    this.analytics.track(AnalyticsEventName.VIEW_HOME);
    this.loadFeaturedProducts();
    this.loadCategories();
  }

  onHeroImageError(): void {
    this.heroImageFailed.set(true);
  }

  private loadFeaturedProducts(): void {
    this.productService.getFeaturedProducts(6)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.featuredProducts.set(response.data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.featuredError.set(true);
          this.isLoading.set(false);
        }
      });
  }

  private loadCategories(): void {
    this.productService.getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => this.categories.set((response.data ?? []).filter(category => category.productsCount > 0)),
        error: () => this.categories.set([])
      });
  }
}
