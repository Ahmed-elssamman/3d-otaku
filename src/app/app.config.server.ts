import { ApplicationConfig, REQUEST, inject, mergeApplicationConfig } from '@angular/core';
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_ORIGIN } from './core/api/api-origin.token';
import { getServerApiOrigin, getSiteOrigin } from '../server.config';
import { SITE_ORIGIN } from './core/api/site-origin.token';
import { provideServerClientIp } from './core/api/server-client-ip.provider';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideServerClientIp(),
    { provide: API_ORIGIN, useFactory: getServerApiOrigin },
    {
      provide: SITE_ORIGIN,
      useFactory: (): string => getSiteOrigin(inject(REQUEST)?.url || 'http://localhost'),
    },
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: (): Record<string, string> => {
        const request = inject(REQUEST);
        return request ? { [getServerApiOrigin()]: inject(SITE_ORIGIN) } : {};
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
