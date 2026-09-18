import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { Product } from '@core/models/product.model';
import { Category } from '@core/models/category.model';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { CATEGORY_PRESENTATION } from '@shared/components/product-card/product-card.control';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import {
  HOME_FAQ_ITEMS,
  HOME_HERO_FALLBACK_IMAGE,
  HOME_HERO_SUBTITLE,
  HOME_HERO_TITLE,
  MADE_TO_ORDER_STEPS,
} from '../../home.control';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private destroyRef = inject(DestroyRef);
  private analytics = inject(AnalyticsService);
  featuredProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  isLoading = signal(true);
  featuredError = signal(false);
  heroTitle = HOME_HERO_TITLE;
  heroSubtitle = HOME_HERO_SUBTITLE;
  heroImage = HOME_HERO_FALLBACK_IMAGE;
  madeToOrderSteps = MADE_TO_ORDER_STEPS;
  faqItems = HOME_FAQ_ITEMS;
  categoryViews = computed(() =>
    this.categories().map((category) => {
      const presentation = CATEGORY_PRESENTATION.find((item) => item.value === category.name);
      return {
        ...category,
        label: presentation?.label ?? category.name,
        icon: presentation?.icon ?? 'pi pi-box',
        query: { category: category.name },
      };
    }),
  );

  ngOnInit(): void {
    this.seoService.setTitle('مجسمات وهدايا مطبوعة 3D في مصر');
    this.seoService.setMetaDescription(
      'اكتشف مجسمات وإكسسوارات مكتب وهدايا مطبوعة بتقنية 3D. تفاصيل واضحة وأسعار بالجنيه المصري، وطلبات طباعة مخصصة داخل مصر.',
    );
    this.analytics.track(AnalyticsEventName.VIEW_HOME);
    this.loadFeaturedProducts();
    this.productService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.categories.set(response.data.filter((category) => category.productsCount > 0)),
        error: () => this.categories.set([]),
      });
  }

  retryProducts(): void {
    this.loadFeaturedProducts();
  }

  private loadFeaturedProducts(): void {
    this.isLoading.set(true);
    this.featuredError.set(false);
    this.productService
      .getFeaturedProducts(6)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.featuredProducts.set(response.data ?? []);
          this.seoService.setResponseStatus(200);
        },
        error: () => {
          this.featuredError.set(true);
          this.seoService.setResponseStatus(503);
        },
      });
  }
}
