import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { CATEGORIES_DATA, VALUE_PROPS, ValueProp } from '../../home.control';
import { CategoryItem } from '@core/models/category.model';
import { Product } from '@core/models/product.model';
import { AnimeHeroComponent } from '@shared/components/anime-hero/anime-hero.component';
import { CategoryCardComponent } from '@shared/components/category-card/category-card.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { SectionTitleComponent } from '@shared/components/section-title/section-title.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';

export interface AnimeLegendItem {
  id: string;
  name: string;
  title: string;
  anime: string;
  image: string;
  badge: string;
  slug: string;
  glowColor: string;
  accentColor: string;
  quote: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    RouterLink,
    AnimeHeroComponent,
    CategoryCardComponent,
    ProductCardComponent,
    SectionTitleComponent,
    OtakuLoaderComponent,
    GlowButtonComponent,
    Product3dViewerComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly seoService = inject(SeoService);

  readonly categories: CategoryItem[] = CATEGORIES_DATA;
  readonly valueProps: ValueProp[] = VALUE_PROPS;
  readonly featuredProducts = signal<Product[]>([]);
  readonly sample3dProduct = signal<Product | null>(null);
  readonly selectedIconicIndex = signal<number>(0);
  readonly currentLegendIndex = signal<number>(0);
  readonly isLoading = signal<boolean>(true);

  private autoPlayTimer?: any;

  readonly animeLegends: AnimeLegendItem[] = [
    {
      id: 'legend-tanjiro',
      name: 'Tanjiro Kamado',
      title: 'Sun Breathing Hinokami Katana',
      anime: 'Demon Slayer',
      image: 'assets/anime/tanjiro-kamado-3840x2160-18718.jpg',
      badge: 'Hinokami Kagura',
      slug: 'tanjiro-sun-breathing-katana',
      glowColor: 'from-pink-600/40 via-orange-600/30 to-purple-950/90',
      accentColor: 'border-pink-500',
      quote: 'Keep your heart burning. No matter how weak or unworthy you feel.'
    },
    {
      id: 'legend-rengoku',
      name: 'Kyojuro Rengoku',
      title: 'Flame Hashira Blade',
      anime: 'Demon Slayer',
      image: 'assets/anime/kyojuro-rengoku-3840x2160-18695.jpg',
      badge: 'Set Your Heart Ablaze',
      slug: 'rengoku-flame-katana-prop',
      glowColor: 'from-orange-600/40 via-red-600/30 to-amber-950/90',
      accentColor: 'border-orange-500',
      quote: 'Set your heart ablaze. Go beyond your limits!'
    },
    {
      id: 'legend-naruto',
      name: 'Naruto Uzumaki',
      title: 'Flying Raijin Kunai',
      anime: 'Naruto Shippuden',
      image: 'assets/anime/boruto-naruto-uzumaki-dark-background-5k-3840x2160-7387.png',
      badge: 'Yellow Flash',
      slug: 'minato-flying-raijin-kunai',
      glowColor: 'from-cyan-600/40 via-blue-600/30 to-indigo-950/90',
      accentColor: 'border-cyan-500',
      quote: 'I never go back on my word. That is my ninja way!'
    },
    {
      id: 'legend-guts',
      name: 'Guts',
      title: 'Dragon Slayer Greatsword',
      anime: 'Berserk',
      image: 'assets/anime/berserk-knight-guts-3840x2160-18713.jpg',
      badge: 'Berserk Armor',
      slug: 'guts-dragon-slayer-greatsword',
      glowColor: 'from-purple-600/40 via-rose-600/30 to-neutral-950/90',
      accentColor: 'border-purple-500',
      quote: 'In this world, is the destiny of mankind controlled by some transcendental entity?'
    }
  ];

  readonly activeLegend = computed<AnimeLegendItem>(
    () => this.animeLegends[this.currentLegendIndex()]
  );

  ngOnInit(): void {
    this.seoService.setTitle('3D Otaku - World\'s #1 Anime 3D Printed Armory');
    this.seoService.setMetaDescription('Explore Tanjiro, Rengoku, Naruto, and Guts 3D printed anime props with real-time 3D preview engine.');

    this.productService.getFeaturedProducts(6).subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
          this.featuredProducts.set(res.data);
          this.sample3dProduct.set(res.data[0]);
        } else {
          this.featuredProducts.set(this.productService.featuredProducts());
          this.sample3dProduct.set(this.productService.allProducts()[0] || null);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.featuredProducts.set(this.productService.featuredProducts());
        this.sample3dProduct.set(this.productService.allProducts()[0] || null);
        this.isLoading.set(false);
      }
    });

    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  nextLegend(): void {
    this.currentLegendIndex.update(idx => (idx + 1) % this.animeLegends.length);
  }

  prevLegend(): void {
    this.currentLegendIndex.update(
      idx => (idx - 1 + this.animeLegends.length) % this.animeLegends.length
    );
  }

  setLegend(index: number): void {
    this.currentLegendIndex.set(index);
    this.startAutoPlay();
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => {
      this.nextLegend();
    }, 5000);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }
  }

  selectIconicProp(index: number): void {
    this.selectedIconicIndex.set(index);
    const list = this.featuredProducts();
    if (list.length > index) {
      this.sample3dProduct.set(list[index]);
    }
  }
}
