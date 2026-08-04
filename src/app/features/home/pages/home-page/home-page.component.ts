import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '@core/services/product.service';
import { SeoService } from '@core/services/seo.service';
import { CATEGORIES_DATA, VALUE_PROPS, ValueProp } from '../../home.control';
import { CategoryItem } from '@core/models/category.model';
import { AnimeHeroComponent } from '@shared/components/anime-hero/anime-hero.component';
import { CategoryCardComponent } from '@shared/components/category-card/category-card.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { SectionTitleComponent } from '@shared/components/section-title/section-title.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';

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
export class HomePageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly seoService = inject(SeoService);

  readonly categories: CategoryItem[] = CATEGORIES_DATA;
  readonly valueProps: ValueProp[] = VALUE_PROPS;
  readonly featuredProducts = this.productService.featuredProducts;
  readonly sample3dProduct = this.productService.allProducts()[0];

  ngOnInit(): void {
    this.seoService.setTitle('Home - Anime 3D Printed Models & Props');
    this.seoService.setMetaDescription('Explore 3D Otaku: premium anime-inspired 3D printed swords, daggers, cosplay props, desk models, and custom 3D printing.');
  }
}
