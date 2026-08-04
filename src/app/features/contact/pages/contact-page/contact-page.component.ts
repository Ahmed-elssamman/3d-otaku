import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SeoService } from '@core/services/seo.service';
import { PRODUCT_TYPE_OPTIONS, COLOR_FINISH_OPTIONS, CUSTOM_FAQ_ITEMS, FaqItem } from '../../contact.control';
import { CustomOrderRequest } from '@core/models/custom-order-request.model';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss'
})
export class ContactPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly seoService = inject(SeoService);

  readonly productTypeOptions: string[] = PRODUCT_TYPE_OPTIONS;
  readonly colorFinishOptions: string[] = COLOR_FINISH_OPTIONS;
  readonly faqItems: FaqItem[] = CUSTOM_FAQ_ITEMS;

  readonly customForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    productType: [PRODUCT_TYPE_OPTIONS[0], [Validators.required]],
    dimensions: ['Standard 100 cm', [Validators.required]],
    colorFinish: [COLOR_FINISH_OPTIONS[0], [Validators.required]],
    referenceUrl: [''],
    details: ['', [Validators.required, Validators.minLength(10)]]
  });

  readonly isSubmitted = signal<boolean>(false);
  readonly generatedWhatsAppUrl = signal<string>('');

  ngOnInit(): void {
    this.seoService.setTitle('Custom 3D Print Order & Contact');
    this.seoService.setMetaDescription('Request a custom anime 3D print model, weapon replica, or cosplay prop quote directly via WhatsApp or online form.');
  }

  onSubmit(): void {
    if (this.customForm.invalid) {
      this.customForm.markAllAsTouched();
      return;
    }

    const request: CustomOrderRequest = this.customForm.value;
    const url = this.whatsAppService.getCustomOrderUrl(request);
    this.generatedWhatsAppUrl.set(url);
    this.isSubmitted.set(true);

    window.open(url, '_blank');
  }
}
