import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { MAX_CART_QUANTITY, ORDER_STORAGE_KEYS } from '@core/constants/order.constants';
import { CartItem, CustomerDeliveryInfo } from '@core/models/cart-item.model';
import { ApiErrorResponse, ApiResponse } from '@core/models/api-response.model';
import { CheckoutQuote, CreateOrderPayload, Order } from '@core/models/order.model';
import { CartService } from '@core/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import { AuthService } from '@core/services/auth.service';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';
import { getSalePrice } from '@core/utils/product-display.util';
import { checkoutPiastres } from '@core/utils/checkout-quote.util';
import { CheckoutQuoteVersion } from '@core/enums/checkout-quote-version.enum';
import {
  normalizeConfigurationFingerprint,
  productConfiguration,
} from '@core/utils/product-configuration.util';
import {
  configurationChanges,
  configurationDisplayRows,
} from '@core/utils/product-configuration-display.util';
import { OrderItemConfigurationComponent } from '@shared/components/order-item-configuration/order-item-configuration.component';
import { ProductConfiguration } from '@core/models/product-configuration.model';
import { OrderPaymentSummaryComponent } from '@shared/components/order-payment-summary/order-payment-summary.component';
import { PrivateOrderLinkComponent } from '@shared/components/private-order-link/private-order-link.component';
import { ProductSpecField } from '@core/enums/product-spec-field.enum';
import {
  formatProductCardSize,
  formatProductSpecValue,
} from '@core/utils/product-spec-display.util';
import {
  ORDER_STATUS_PRESENTATIONS,
  ORDER_HISTORY_TEXT,
  UNRECOGNIZED_ORDER_STATUS,
} from '../../../orders/orders.control';
import { orderHistoryViews } from '../../../orders/order-history.util';
import {
  DeliveryDraft,
  StoredDeliveryDraft,
  CartReceiptView,
  CheckoutFocusTarget,
  PendingCheckoutSummary,
  EGYPT_GOVERNORATES,
  EMPTY_DELIVERY_DRAFT,
  CHECKOUT_ERROR_TEXT,
  CHECKOUT_REVIEW_TEXT,
  CheckoutPricingSnapshot,
  CheckoutPriceReview,
  createDeliveryForm,
} from './cart-page.control';

export interface CartViewItem {
  id: string;
  item: CartItem;
  unitPrice: number;
  lineTotal: number;
  canIncrease: boolean;
  productDetails: string;
  configuration: ProductConfiguration | null;
  error: string;
}

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    OrderPaymentSummaryComponent,
    OrderItemConfigurationComponent,
    PrivateOrderLinkComponent,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent implements OnInit {
  private whatsAppService = inject(WhatsAppService);
  private orderService = inject(OrderService);
  private adminSettingsService = inject(AdminSettingsService);
  private seoService = inject(SeoService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private analytics = inject(AnalyticsService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private cartService = inject(CartService);

  isSubmittingOrder = signal(false);
  isQuoting = signal(false);
  checkoutBusy = computed(() => this.isSubmittingOrder() || this.isQuoting());
  pricingReview = signal<CheckoutPriceReview | null>(null);
  itemErrors = signal<Record<string, string>>({});
  checkoutReviewText = CHECKOUT_REVIEW_TEXT;
  isRefreshingReceipt = signal(false);
  submitError = signal('');
  receiptError = signal('');
  copiedOrderNumber = signal(false);
  attemptedSubmit = signal(false);
  receiptRetainsCheckout = signal(false);
  private receiptView = signal(CartReceiptView.AUTOMATIC);
  items = this.cartService.items;
  itemCount = this.cartService.itemCount;
  subtotal = this.cartService.subtotal;
  settings = this.adminSettingsService.settings;
  isAuthenticated = this.authService.isAuthenticated;
  governorates = EGYPT_GOVERNORATES;
  receipt = this.orderService.receipt;
  historyText = ORDER_HISTORY_TEXT;
  receiptHistory = computed(() => orderHistoryViews(this.receipt()?.statusHistory ?? []));
  canRetryPendingSubmission = this.orderService.canRetryPendingSubmission;
  requiresFreshQuoteReview = this.orderService.requiresFreshQuoteReview;
  canShowSavedReceipt = computed(
    () => this.receipt() !== null && !this.orderService.hasPendingSubmission(),
  );
  pendingCheckout = computed<PendingCheckoutSummary | null>(() => {
    const request = this.orderService.pendingRequest();
    return request
      ? {
          fullName: request.customer.fullName,
          address: [request.customer.governorate, request.customer.city, request.customer.address]
            .filter(Boolean)
            .join('، '),
          itemCount: request.items.reduce((total, item) => total + item.quantity, 0),
        }
      : null;
  });
  showReceipt = computed(
    () =>
      this.receipt() !== null &&
      this.receiptView() !== CartReceiptView.CART &&
      (this.receiptView() === CartReceiptView.RECEIPT ||
        (this.items().length === 0 && !this.orderService.hasPendingSubmission())),
  );
  receiptStatus = computed(() => {
    const order = this.receipt();
    return order
      ? (ORDER_STATUS_PRESENTATIONS[order.status] ?? UNRECOGNIZED_ORDER_STATUS)
      : UNRECOGNIZED_ORDER_STATUS;
  });
  receiptSupportUrl = computed(() => {
    const order = this.receipt();
    return order ? this.whatsAppService.getCheckoutContinuationUrl(order.orderNumber) : '';
  });
  deliveryFee = computed(() => {
    const fee = this.settings().deliveryFee;
    return typeof fee === 'number' && Number.isFinite(fee) && fee >= 0 ? fee : null;
  });
  totalEstimate = computed(
    () =>
      ((checkoutPiastres(this.subtotal()) ?? 0) +
        (checkoutPiastres(this.deliveryFee() ?? 0) ?? 0)) /
      100,
  );
  whatsappSupportUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  itemViews = computed<CartViewItem[]>(() =>
    this.items().map((item) => {
      const unitPrice = getSalePrice(item.product.price, item.product.discountPrice ?? null);
      return {
        id: item.product.id || item.product._id || item.product.slug,
        item,
        unitPrice,
        lineTotal: ((checkoutPiastres(unitPrice) ?? 0) * item.quantity) / 100,
        canIncrease: item.quantity < MAX_CART_QUANTITY,
        error: this.itemErrors()[item.product.id || item.product._id || item.product.slug] || '',
        configuration: productConfiguration(item.product),
        productDetails: [
          formatProductSpecValue(ProductSpecField.MATERIAL, item.product.material ?? ''),
          formatProductCardSize(item.product.size ?? ''),
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }),
  );

  deliveryForm = createDeliveryForm(this.formBuilder);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (
        !user ||
        this.orderService.hasPendingSubmission() ||
        this.showReceipt() ||
        this.receiptRetainsCheckout()
      )
        return;
      const { fullName, email } = this.deliveryForm.controls;
      if (fullName.pristine && !fullName.value.trim()) fullName.setValue(user.fullName);
      if (email.pristine && !email.value.trim()) email.setValue(user.email);
    });
    effect(() => {
      const review = this.pricingReview();
      this.items();
      if (
        review &&
        (!this.matchesCurrentDetails(review.payload) ||
          !this.matchesDisplayedPricing(review.previous))
      ) {
        this.pricingReview.set(null);
        this.submitError.set(CHECKOUT_REVIEW_TEXT.refreshNeeded);
      }
    });
  }

  ngOnInit(): void {
    this.cartService.initialize();
    this.seoService.setTitle('سلة المشتريات وإتمام الطلب');
    this.seoService.setMetaDescription(
      'راجع منتجاتك وأكمل طلبك داخل مصر. الأسعار بالجنيه المصري والشحن موضح بشكل منفصل.',
    );
    this.analytics.track(AnalyticsEventName.VIEW_CART, { item_count: this.itemCount() });
    const draft = this.loadDraft();
    const user =
      this.orderService.hasPendingSubmission() || this.receiptRetainsCheckout()
        ? null
        : this.authService.currentUser();
    this.deliveryForm.patchValue({
      ...draft,
      fullName: draft.fullName || user?.fullName || '',
      email: draft.email || user?.email || '',
    });
    this.deliveryForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saveDraft();
      if (this.pricingReview()) {
        this.pricingReview.set(null);
        this.submitError.set(CHECKOUT_REVIEW_TEXT.refreshNeeded);
      }
    });
  }

  incrementQuantity(productId: string, currentQuantity: number): void {
    if (!this.checkoutBusy()) {
      this.cancelPricingReview();
      this.cartService.updateQuantity(productId, currentQuantity + 1);
    }
  }

  decrementQuantity(productId: string, currentQuantity: number): void {
    if (!this.checkoutBusy()) {
      this.cancelPricingReview();
      this.cartService.updateQuantity(productId, Math.max(1, currentQuantity - 1));
    }
  }

  removeItem(productId: string): void {
    if (!this.checkoutBusy()) {
      this.cancelPricingReview();
      this.cartService.removeItem(productId);
      this.itemErrors.update((errors) => {
        const next = { ...errors };
        delete next[productId];
        return next;
      });
    }
  }

  signIn(): void {
    this.saveDraft();
    void this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
  }

  submitOrder(): void {
    if (this.items().length === 0 || this.checkoutBusy()) return;
    this.attemptedSubmit.set(true);
    this.submitError.set('');
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      document.querySelector<HTMLElement>('#delivery-form .ng-invalid')?.focus();
      return;
    }

    const pending = this.orderService.pendingRequest();
    if (this.canRetryPendingSubmission() && pending) {
      if (!this.matchesCurrentDetails(pending)) {
        this.submitError.set(CHECKOUT_ERROR_TEXT.detailsConflict);
        return;
      }
      this.retryPreviousOrder();
      return;
    }
    if (this.pricingReview()) {
      return;
    }
    this.fetchQuote(
      this.currentPayload(),
      this.displayedPricing(),
      this.requiresFreshQuoteReview(),
    );
  }

  retryPreviousOrder(): void {
    if (this.checkoutBusy() || !this.canRetryPendingSubmission()) return;
    const payload = this.orderService.pendingRequest();
    if (!payload) return;
    this.placeOrder(this.orderService.retryPendingOrder(), payload, null);
  }

  confirmPricingReview(): void {
    const review = this.pricingReview();
    if (!review || this.checkoutBusy()) return;
    if (
      !this.matchesCurrentDetails(review.payload) ||
      !this.matchesDisplayedPricing(review.previous) ||
      this.deliveryForm.invalid
    ) {
      this.pricingReview.set(null);
      this.submitError.set(CHECKOUT_REVIEW_TEXT.refreshNeeded);
      this.focusAfterTransition(CheckoutFocusTarget.Feedback);
      return;
    }
    this.placeOrder(this.orderService.createOrder(review.payload), review.payload, review.previous);
  }

  cancelPricingReview(): void {
    if (this.checkoutBusy()) return;
    this.pricingReview.set(null);
    this.submitError.set('');
  }

  returnToCartFromReview(): void {
    if (this.checkoutBusy()) return;
    this.cancelPricingReview();
    this.focusAfterTransition(CheckoutFocusTarget.Cart);
  }

  private focusAfterTransition(target: CheckoutFocusTarget): void {
    afterNextRender(() => document.getElementById(target)?.focus(), {
      injector: this.injector,
    });
  }

  private matchesCurrentDetails(payload: CreateOrderPayload): boolean {
    return this.orderService.requestsMatch(
      {
        ...this.currentPayload(),
        ...(payload.expectedQuoteFingerprint
          ? { expectedQuoteFingerprint: payload.expectedQuoteFingerprint }
          : {}),
        ...(payload.expectedQuoteVersion
          ? { expectedQuoteVersion: payload.expectedQuoteVersion }
          : {}),
      },
      payload,
    );
  }

  private displayedPricing(): CheckoutPricingSnapshot {
    return {
      items: this.itemViews().map((view) => ({
        productId: view.id,
        name: view.item.product.name,
        slug: view.item.product.slug,
        image: view.item.product.image,
        configuration: productConfiguration(view.item.product),
        configurationFingerprint: normalizeConfigurationFingerprint(
          view.item.product.configurationFingerprint ?? null,
        ),
        quantity: view.item.quantity,
        unitPrice: view.unitPrice,
        lineTotal: view.lineTotal,
      })),
      subtotal: this.subtotal(),
      deliveryFee: this.deliveryFee(),
      total: this.totalEstimate(),
    };
  }

  private quotePricing(quote: CheckoutQuote): CheckoutPricingSnapshot {
    return {
      items: quote.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        configuration: item.configuration,
        configurationFingerprint: item.configurationFingerprint,
        quantity: item.quantity,
        unitPrice: getSalePrice(item.unitPrice, item.discountPrice),
        lineTotal: item.lineTotal,
      })),
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFeeConfirmed ? quote.deliveryFee : null,
      total: quote.total,
    };
  }

  private matchesDisplayedPricing(snapshot: CheckoutPricingSnapshot): boolean {
    return JSON.stringify(this.displayedPricing()) === JSON.stringify(snapshot);
  }

  private matchesRecoveredConfiguration(order: Order): boolean {
    const displayed = this.displayedPricing();
    if (displayed.items.length !== order.items.length) return false;
    return displayed.items.every((item) => {
      const recorded = order.items.find((line) => line.productId === item.productId);
      return Boolean(
        recorded &&
        item.configuration &&
        item.configurationFingerprint &&
        recorded.configuration &&
        recorded.configurationFingerprint &&
        item.name === recorded.name &&
        item.image === recorded.image &&
        item.quantity === recorded.quantity &&
        item.configurationFingerprint === recorded.configurationFingerprint &&
        JSON.stringify(item.configuration) === JSON.stringify(recorded.configuration) &&
        checkoutPiastres(item.unitPrice) ===
          checkoutPiastres(getSalePrice(recorded.unitPrice, recorded.discountPrice ?? null)),
      );
    });
  }

  private fetchQuote(
    payload: CreateOrderPayload,
    displayed: CheckoutPricingSnapshot,
    requireReview: boolean,
  ): void {
    if (this.canRetryPendingSubmission()) {
      this.submitError.set(CHECKOUT_REVIEW_TEXT.uncertainQuote);
      return;
    }
    this.isQuoting.set(true);
    this.pricingReview.set(null);
    this.itemErrors.set({});
    this.submitError.set('');
    this.saveDraft();
    this.orderService
      .quoteOrder({ items: payload.items })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isQuoting.set(false)),
      )
      .subscribe({
        next: ({ data: quote }) => {
          if (
            !this.matchesCurrentDetails(payload) ||
            !this.matchesDisplayedPricing(displayed) ||
            this.canRetryPendingSubmission()
          ) {
            this.submitError.set(CHECKOUT_REVIEW_TEXT.refreshNeeded);
            return;
          }
          const pricing = this.quotePricing(quote);
          const reviewedPayload = {
            ...payload,
            expectedQuoteFingerprint: quote.quoteFingerprint,
            expectedQuoteVersion: CheckoutQuoteVersion.Current,
          };
          const items = pricing.items.map((item) => {
            const previous = displayed.items.find((line) => line.productId === item.productId);
            const previousUnitPrice = previous?.unitPrice ?? item.unitPrice;
            const changes = item.configuration
              ? configurationChanges(previous?.configuration ?? null, item.configuration)
              : [];
            const nameChanged = previous?.name !== item.name;
            const imageChanged = previous?.image !== item.image;
            const configurationUnverified =
              !previous?.configurationFingerprint || !previous.configuration;
            const hashChanged =
              previous?.configurationFingerprint !== item.configurationFingerprint;
            return {
              ...item,
              previousUnitPrice,
              previousName: previous?.name ?? '',
              productLink: ['/products', item.slug],
              previousImage: previous?.image ?? '',
              nameChanged,
              imageChanged,
              configurationUnverified,
              configurationChanged:
                configurationUnverified ||
                hashChanged ||
                changes.length > 0 ||
                nameChanged ||
                imageChanged,
              designChanged:
                !configurationUnverified &&
                hashChanged &&
                changes.length === 0 &&
                !nameChanged &&
                !imageChanged,
              configurationChanges: changes,
              configurationRows: configurationDisplayRows(item.configuration),
              priceChanged:
                checkoutPiastres(previousUnitPrice) !== checkoutPiastres(item.unitPrice),
            };
          });
          const sameShipping = displayed.deliveryFee === pricing.deliveryFee;
          if (
            requireReview ||
            !sameShipping ||
            items.some((item) => item.priceChanged || item.configurationChanged) ||
            checkoutPiastres(displayed.subtotal) !== checkoutPiastres(pricing.subtotal)
          ) {
            this.pricingReview.set({
              quote,
              payload: reviewedPayload,
              previous: displayed,
              items,
              introduction: this.requiresFreshQuoteReview()
                ? CHECKOUT_REVIEW_TEXT.recoveredReview
                : CHECKOUT_REVIEW_TEXT.changed,
            });
            this.focusAfterTransition(CheckoutFocusTarget.Review);
            return;
          }
          this.placeOrder(
            this.orderService.createOrder(reviewedPayload),
            reviewedPayload,
            displayed,
          );
        },
        error: (error: ApiErrorResponse) => {
          const hasItemErrors = this.showItemErrors(error, payload);
          this.submitError.set(
            hasItemErrors ? CHECKOUT_REVIEW_TEXT.itemsRejected : CHECKOUT_REVIEW_TEXT.quoteFailed,
          );
        },
      });
  }

  private showItemErrors(error: ApiErrorResponse, payload: CreateOrderPayload): boolean {
    const errors: Record<string, string> = {};
    for (const [index, item] of payload.items.entries()) {
      if (error.errors?.[`items[${index}].productId`]?.length) {
        errors[item.productId] = CHECKOUT_REVIEW_TEXT.unavailable;
      } else if (error.errors?.[`items[${index}].quantity`]?.length) {
        errors[item.productId] = CHECKOUT_REVIEW_TEXT.invalidQuantity;
      } else if (error.errors?.[`items[${index}].configuration`]?.length) {
        errors[item.productId] = CHECKOUT_REVIEW_TEXT.configurationUnavailable;
      }
    }
    this.itemErrors.set(errors);
    return Object.keys(errors).length > 0;
  }

  returnToSavedCart(): void {
    this.receiptView.set(CartReceiptView.CART);
    this.submitError.set('');
    this.focusAfterTransition(CheckoutFocusTarget.Cart);
  }

  showSavedReceipt(): void {
    if (!this.canShowSavedReceipt()) return;
    this.receiptRetainsCheckout.set(this.items().length > 0 || this.receiptRetainsCheckout());
    if (this.receiptRetainsCheckout()) this.saveDraft();
    this.receiptView.set(CartReceiptView.RECEIPT);
    this.focusAfterTransition(CheckoutFocusTarget.Receipt);
  }

  private currentPayload(): CreateOrderPayload {
    const form = this.deliveryForm.getRawValue();
    const phone = normalizeEgyptMobile(form.whatsappNumber);
    const customer: CustomerDeliveryInfo = {
      fullName: form.fullName.trim(),
      phone,
      whatsappNumber: phone,
      governorate: form.governorate,
      city: form.city.trim(),
      address: form.address.trim(),
      country: 'EG',
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };
    return {
      items: this.itemViews().map((view) => ({ productId: view.id, quantity: view.item.quantity })),
      customer,
    };
  }

  private placeOrder(
    request: Observable<ApiResponse<Order>>,
    payload: CreateOrderPayload,
    submittedCart: CheckoutPricingSnapshot | null = this.displayedPricing(),
  ): void {
    this.isSubmittingOrder.set(true);
    this.submitError.set('');
    this.saveDraft();
    const submittedItemCount = payload.items.reduce((total, item) => total + item.quantity, 0);
    this.analytics.track(AnalyticsEventName.BEGIN_CHECKOUT, { item_count: submittedItemCount });
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingOrder.set(false)),
      )
      .subscribe({
        next: (response) => {
          const orderedItemCount = response.data.items.reduce(
            (total, item) => total + item.quantity,
            0,
          );
          this.analytics.track(AnalyticsEventName.ORDER_CREATED, { item_count: orderedItemCount });
          const unchanged =
            this.matchesCurrentDetails(payload) &&
            (submittedCart
              ? this.matchesDisplayedPricing(submittedCart)
              : this.matchesRecoveredConfiguration(response.data));
          this.receiptRetainsCheckout.set(!unchanged);
          if (unchanged) {
            this.cartService.clearCart();
            this.clearDraft();
          } else {
            this.saveDraft();
          }
          this.receiptView.set(CartReceiptView.RECEIPT);
          this.pricingReview.set(null);
          this.receiptError.set('');
          this.copiedOrderNumber.set(false);
          this.focusAfterTransition(CheckoutFocusTarget.Receipt);
        },
        error: (error: ApiErrorResponse) => {
          const removedReview = this.pricingReview() !== null;
          this.pricingReview.set(null);
          if (removedReview || this.requiresFreshQuoteReview()) {
            this.focusAfterTransition(CheckoutFocusTarget.Feedback);
          }
          if (this.requiresFreshQuoteReview()) {
            this.submitError.set(CHECKOUT_REVIEW_TEXT.notRecorded);
            return;
          }
          if (error.statusCode === 409 && error.errors?.['checkoutQuote']?.length) {
            if (this.canRetryPendingSubmission()) {
              this.submitError.set(CHECKOUT_REVIEW_TEXT.uncertainQuote);
            } else {
              this.fetchQuote(this.currentPayload(), this.displayedPricing(), true);
            }
            return;
          }
          if (error.statusCode === 409 && error.errors?.['checkoutSession']?.length) {
            this.submitError.set(CHECKOUT_ERROR_TEXT.sessionConflict);
            return;
          }
          if (error.statusCode === 409 && error.errors?.['checkoutDetails']?.length) {
            this.submitError.set(CHECKOUT_ERROR_TEXT.detailsConflict);
            return;
          }
          if (error.statusCode === 409 && error.errors?.['checkoutRecovery']?.length) {
            this.submitError.set(CHECKOUT_ERROR_TEXT.recoveryUnavailable);
            return;
          }
          if (error.statusCode === 422 && this.canRetryPendingSubmission()) {
            this.submitError.set(CHECKOUT_REVIEW_TEXT.uncertainQuote);
            return;
          }
          if (this.showItemErrors(error, payload)) {
            this.submitError.set(CHECKOUT_REVIEW_TEXT.itemsRejected);
            return;
          }
          this.submitError.set(
            error.statusCode === 422
              ? CHECKOUT_ERROR_TEXT.rejected
              : error.statusCode === 400 || error.statusCode === 409
                ? CHECKOUT_ERROR_TEXT.validation
                : CHECKOUT_ERROR_TEXT.uncertain,
          );
        },
      });
  }

  refreshReceipt(): void {
    const order = this.receipt();
    if (!order || this.isRefreshingReceipt()) return;
    this.isRefreshingReceipt.set(true);
    this.receiptError.set('');
    this.orderService
      .trackOrder(order.orderNumber, order.trackingToken || '')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isRefreshingReceipt.set(false)),
      )
      .subscribe({
        error: () => {
          if (this.receipt() !== order) return;
          this.receiptError.set(
            'تعذر تحديث الحالة الآن. رقم طلبك محفوظ ويمكنك التواصل معنا لمتابعته.',
          );
        },
      });
  }

  async copyOrderNumber(): Promise<void> {
    const order = this.receipt();
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      this.copiedOrderNumber.set(true);
    } catch {
      this.receiptError.set('يمكنك تحديد رقم الطلب الظاهر ونسخه يدويًا.');
    }
  }

  browseProducts(): void {
    void this.router.navigate(['/products']);
  }

  private loadDraft(): DeliveryDraft {
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEYS.deliveryDraft);
      if (!raw) return { ...EMPTY_DELIVERY_DRAFT };
      const parsed = JSON.parse(raw) as Partial<StoredDeliveryDraft>;
      this.receiptRetainsCheckout.set(parsed?.preserveCustomerDetails === true);
      const draft = { ...EMPTY_DELIVERY_DRAFT };
      for (const key of Object.keys(draft) as Array<keyof DeliveryDraft>) {
        const value = parsed?.[key];
        if (typeof value === 'string') draft[key] = value;
      }
      return draft;
    } catch {
      return { ...EMPTY_DELIVERY_DRAFT };
    }
  }

  private saveDraft(): void {
    try {
      sessionStorage.setItem(
        ORDER_STORAGE_KEYS.deliveryDraft,
        JSON.stringify({
          ...this.deliveryForm.getRawValue(),
          preserveCustomerDetails: this.receiptRetainsCheckout(),
        }),
      );
    } catch {
      return;
    }
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem(ORDER_STORAGE_KEYS.deliveryDraft);
    } catch {
      return;
    }
  }
}
