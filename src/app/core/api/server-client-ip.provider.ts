import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  EnvironmentProviders,
  REQUEST_CONTEXT,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { StorefrontRequestContext } from '../models/storefront-request-context.model';
import { serverClientIpInterceptor } from '../interceptors/server-client-ip.interceptor';
import { STOREFRONT_CLIENT_IP } from './storefront-client-ip.token';

export function provideServerClientIp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: STOREFRONT_CLIENT_IP,
      useFactory: (): string | null => {
        const context = inject(REQUEST_CONTEXT, {
          optional: true,
        }) as StorefrontRequestContext | null;
        return typeof context?.clientIp === 'string' && context.clientIp ? context.clientIp : null;
      },
    },
    provideHttpClient(withInterceptors([serverClientIpInterceptor])),
  ]);
}
