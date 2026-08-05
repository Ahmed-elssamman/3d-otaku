import { Component, input, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { Product } from '@core/models/product.model';
import { WhatsAppService } from '@core/services/whatsapp.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  private readonly whatsAppService = inject(WhatsAppService);

  readonly product = input.required<Product>();

  readonly whatsAppUrl = computed(() => this.whatsAppService.getProductOrderUrl(this.product()));
  readonly formattedPrice = computed(() => `$${this.product().price.toFixed(2)}`);
  readonly formattedRating = computed(() => this.product().rating.toFixed(1));
  readonly displayBadge = computed(() => {
    const badge = this.product().badge;
    return badge && badge !== ProductBadge.NONE ? badge : null;
  });
}
