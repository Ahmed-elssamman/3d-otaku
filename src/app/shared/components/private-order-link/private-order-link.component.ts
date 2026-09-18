import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Order } from '@core/models/order.model';
import { createGuestOrderTrackingUrl } from '@core/utils/guest-order-tracking.util';
import { PRIVATE_ORDER_LINK_TEXT } from './private-order-link.control';

@Component({
  selector: 'app-private-order-link',
  standalone: true,
  imports: [],
  templateUrl: './private-order-link.component.html',
  styleUrl: './private-order-link.component.scss',
})
export class PrivateOrderLinkComponent {
  private document = inject(DOCUMENT);
  private copiedLink = signal('');
  private failedLink = signal('');
  private copyingLink = signal('');
  order = input.required<Order>();
  text = PRIVATE_ORDER_LINK_TEXT;
  link = computed(() => createGuestOrderTrackingUrl(this.order(), this.document.location.origin));
  isCopying = computed(() => !!this.link() && this.copyingLink() === this.link());
  isCopied = computed(() => !!this.link() && this.copiedLink() === this.link());
  manualLink = computed(() => (this.failedLink() === this.link() ? this.link() : ''));

  async copyLink(): Promise<void> {
    const link = this.link();
    if (!link || this.isCopying()) return;
    this.copyingLink.set(link);
    try {
      await navigator.clipboard.writeText(link);
      if (this.link() === link) {
        this.copiedLink.set(link);
        this.failedLink.set('');
      }
    } catch {
      if (this.link() === link) this.failedLink.set(link);
    } finally {
      if (this.copyingLink() === link) this.copyingLink.set('');
    }
  }

  selectLink(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) event.target.select();
  }
}
