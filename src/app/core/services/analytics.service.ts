import { Injectable } from '@angular/core';
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
  track(event: AnalyticsEventName, parameters: Record<string, string | number | boolean> = {}): void {
    if (!window.dataLayer) {
      return;
    }
    window.dataLayer.push({ event, ...parameters });
  }
}
