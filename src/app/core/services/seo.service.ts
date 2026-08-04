import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  setTitle(pageTitle: string): void {
    const fullTitle = pageTitle ? `${pageTitle} | ${APP_CONSTANTS.BRAND_NAME}` : `${APP_CONSTANTS.BRAND_NAME} - ${APP_CONSTANTS.BRAND_SLOGAN}`;
    this.titleService.setTitle(fullTitle);
  }

  setMetaDescription(description: string): void {
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
  }
}
