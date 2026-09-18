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
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { ApiErrorResponse, ApiResponse } from '@core/models/api-response.model';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';
import { normalizeEgyptMobile } from '@core/utils/egypt-phone.util';
import { CustomOrderService } from '../../services/custom-order.service';
import { ContactService } from '../../services/contact.service';
import { ContactMessageRequest, ContactMessageResponse } from '../../models/contact-message.model';
import { CreateCustomOrderRequest, CustomOrder } from '../../models/custom-order.model';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { ContactMode, DesignSource } from '../../enums/contact.enum';
import { PublicRequestError } from '../../enums/public-request-error.enum';
import {
  CONTACT_MODES,
  CUSTOM_FAQ_ITEMS,
  CUSTOM_REQUEST_STEPS,
  DESIGN_SOURCE_OPTIONS,
  MATERIAL_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  createCustomForm,
  createMessageForm,
} from '../../contact.control';
import {
  CONTACT_PAGE_STORAGE,
  CONTACT_RECOVERY_TEXT,
  customSummary,
  customWhatsAppRequest,
  messageSummary,
  parseContactPageState,
} from './contact-page.control';
import { ContactPageState, ContactReceipt } from './contact-page.model';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss',
})
export class ContactPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private whatsAppService = inject(WhatsAppService);
  private customOrderService = inject(CustomOrderService);
  private contactService = inject(ContactService);
  private adminSettingsService = inject(AdminSettingsService);
  private seoService = inject(SeoService);
  private analytics = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private storageReady = signal(false);

  settings = this.adminSettingsService.settings;
  modes = CONTACT_MODES;
  contactMode = ContactMode;
  mode = signal(ContactMode.Custom);
  designSourceOptions = DESIGN_SOURCE_OPTIONS;
  productTypeOptions = PRODUCT_TYPE_OPTIONS;
  materialOptions = MATERIAL_OPTIONS;
  faqItems = CUSTOM_FAQ_ITEMS;
  steps = CUSTOM_REQUEST_STEPS;
  isSubmitting = signal(false);
  isSendingMessage = signal(false);
  customReceipt = signal<ContactReceipt<CreateCustomOrderRequest> | null>(null);
  messageReceipt = signal<ContactReceipt<ContactMessageRequest> | null>(null);
  requestNumber = computed(() => this.customReceipt()?.reference ?? '');
  messageNumber = computed(() => this.messageReceipt()?.reference ?? '');
  recoveryText = CONTACT_RECOVERY_TEXT;
  draftStorageUnavailable = signal(false);
  hasPendingCustom = computed(() => this.storageReady() && this.customOrderService.hasPending());
  hasPendingMessage = computed(() => this.storageReady() && this.contactService.hasPending());
  canReplayCustom = computed(
    () => this.hasPendingCustom() && this.customOrderService.pending() !== null && !this.isBusy(),
  );
  canReplayMessage = computed(
    () => this.hasPendingMessage() && this.contactService.pending() !== null && !this.isBusy(),
  );
  customRecoveryUnavailable = computed(
    () => this.hasPendingCustom() && this.customOrderService.pending() === null,
  );
  messageRecoveryUnavailable = computed(
    () => this.hasPendingMessage() && this.contactService.pending() === null,
  );
  pendingCustomSummary = computed(() =>
    customSummary(this.customOrderService.pending()?.payload ?? null),
  );
  pendingMessageSummary = computed(() =>
    messageSummary(this.contactService.pending()?.payload ?? null),
  );
  customReceiptSummary = computed(() => customSummary(this.customReceipt()?.request ?? null));
  messageReceiptSummary = computed(() => messageSummary(this.messageReceipt()?.request ?? null));
  retainsCustomDraft = computed(() => this.customReceipt()?.retainsDraft ?? false);
  retainsMessageDraft = computed(() => this.messageReceipt()?.retainsDraft ?? false);
  customReturnLabel = computed(() =>
    this.retainsCustomDraft() ? CONTACT_RECOVERY_TEXT.backCustom : CONTACT_RECOVERY_TEXT.newCustom,
  );
  messageReturnLabel = computed(() =>
    this.retainsMessageDraft()
      ? CONTACT_RECOVERY_TEXT.backMessage
      : CONTACT_RECOVERY_TEXT.newMessage,
  );
  generatedWhatsAppUrl = signal('');
  submitError = signal('');
  messageError = signal('');
  customAttempted = signal(false);
  messageAttempted = signal(false);
  phoneUrl = computed(() =>
    this.settings().phone ? `tel:${this.settings().phone.replace(/[^0-9+]/g, '')}` : '',
  );
  emailUrl = computed(() => (this.settings().email ? `mailto:${this.settings().email}` : ''));
  whatsappDirectUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  hasDirectContact = computed(() =>
    Boolean(this.phoneUrl() || this.emailUrl() || this.whatsappDirectUrl()),
  );
  isBusy = computed(() => this.isSubmitting() || this.isSendingMessage());

  customForm = createCustomForm(this.formBuilder);
  messageForm = createMessageForm(this.formBuilder);
  private customEvents = toSignal(this.customForm.events, { initialValue: null });
  private messageEvents = toSignal(this.messageForm.events, { initialValue: null });
  referenceRequired = computed(() => {
    this.customEvents();
    return this.customForm.controls.designSource.value !== DesignSource.Idea;
  });
  customErrors = computed(() => {
    this.customEvents();
    const controls = this.customForm.controls;
    return {
      fullName: controls.fullName.touched && controls.fullName.invalid,
      phone: controls.phone.touched && controls.phone.invalid,
      email: controls.email.touched && controls.email.invalid,
      referenceUrl:
        (controls.referenceUrl.touched || this.customAttempted()) &&
        (controls.referenceUrl.invalid || this.customForm.hasError('referenceRequired')),
      quantity: controls.quantity.touched && controls.quantity.invalid,
      details: controls.details.touched && controls.details.invalid,
      rightsConfirmed: controls.rightsConfirmed.touched && controls.rightsConfirmed.invalid,
    };
  });
  messageErrors = computed(() => {
    this.messageEvents();
    const controls = this.messageForm.controls;
    return {
      fullName: controls.fullName.touched && controls.fullName.invalid,
      email: controls.email.touched && controls.email.invalid,
      phone: controls.phone.touched && controls.phone.invalid,
      subject: controls.subject.touched && controls.subject.invalid,
      message: controls.message.touched && controls.message.invalid,
    };
  });
  invalidCustomSubmission = computed(() => {
    this.customEvents();
    return !this.hasPendingCustom() && this.customAttempted() && this.customForm.invalid;
  });
  invalidMessageSubmission = computed(() => {
    this.messageEvents();
    return !this.hasPendingMessage() && this.messageAttempted() && this.messageForm.invalid;
  });

  ngOnInit(): void {
    this.seoService.setTitle('اطبع فكرتك وتواصل معانا');
    this.seoService.setMetaDescription(
      'ابعت فكرتك للطباعة ثلاثية الأبعاد أو استفسارك لفريق 3D Otaku. مراجعة التصميم والتسعير قبل التنفيذ، والتوصيل داخل مصر.',
    );
    this.analytics.track(AnalyticsEventName.CUSTOM_REQUEST_START);
    this.customForm.controls.designSource.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((source) => {
        if (source === DesignSource.Idea) this.customForm.controls.referenceUrl.reset('');
      });
    this.customForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.savePageState());
    this.messageForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.savePageState());
    afterNextRender(
      () => {
        this.restorePageState();
        this.storageReady.set(true);
      },
      { injector: this.injector },
    );
  }

  selectMode(mode: ContactMode): void {
    if (!this.isBusy()) {
      this.mode.set(mode);
      this.savePageState();
    }
  }

  onSubmit(): void {
    if (this.isBusy()) return;
    if (this.hasPendingCustom()) {
      this.submitError.set(CONTACT_RECOVERY_TEXT.changed);
      this.focusResult('custom-pending');
      return;
    }
    this.customForm.controls.email.setValue(this.customForm.controls.email.value.trim());
    this.customAttempted.set(true);
    this.submitError.set('');
    if (this.customForm.invalid) {
      this.customForm.markAllAsTouched();
      const invalid =
        this.element.nativeElement.querySelector<HTMLElement>('#custom-form .ng-invalid') ??
        this.element.nativeElement.querySelector<HTMLElement>('#custom-reference');
      const details = invalid?.closest('details');
      if (details) details.open = true;
      invalid?.focus();
      return;
    }
    const payload = this.currentCustomPayload();
    this.submitCustom(this.customOrderService.createCustomOrder(payload), payload);
  }

  retryCustomRequest(): void {
    const pending = this.customOrderService.pending();
    if (!this.canReplayCustom() || !pending) return;
    this.submitCustom(this.customOrderService.replayCustomOrder(), pending.payload);
  }

  private submitCustom(
    observable: Observable<ApiResponse<CustomOrder>>,
    payload: CreateCustomOrderRequest,
  ): void {
    this.isSubmitting.set(true);
    this.submitError.set('');
    this.savePageState();
    observable
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (response) => {
          const retainsDraft =
            JSON.stringify(this.currentCustomPayload()) !== JSON.stringify(payload);
          this.customReceipt.set({
            reference: response.data.requestNumber,
            request: payload,
            retainsDraft,
          });
          this.updateWhatsAppReceipt();
          this.customAttempted.set(false);
          this.savePageState();
          this.analytics.track(AnalyticsEventName.CUSTOM_REQUEST_SUBMIT, {
            persisted: true,
            design_source: payload.designSource ?? '',
          });
          this.focusResult('custom-result');
        },
        error: (error: ApiErrorResponse) =>
          this.submitError.set(this.submissionError(error, this.hasPendingCustom())),
      });
  }

  sendMessage(): void {
    if (this.isBusy()) return;
    if (this.hasPendingMessage()) {
      this.messageError.set(CONTACT_RECOVERY_TEXT.changed);
      this.focusResult('message-pending');
      return;
    }
    this.messageForm.controls.email.setValue(this.messageForm.controls.email.value.trim());
    this.messageAttempted.set(true);
    this.messageError.set('');
    if (this.messageForm.invalid) {
      this.messageForm.markAllAsTouched();
      this.element.nativeElement.querySelector<HTMLElement>('#message-form .ng-invalid')?.focus();
      return;
    }
    const payload = this.currentMessagePayload();
    this.submitMessage(this.contactService.sendMessage(payload), payload);
  }

  retryMessage(): void {
    const pending = this.contactService.pending();
    if (!this.canReplayMessage() || !pending) return;
    this.submitMessage(this.contactService.replayMessage(), pending.payload);
  }

  private submitMessage(
    observable: Observable<ApiResponse<ContactMessageResponse>>,
    payload: ContactMessageRequest,
  ): void {
    this.isSendingMessage.set(true);
    this.messageError.set('');
    this.savePageState();
    observable
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSendingMessage.set(false)),
      )
      .subscribe({
        next: (response) => {
          const retainsDraft =
            JSON.stringify(this.currentMessagePayload()) !== JSON.stringify(payload);
          this.messageReceipt.set({
            reference: response.data.messageNumber,
            request: payload,
            retainsDraft,
          });
          this.messageAttempted.set(false);
          this.savePageState();
          this.focusResult('message-result');
        },
        error: (error: ApiErrorResponse) =>
          this.messageError.set(this.submissionError(error, this.hasPendingMessage())),
      });
  }

  resetCustomForm(): void {
    if (this.isBusy() || this.hasPendingCustom()) return;
    if (!this.customReceipt()?.retainsDraft) this.customForm.reset();
    this.customReceipt.set(null);
    this.generatedWhatsAppUrl.set('');
    this.submitError.set('');
    this.customAttempted.set(false);
    this.savePageState();
    this.focusResult('custom-title');
  }

  resetMessageForm(): void {
    if (this.isBusy() || this.hasPendingMessage()) return;
    if (!this.messageReceipt()?.retainsDraft) this.messageForm.reset();
    this.messageReceipt.set(null);
    this.messageError.set('');
    this.messageAttempted.set(false);
    this.savePageState();
    this.focusResult('message-title');
  }

  private submissionError(error: ApiErrorResponse, pending: boolean): string {
    if (error.errors?.[PublicRequestError.Storage]?.length)
      return CONTACT_RECOVERY_TEXT.storageUnavailable;
    if (error.statusCode === 429) return CONTACT_RECOVERY_TEXT.rateLimited;
    if (pending && error.errors?.[PublicRequestError.Details]?.length)
      return CONTACT_RECOVERY_TEXT.changed;
    if (error.statusCode === 422 && !pending) return CONTACT_RECOVERY_TEXT.rejected;
    return CONTACT_RECOVERY_TEXT.uncertain;
  }

  private currentCustomPayload(): CreateCustomOrderRequest {
    const form = this.customForm.getRawValue();
    const phone = normalizeEgyptMobile(form.phone);
    return {
      fullName: form.fullName.trim(),
      phone,
      whatsappNumber: phone,
      email: form.email.trim(),
      productIdea: form.productType,
      description: form.details.trim(),
      preferredColor: form.colorFinish.trim(),
      estimatedSize: form.dimensions.trim(),
      referenceImageUrl: form.referenceUrl.trim(),
      designSource: form.designSource,
      ...(form.quantity !== null ? { quantity: form.quantity } : {}),
      preferredMaterial: form.material,
      rightsConfirmed: form.rightsConfirmed,
    };
  }

  private currentMessagePayload(): ContactMessageRequest {
    const form = this.messageForm.getRawValue();
    return {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone ? normalizeEgyptMobile(form.phone) : '',
      subject: form.subject.trim(),
      message: form.message.trim(),
    };
  }

  private updateWhatsAppReceipt(): void {
    const receipt = this.customReceipt();
    const request = receipt ? customWhatsAppRequest(receipt.request) : null;
    this.generatedWhatsAppUrl.set(
      receipt && request ? this.whatsAppService.getCustomOrderUrl(request, receipt.reference) : '',
    );
  }

  private restorePageState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = sessionStorage.getItem(CONTACT_PAGE_STORAGE.key);
      const state = raw ? parseContactPageState(raw) : null;
      if (!state) return;
      this.customForm.patchValue(state.custom);
      this.messageForm.patchValue(state.message);
      this.mode.set(state.mode);
      this.customReceipt.set(this.customOrderService.hasPending() ? null : state.customReceipt);
      this.messageReceipt.set(this.contactService.hasPending() ? null : state.messageReceipt);
      this.updateWhatsAppReceipt();
    } catch {
      this.draftStorageUnavailable.set(true);
      return;
    }
  }

  private savePageState(): void {
    if (!this.storageReady() || !isPlatformBrowser(this.platformId)) return;
    const state: ContactPageState = {
      version: CONTACT_PAGE_STORAGE.version,
      mode: this.mode(),
      custom: this.customForm.getRawValue(),
      message: this.messageForm.getRawValue(),
      customReceipt: this.customReceipt(),
      messageReceipt: this.messageReceipt(),
    };
    try {
      sessionStorage.setItem(CONTACT_PAGE_STORAGE.key, JSON.stringify(state));
      this.draftStorageUnavailable.set(false);
    } catch {
      this.draftStorageUnavailable.set(true);
      return;
    }
  }

  private focusResult(id: string): void {
    afterNextRender(
      () => this.element.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus(),
      { injector: this.injector },
    );
  }
}
