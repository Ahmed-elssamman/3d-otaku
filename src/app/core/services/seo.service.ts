import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { AdminSettingsService } from '../../features/admin/services/admin-settings.service';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly adminSettingsService = inject(AdminSettingsService);

  setTitle(pageTitle: string): void {
    const settings = this.adminSettingsService.getSettings();
    const fullTitle = pageTitle ? `${pageTitle} | ${settings.brandName}` : `${settings.brandName} - ${settings.slogan}`;
    this.titleService.setTitle(fullTitle);
  }

  setMetaDescription(description: string): void {
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }
}
