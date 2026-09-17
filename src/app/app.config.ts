import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { apiOriginInterceptor } from './core/interceptors/api-origin.interceptor';
import { isPublicCatalogUrl } from './core/utils/api-url.util';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        filter: (request) => request.method === 'GET' && isPublicCatalogUrl(request.url),
      }),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authTokenInterceptor, apiErrorInterceptor, apiOriginInterceptor]),
    ),
    provideAnimationsAsync(),
  ],
};
