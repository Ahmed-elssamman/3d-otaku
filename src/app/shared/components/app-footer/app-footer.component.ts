import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_LINK_GROUPS, FooterLinkGroup } from './app-footer.control';
import { APP_CONSTANTS } from '@core/constants/app.constants';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  readonly linkGroups: FooterLinkGroup[] = FOOTER_LINK_GROUPS;
  readonly brandName = APP_CONSTANTS.BRAND_NAME;
  readonly slogan = APP_CONSTANTS.BRAND_SLOGAN;
  readonly safetyDisclaimer = APP_CONSTANTS.SAFETY_DISCLAIMER;
  readonly currentYear = new Date().getFullYear();
}
