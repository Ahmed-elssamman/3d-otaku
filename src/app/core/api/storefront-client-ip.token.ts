import { InjectionToken } from '@angular/core';

export const STOREFRONT_CLIENT_IP = new InjectionToken<string | null>('STOREFRONT_CLIENT_IP', {
  providedIn: 'root',
  factory: () => null,
});
