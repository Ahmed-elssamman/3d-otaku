import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AnalyticsEventName } from '../enums/analytics-event-name.enum';

export interface AnalyticsPayload {
  event: string;
  [key: string]: string | number | boolean;
}

declare global {
  interface Window {
    dataLayer?: AnalyticsPayload[];
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private platformId = inject(PLATFORM_ID);

  track(event: AnalyticsEventName, parameters: Record<string, string | number | boolean> = {}): void {
    if (!isPlatformBrowser(this.platformId) || !window.dataLayer) {
      return;
    }
    window.dataLayer.push({ event, ...parameters });
  }
}
