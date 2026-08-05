import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HERO_STATS, HeroStat } from './anime-hero.control';
import { GlowButtonComponent } from '../glow-button/glow-button.component';
import { ProductService } from '@core/services/product.service';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';

@Component({
  selector: 'app-anime-hero',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, GlowButtonComponent],
  templateUrl: './anime-hero.component.html',
  styleUrl: './anime-hero.component.scss'
})
export class AnimeHeroComponent {
  private productService = inject(ProductService);
  private adminSettingsService = inject(AdminSettingsService);

  readonly stats: HeroStat[] = HERO_STATS;
  readonly settings = this.adminSettingsService.settings;
  readonly spotlightProduct = computed(() => this.productService.allProducts()[0] ?? null);
  readonly spotlightProductName = computed(() => this.spotlightProduct()?.name ?? this.settings().brandName);
  readonly spotlightProductRoute = computed(() => {
    const product = this.spotlightProduct();
    return product ? ['/products', product.slug] : ['/products'];
  });
}
