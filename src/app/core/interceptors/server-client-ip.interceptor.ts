import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { API_ORIGIN } from '../api/api-origin.token';
import { STOREFRONT_CLIENT_IP } from '../api/storefront-client-ip.token';
import { isPublicCatalogUrl } from '../utils/api-url.util';

export const serverClientIpInterceptor: HttpInterceptorFn = (request, next) => {
  const headers = request.headers.delete('X-Forwarded-For');
  const clientIp = inject(STOREFRONT_CLIENT_IP);
  const origin = inject(API_ORIGIN);
  const url = new URL(request.url, origin);
  const forwardClientIp =
    isPlatformServer(inject(PLATFORM_ID)) &&
    clientIp !== null &&
    request.method === 'GET' &&
    url.origin === origin &&
    !url.username &&
    !url.password &&
    isPublicCatalogUrl(url.href) &&
    !headers.has('Authorization') &&
    !headers.has('Cookie') &&
    !request.withCredentials &&
    request.credentials !== 'include' &&
    request.credentials !== 'same-origin';

  return next(
    request.clone({
      headers: forwardClientIp ? headers.set('X-Forwarded-For', clientIp) : headers,
    }),
  );
};
