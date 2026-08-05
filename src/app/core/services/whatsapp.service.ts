import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { CustomOrderRequest } from '../models/custom-order-request.model';
import { CartItem, CustomerDeliveryInfo } from '../models/cart-item.model';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private adminSettingsService = inject(AdminSettingsService);

  private getFormattedNumber(): string {
    const settings = this.adminSettingsService.getSettings();
    const rawNumber = settings.whatsappNumber || '+201112961724';
    return rawNumber.replace(/[^0-9]/g, '');
  }

  getProductOrderUrl(product: Product): string {
    const settings = this.adminSettingsService.getSettings();
    const targetNumber = this.getFormattedNumber();
    const productId = product.id || product._id || product.slug || 'N/A';
    const text = `${settings.whatsappDefaultMessage || 'Hello 3D Otaku, I want to order this product:'}\n` +
      `Product ID: ${productId}\n` +
      `Product Name: ${product.name}\n` +
      `Category: ${product.category}\n` +
      `Price: ${product.price} EGP\n` +
      `Slug: ${product.slug}`;
    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
  }

  getCustomOrderUrl(request: CustomOrderRequest): string {
    const settings = this.adminSettingsService.getSettings();
    const targetNumber = this.getFormattedNumber();
    const text = `${settings.whatsappDefaultMessage || 'Hello 3D Otaku, custom order request:'}\n` +
      `Name: ${request.fullName}\n` +
      `Email: ${request.email}\n` +
      `Product Type: ${request.productType}\n` +
      `Dimensions: ${request.dimensions}\n` +
      `Color/Finish: ${request.colorFinish}\n` +
      `Details: ${request.details}\n` +
      (request.referenceUrl ? `Reference: ${request.referenceUrl}\n` : '');
    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
  }

  getCartCheckoutUrl(
    items: CartItem[],
    customer: CustomerDeliveryInfo,
    subtotal: number,
    deliveryFee: number,
    total: number,
    deliveryDays: string,
    existingOrderId?: string
  ): string {
    const targetNumber = this.getFormattedNumber();
    const orderId = existingOrderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000));

    let itemsListText = '';
    items.forEach((item, index) => {
      const price = item.product.price || 0;
      const lineTotal = price * item.quantity;
      const productId = item.product.id || item.product._id || item.product.slug || 'N/A';
      itemsListText += `${index + 1}. *${item.product.name}*\n` +
        `   • Product ID: ${productId}\n` +
        `   • Quantity: ${item.quantity}\n` +
        `   • Unit Price: ${price.toLocaleString()} EGP\n` +
        `   • Line Total: ${lineTotal.toLocaleString()} EGP\n\n`;
    });

    const message = `Hello 3D OTAKU 👋\n` +
      `I would like to place the following order 🛒:\n\n` +
      `🆔 *Order ID:* #${orderId}\n` +
      `📅 *Date:* ${new Date().toLocaleDateString('en-US')}\n\n` +
      `📦 *Order Items Summary:*\n` +
      `${itemsListText}` +
      `--------------------------------\n` +
      `💵 *Subtotal:* ${subtotal.toLocaleString()} EGP\n` +
      `🚚 *Delivery Fee:* ${deliveryFee.toLocaleString()} EGP\n` +
      `⏱️ *Estimated Delivery Time:* ${deliveryDays || '3 - 5 Business Days'}\n` +
      `💰 *Grand Total:* ${total.toLocaleString()} EGP\n` +
      `--------------------------------\n\n` +
      `👤 *Customer & Delivery Details:*\n` +
      `• *Full Name:* ${customer.fullName}\n` +
      `• *Primary Phone:* ${customer.phone}\n` +
      (customer.secondaryPhone ? `• *Alternative Phone:* ${customer.secondaryPhone}\n` : '') +
      `• *Governorate / City:* ${customer.governorate}\n` +
      `• *Detailed Address:* ${customer.address}\n` +
      (customer.notes ? `• *Order Notes:* ${customer.notes}\n` : '') +
      `\nPlease confirm order #${orderId} and start processing. Thank you! 🔥`;

    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
  }
}
