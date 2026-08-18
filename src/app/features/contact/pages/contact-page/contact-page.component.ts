import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomOrderRequest } from '@core/models/custom-order-request.model';
import { SeoService } from '@core/services/seo.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { CustomOrderService } from '../../services/custom-order.service';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { CUSTOM_FAQ_ITEMS, DESIGN_SOURCE_OPTIONS, MATERIAL_OPTIONS, PRODUCT_TYPE_OPTIONS } from '../../contact.control';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss'
})
export class ContactPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private whatsAppService = inject(WhatsAppService);
  private customOrderService = inject(CustomOrderService);
  private adminSettingsService = inject(AdminSettingsService);
  private seoService = inject(SeoService);
  private analytics = inject(AnalyticsService);

  settings = this.adminSettingsService.settings;

  phoneUrl = computed(() => this.settings().phone ? 'tel:' + this.settings().phone.replace(/[^0-9+]/g, '') : '');
  emailUrl = computed(() => this.settings().email ? 'mailto:' + this.settings().email : '');
  whatsappDirectUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  socialLinks = computed(() => [
    { id: 'facebook', label: 'Facebook', url: this.settings().facebookUrl, icon: 'pi pi-facebook' },
    { id: 'instagram', label: 'Instagram', url: this.settings().instagramUrl, icon: 'pi pi-instagram' },
    { id: 'tiktok', label: 'TikTok', url: this.settings().tiktokUrl, icon: 'pi pi-tiktok' },
    { id: 'youtube', label: 'YouTube', url: this.settings().youtubeUrl, icon: 'pi pi-youtube' }
  ].filter(link => Boolean(link.url?.trim())));

  designSourceOptions = DESIGN_SOURCE_OPTIONS;
  productTypeOptions = PRODUCT_TYPE_OPTIONS;
  materialOptions = MATERIAL_OPTIONS;
  faqItems = CUSTOM_FAQ_ITEMS;
  isSubmitted = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  wasPersisted = signal<boolean>(false);
  requestNumber = signal<string>('');
  generatedWhatsAppUrl = signal<string>('');
  submitError = signal<string>('');

  customForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s-]{8,20}$/)]],
    email: ['', [Validators.email]],
    designSource: [DESIGN_SOURCE_OPTIONS[0].value, [Validators.required]],
    referenceUrl: ['', [Validators.pattern(/^https:\/\/.+/i)]],
    productType: [PRODUCT_TYPE_OPTIONS[0].value, [Validators.required]],
    dimensions: [''],
    material: [''],
    colorFinish: [''],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    details: ['', [Validators.required, Validators.minLength(10)]],
    rightsConfirmed: [false, [Validators.requiredTrue]]
  });

  ngOnInit(): void {
    this.seoService.setTitle('Request a custom 3D model review');
    this.seoService.setMetaDescription('Send a design or idea for printability, rights, price, and production review before placing a custom order.');
    this.analytics.track(AnalyticsEventName.CUSTOM_REQUEST_START);
  }

  onSubmit(): void {
    if (this.customForm.invalid || this.isSubmitting()) {
      this.customForm.markAllAsTouched();
      return;
    }

    const form = this.customForm.getRawValue();
    if (form.designSource !== 'written-idea' && !form.referenceUrl.trim()) {
      this.submitError.set('Add an HTTPS model or reference URL for the selected design source.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    const request: CustomOrderRequest = {
      fullName: form.fullName,
      phone: form.phone,
      designSource: form.designSource,
      productType: form.productType,
      dimensions: form.dimensions,
      colorFinish: form.colorFinish,
      quantity: form.quantity,
      details: form.details,
      rightsConfirmed: form.rightsConfirmed,
      ...(form.email ? { email: form.email } : {}),
      ...(form.referenceUrl ? { referenceUrl: form.referenceUrl } : {}),
      ...(form.material ? { material: form.material } : {})
    };

    this.customOrderService.createCustomOrder({
      fullName: request.fullName,
      phone: request.phone,
      whatsappNumber: request.phone,
      email: request.email ?? '',
      productIdea: request.productType,
      description: request.details,
      preferredColor: request.colorFinish,
      estimatedSize: request.dimensions,
      referenceImageUrl: request.referenceUrl,
      designSource: request.designSource,
      quantity: request.quantity,
      preferredMaterial: request.material,
      rightsConfirmed: request.rightsConfirmed
    }).subscribe({
      next: response => {
        this.isSubmitting.set(false);
        this.wasPersisted.set(true);
        this.requestNumber.set(response.data.id);
        this.generatedWhatsAppUrl.set(this.whatsAppService.getCustomOrderUrl(request, response.data.id));
        this.isSubmitted.set(true);
        this.analytics.track(AnalyticsEventName.CUSTOM_REQUEST_SUBMIT, { persisted: true, design_source: request.designSource });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.wasPersisted.set(false);
        this.requestNumber.set('');
        this.generatedWhatsAppUrl.set(this.whatsAppService.getCustomOrderUrl(request));
        this.submitError.set('The API did not save this request. You can use the WhatsApp-only fallback below; no persisted request number has been created.');
        this.isSubmitted.set(true);
        this.analytics.track(AnalyticsEventName.CUSTOM_REQUEST_SUBMIT, { persisted: false, design_source: request.designSource });
      }
    });
  }

  resetForm(): void {
    this.customForm.reset({ designSource: DESIGN_SOURCE_OPTIONS[0].value, productType: PRODUCT_TYPE_OPTIONS[0].value, quantity: 1, rightsConfirmed: false });
    this.isSubmitted.set(false);
    this.wasPersisted.set(false);
    this.requestNumber.set('');
    this.generatedWhatsAppUrl.set('');
    this.submitError.set('');
  }
}
