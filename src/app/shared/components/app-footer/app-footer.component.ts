import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { FOOTER_LINK_GROUPS } from './app-footer.control';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  private settingsService = inject(AdminSettingsService);
  private whatsAppService = inject(WhatsAppService);
  settings = this.settingsService.settings;
  currentYear = new Date().getFullYear();
  linkGroups = FOOTER_LINK_GROUPS;
  whatsappUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  phoneUrl = computed(() => this.settings().phone ? 'tel:' + this.settings().phone.replace(/[^0-9+]/g, '') : '');
  emailUrl = computed(() => this.settings().email ? 'mailto:' + this.settings().email : '');
  socialLinks = computed(() => [
    { id: 'facebook', label: 'Facebook', url: this.settings().facebookUrl, icon: 'pi pi-facebook' },
    { id: 'instagram', label: 'Instagram', url: this.settings().instagramUrl, icon: 'pi pi-instagram' },
    { id: 'tiktok', label: 'TikTok', url: this.settings().tiktokUrl, icon: 'pi pi-tiktok' },
    { id: 'youtube', label: 'YouTube', url: this.settings().youtubeUrl, icon: 'pi pi-youtube' }
  ].filter(link => Boolean(link.url?.trim())));
}
