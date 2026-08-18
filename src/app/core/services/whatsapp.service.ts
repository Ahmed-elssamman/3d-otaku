import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { CustomOrderRequest } from '../models/custom-order-request.model';
import { Order } from '../models/order.model';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';
import { environment } from '../../../environments/environment';
import { buildCustomRequestMessage, buildOrderSupportMessage } from '../utils/whatsapp-message.util';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private adminSettingsService = inject(AdminSettingsService);

  getProductOrderUrl(product: Product): string {
    const settings = this.adminSettingsService.getSettings();
    const price = product.discountPrice !== null && typeof product.discountPrice === 'number' && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;
    const currency = settings.defaultCurrency.trim();
    const priceText = currency ? `${price} ${currency}` : `${price}`;
    return this.buildUrl([
      settings.whatsappDefaultMessage || 'Hello 3D Otaku, I would like to ask about this product.',
      `Product: ${product.name}`,
      `Price shown: ${priceText}`,
      `Product page: ${window.location.origin}/products/${encodeURIComponent(product.slug)}`
    ].join('\n'));
  }

  getCustomOrderUrl(request: CustomOrderRequest, requestNumber: string = ''): string {
    return this.buildUrl(buildCustomRequestMessage(request, requestNumber));
  }

  getOrderSupportUrl(order: Order): string {
    return this.buildUrl(buildOrderSupportMessage(order));
  }

  getCheckoutContinuationUrl(orderNumber: string): string {
    return this.buildUrl(`Hello, I created order ${orderNumber}. I would like to confirm the next steps.`);
  }

  getDirectChatUrl(): string {
    return this.buildUrl('Hello 3D Otaku, I would like to ask a question.');
  }

  private buildUrl(message: string): string {
    const number = this.getFormattedNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : '';
  }

  private getFormattedNumber(): string {
    const settings = this.adminSettingsService.getSettings();
    const configuredNumber = settings.whatsappNumber?.trim() || environment.whatsAppNumber?.trim() || '';
    return configuredNumber.replace(/[^0-9]/g, '');
  }
}
