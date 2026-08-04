import { Injectable } from '@angular/core';
import { APP_CONSTANTS } from '../constants/app.constants';
import { Product } from '../models/product.model';
import { CustomOrderRequest } from '../models/custom-order-request.model';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private readonly whatsappNumber = APP_CONSTANTS.WHATSAPP_NUMBER;

  getProductOrderUrl(product: Product): string {
    const text = `Hello 3D Otaku, I want to order this product:\n` +
      `Product: ${product.name}\n` +
      `Category: ${product.category}\n` +
      `Price: $${product.price.toFixed(2)}\n` +
      `Slug: ${product.slug}\n` +
      `Can you send me more details?`;
    return `https://wa.me/${this.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  }

  getCustomOrderUrl(request: CustomOrderRequest): string {
    const text = `Hello 3D Otaku, I would like to place a custom 3D order request!\n` +
      `Name: ${request.fullName}\n` +
      `Email: ${request.email}\n` +
      `Product Type: ${request.productType}\n` +
      `Dimensions: ${request.dimensions}\n` +
      `Color/Finish: ${request.colorFinish}\n` +
      `Details: ${request.details}\n` +
      (request.referenceUrl ? `Reference: ${request.referenceUrl}\n` : '');
    return `https://wa.me/${this.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  }
}
