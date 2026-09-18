import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

export const API_ORIGIN = new InjectionToken<string>('API_ORIGIN', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location.origin,
});
