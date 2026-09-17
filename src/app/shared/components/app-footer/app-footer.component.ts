import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { FOOTER_LINK_GROUPS, FOOTER_SOCIAL_DEFINITIONS } from './app-footer.control';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss',
})
export class AppFooterComponent {
  private settingsService = inject(AdminSettingsService);
  private whatsAppService = inject(WhatsAppService);
  settings = this.settingsService.settings;
  currentYear = new Date().getFullYear();
  linkGroups = FOOTER_LINK_GROUPS;
  whatsappUrl = computed(() => this.whatsAppService.getDirectChatUrl());
  phoneUrl = computed(() =>
    this.settings().phone ? 'tel:' + this.settings().phone.replace(/[^0-9+]/g, '') : '',
  );
  emailUrl = computed(() => (this.settings().email ? 'mailto:' + this.settings().email : ''));
  socialLinks = computed(() => {
    const settings = this.settings();
    const urls: Record<string, string> = {
      facebook: settings.facebookUrl,
      instagram: settings.instagramUrl,
      tiktok: settings.tiktokUrl,
      youtube: settings.youtubeUrl,
    };
    return FOOTER_SOCIAL_DEFINITIONS.map((link) => ({ ...link, url: urls[link.id] })).filter(
      (link) => Boolean(link.url?.trim()),
    );
  });
}
