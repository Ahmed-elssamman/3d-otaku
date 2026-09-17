import { Injectable, inject } from '@angular/core';
import { SITE_ORIGIN } from '../api/site-origin.token';
import { Product } from '../models/product.model';
import { CustomOrderRequest } from '../models/custom-order-request.model';
import { Order } from '../models/order.model';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';
import { environment } from '../../../environments/environment';
import { normalizeEgyptMobile } from '../utils/egypt-phone.util';
import {
  buildCustomRequestMessage,
  buildOrderSupportMessage,
} from '../utils/whatsapp-message.util';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private siteOrigin = inject(SITE_ORIGIN);
  private adminSettingsService = inject(AdminSettingsService);

  getProductOrderUrl(product: Product): string {
    const settings = this.adminSettingsService.getSettings();
    const price =
      product.discountPrice !== null &&
      typeof product.discountPrice === 'number' &&
      product.discountPrice < product.price
        ? product.discountPrice
        : product.price;
    const currency = settings.defaultCurrency.trim();
    const priceText = currency ? `${price} ${currency}` : `${price}`;
    return this.buildUrl(
      [
        settings.whatsappDefaultMessage || 'أهلًا، عندي استفسار عن المنتج ده.',
        `المنتج: ${product.name}`,
        `السعر المعروض: ${priceText}`,
        `صفحة المنتج: ${this.siteOrigin}/products/${encodeURIComponent(product.slug)}`,
      ].join('\n'),
    );
  }

  getCustomOrderUrl(request: CustomOrderRequest, requestNumber: string = ''): string {
    return this.buildUrl(buildCustomRequestMessage(request, requestNumber));
  }

  getOrderSupportUrl(order: Order, statusLabel: string): string {
    return this.buildUrl(buildOrderSupportMessage(order, statusLabel));
  }

  getCheckoutContinuationUrl(orderNumber: string): string {
    return this.buildUrl(`أهلًا، سجلت الطلب رقم ${orderNumber} وعاوز أتأكد من الخطوات الجاية.`);
  }

  getDirectChatUrl(): string {
    return this.buildUrl('أهلًا، عندي استفسار عن الطباعة والمنتجات.');
  }

  private buildUrl(message: string): string {
    const number = this.getFormattedNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : '';
  }

  private getFormattedNumber(): string {
    const settings = this.adminSettingsService.getSettings();
    const configuredNumber =
      settings.whatsappNumber?.trim() || environment.whatsAppNumber?.trim() || '';
    return normalizeEgyptMobile(configuredNumber).replace(/^\+/, '');
  }
}
