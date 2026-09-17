import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TokenStorageService } from '../services/token-storage.service';
import { isApiUrl, isCredentialUrl, isPublicCatalogUrl } from '../utils/api-url.util';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(GUEST_ORDER_TRACKING)) {
    return next(
      req.clone({
        headers: req.headers.delete('Authorization'),
        withCredentials: false,
        credentials: 'omit',
      }),
    );
  }
  const storage = inject(TokenStorageService);
  const origin = inject(DOCUMENT).location.origin;
  const token = storage.getAccessToken();
  if (
    token &&
    isApiUrl(req.url, origin) &&
    !isCredentialUrl(req.url, origin) &&
    !isPublicCatalogUrl(req.url)
  ) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
