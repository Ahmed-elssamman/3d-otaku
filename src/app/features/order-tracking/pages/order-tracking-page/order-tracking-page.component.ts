import { DatePipe, DecimalPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, distinctUntilChanged, finalize, fromEvent } from 'rxjs';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { GuestOrderTrackingCredentials } from '@core/models/guest-order-tracking.model';
import { Order } from '@core/models/order.model';
import { OrderService } from '@core/services/order.service';
import { SeoService } from '@core/services/seo.service';
import {
  createGuestOrderTrackingUrl,
  parseGuestOrderTrackingFragment,
} from '@core/utils/guest-order-tracking.util';
import { OrderItemConfigurationComponent } from '@shared/components/order-item-configuration/order-item-configuration.component';
import { OrderPaymentSummaryComponent } from '@shared/components/order-payment-summary/order-payment-summary.component';
import { PrivateOrderLinkComponent } from '@shared/components/private-order-link/private-order-link.component';
import { orderHistoryViews } from '../../../orders/order-history.util';
import {
  ORDER_HISTORY_TEXT,
  ORDER_STATUS_PRESENTATIONS,
  UNRECOGNIZED_ORDER_STATUS,
} from '../../../orders/orders.control';
import { OrderTrackingState } from './order-tracking-page.enum';
import {
  ORDER_TRACKING_CONTENT_ANCHOR,
  ORDER_TRACKING_TEXT,
  isUsableTrackedOrder,
  trackingErrorMessage,
} from './order-tracking-page.control';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    OrderItemConfigurationComponent,
    OrderPaymentSummaryComponent,
    PrivateOrderLinkComponent,
  ],
  templateUrl: './order-tracking-page.component.html',
  styleUrl: './order-tracking-page.component.scss',
})
export class OrderTrackingPageComponent implements OnInit {
  private orders = inject(OrderService);
  private seo = inject(SeoService);
  private meta = inject(Meta);
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private credentials = signal<GuestOrderTrackingCredentials | null>(null);
  private clientReady = signal(false);
  private lastFragment = signal<string | null>(null);
  private requestId = signal(0);
  private requestSubscription: Subscription | null = null;

  text = ORDER_TRACKING_TEXT;
  states = OrderTrackingState;
  state = signal(OrderTrackingState.Initializing);
  order = signal<Order | null>(null);
  error = signal('');
  isLoading = computed(() => this.state() === OrderTrackingState.Loading);
  canRetry = computed(() => this.credentials() !== null && !this.isLoading());
  historyText = ORDER_HISTORY_TEXT;
  history = computed(() => orderHistoryViews(this.order()?.statusHistory ?? []));
  status = computed(() => {
    const order = this.order();
    return order && Object.hasOwn(ORDER_STATUS_PRESENTATIONS, order.status)
      ? ORDER_STATUS_PRESENTATIONS[order.status]
      : UNRECOGNIZED_ORDER_STATUS;
  });
  totalLabel = computed(() =>
    this.order()?.deliveryFeeConfirmed ? this.text.confirmedTotal : this.text.provisionalTotal,
  );
  private savedCredentials = computed(() => {
    if (!this.clientReady()) return null;
    const receipt = this.orders.receipt();
    if (!receipt) return null;
    const url = createGuestOrderTrackingUrl(receipt, this.document.location.origin);
    return url ? parseGuestOrderTrackingFragment(new URL(url).hash) : null;
  });
  canShowSaved = computed(
    () => this.state() === OrderTrackingState.Missing && this.savedCredentials() !== null,
  );

  ngOnInit(): void {
    this.seo.setTitle(this.text.title);
    this.seo.setMetaDescription(this.text.description);
    this.meta.updateTag({ name: 'robots', content: this.text.robots });
    afterNextRender(
      () => {
        if (!isPlatformBrowser(this.platformId)) return;
        this.clientReady.set(true);
        let initial = true;
        this.route.fragment
          .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
          .subscribe((fragment) => {
            const incoming = initial
              ? this.document.location.hash || fragment || ''
              : fragment || '';
            initial = false;
            this.captureFragment(incoming);
          });
        const browser = this.document.defaultView;
        if (browser) {
          fromEvent<HashChangeEvent>(browser, 'hashchange')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((event) => {
              // Covers a native same-fragment navigation that Angular may skip.
              if (this.document.location.hash && this.document.location.href === event.newURL)
                this.captureFragment(new URL(event.newURL).hash);
            });
        }
      },
      { injector: this.injector },
    );
  }

  retry(): void {
    const credentials = this.credentials();
    if (credentials && this.canRetry()) this.loadOrder(credentials);
  }

  showSavedOrder(): void {
    const credentials = this.savedCredentials();
    if (!this.canShowSaved() || !credentials) return;
    this.credentials.set(credentials);
    this.loadOrder(credentials);
  }

  private captureFragment(fragment: string): void {
    const normalized = fragment.replace(/^#/, '');
    if (normalized === ORDER_TRACKING_CONTENT_ANCHOR) {
      if (this.state() === OrderTrackingState.Initializing)
        this.state.set(OrderTrackingState.Missing);
      return;
    }
    const browser = this.document.defaultView;
    try {
      browser?.history.replaceState(
        browser.history.state,
        '',
        `${this.document.location.pathname}${this.document.location.search}`,
      );
    } catch {
      this.cancelRequest();
      this.credentials.set(null);
      this.order.set(null);
      this.state.set(OrderTrackingState.Invalid);
      return;
    }
    if (this.lastFragment() === normalized) return;
    this.lastFragment.set(normalized);
    this.cancelRequest();
    this.order.set(null);
    this.error.set('');
    const credentials = parseGuestOrderTrackingFragment(normalized);
    this.credentials.set(credentials);
    if (!credentials) {
      this.state.set(normalized ? OrderTrackingState.Invalid : OrderTrackingState.Missing);
      return;
    }
    this.loadOrder(credentials);
  }

  private cancelRequest(): void {
    this.requestId.update((id) => id + 1);
    this.requestSubscription?.unsubscribe();
    this.requestSubscription = null;
  }

  private loadOrder(credentials: GuestOrderTrackingCredentials): void {
    this.cancelRequest();
    const requestId = this.requestId();
    this.order.set(null);
    this.state.set(OrderTrackingState.Loading);
    this.error.set('');
    this.requestSubscription = this.orders
      .trackOrder(credentials.orderNumber, credentials.trackingToken)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.requestId() && this.state() === OrderTrackingState.Loading)
            this.state.set(OrderTrackingState.Error);
        }),
      )
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId()) return;
          if (!response.success || !isUsableTrackedOrder(response.data, credentials.orderNumber)) {
            this.order.set(null);
            this.error.set(this.text.unsafeResponse);
            this.state.set(OrderTrackingState.Error);
            return;
          }
          this.order.set(response.data);
          this.state.set(OrderTrackingState.Ready);
          this.focusReceipt();
        },
        error: (error: ApiErrorResponse) => {
          if (requestId !== this.requestId()) return;
          this.error.set(trackingErrorMessage(error));
          this.state.set(OrderTrackingState.Error);
        },
      });
  }

  private focusReceipt(): void {
    afterNextRender(
      () => this.element.nativeElement.querySelector<HTMLElement>('#tracked-order-title')?.focus(),
      { injector: this.injector },
    );
  }
}
