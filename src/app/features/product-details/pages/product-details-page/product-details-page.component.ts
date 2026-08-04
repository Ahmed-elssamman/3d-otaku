import { Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '@core/services/product.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SeoService } from '@core/services/seo.service';
import { Product } from '@core/models/product.model';
import { PRODUCT_SPECS_CONFIG, SAFETY_NOTE_TEXT, ProductSpecItem } from '../../product-details.control';
import { Product3dViewerComponent } from '@shared/components/product-3d-viewer/product-3d-viewer.component';
import { OtakuLoaderComponent } from '@shared/components/otaku-loader/otaku-loader.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';

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

  readonly slug = input.required<string>();

  readonly product = signal<Product | null>(null);
  readonly specsConfig: ProductSpecItem[] = PRODUCT_SPECS_CONFIG;
  readonly safetyNote = SAFETY_NOTE_TEXT;

  readonly whatsAppUrl = computed(() => {
    const prod = this.product();
    return prod ? this.whatsAppService.getProductOrderUrl(prod) : '#';
  });

  readonly formattedPrice = computed(() => {
    const prod = this.product();
    return prod ? `$${prod.price.toFixed(2)}` : '$0.00';
  });

  readonly relatedProducts = computed(() => {
    const prod = this.product();
    if (!prod) return [];
    return this.productService.allProducts()
      .filter(p => p.id !== prod.id && p.category === prod.category)
      .slice(0, 3);
  });

  ngOnInit(): void {
    const found = this.productService.getProductBySlug(this.slug());
    if (found) {
      this.product.set(found);
      this.seoService.setTitle(`${found.name} - 3D Anime Model`);
      this.seoService.setMetaDescription(`${found.name} (${found.category}). ${found.description}`);
    } else {
      this.router.navigate(['/not-found']);
    }
  }
}
