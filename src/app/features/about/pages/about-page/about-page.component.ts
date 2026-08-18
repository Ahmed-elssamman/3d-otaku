import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { AdminSettingsService } from '../../../admin/services/admin-settings.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SERVICE_PRINCIPLES, WORKFLOW_STEPS } from '../../about.control';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit {
  private seoService = inject(SeoService);
  private adminSettingsService = inject(AdminSettingsService);
  private whatsAppService = inject(WhatsAppService);

  settings = this.adminSettingsService.settings;
  whatsappUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  phoneUrl = computed(() => this.settings().phone ? 'tel:' + this.settings().phone.replace(/[^0-9+]/g, '') : '');
  emailUrl = computed(() => this.settings().email ? 'mailto:' + this.settings().email : '');

  workflowSteps = WORKFLOW_STEPS;
  servicePrinciples = SERVICE_PRINCIPLES;

  ngOnInit(): void {
    this.seoService.setTitle(`About ${this.settings().brandName || '3D Otaku'}`);
    this.seoService.setMetaDescription('Learn how 3D Otaku reviews product requirements, confirms made-to-order production, and handles custom design feasibility requests.');
  }
}
