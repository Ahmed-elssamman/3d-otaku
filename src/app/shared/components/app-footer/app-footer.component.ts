import { Component } from '@angular/core';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import { environment } from '../../../../environments/environment.prod';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  readonly brandName = APP_CONSTANTS.BRAND_NAME;
  readonly slogan = APP_CONSTANTS.BRAND_SLOGAN;
  readonly safetyDisclaimer = APP_CONSTANTS.SAFETY_DISCLAIMER;
  readonly currentYear = new Date().getFullYear();

  readonly whatsAppNumber = environment.whatsAppNumber;
  readonly storePhone = environment.storePhone;
  readonly email = 'hello@3dotaku.com';
  readonly address = 'Cairo, Egypt • Cosplay Studio';

  readonly featuredAnimeWallpaper = 'assets/anime/tanjiro-kamado-3840x2160-18718.jpg';
}
