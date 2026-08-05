import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { CustomOrderRequest } from '../models/custom-order-request.model';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private adminSettingsService = inject(AdminSettingsService);

  getProductOrderUrl(product: Product): string {
    const settings = this.adminSettingsService.getSettings();
    const text = `${settings.whatsappDefaultMessage}\n` +
      `Product: ${product.name}\n` +
      `Category: ${product.category}\n` +
      `Price: ${product.price} EGP\n` +
      `Slug: ${product.slug}\n` +
      `Can you send me more details?`;
    return `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  }

  getCustomOrderUrl(request: CustomOrderRequest): string {
    const settings = this.adminSettingsService.getSettings();
    const text = `${settings.whatsappDefaultMessage}\n` +
      `Name: ${request.fullName}\n` +
      `Email: ${request.email}\n` +
      `Product Type: ${request.productType}\n` +
      `Dimensions: ${request.dimensions}\n` +
      `Color/Finish: ${request.colorFinish}\n` +
      `Details: ${request.details}\n` +
      (request.referenceUrl ? `Reference: ${request.referenceUrl}\n` : '');
    return `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  }
}
