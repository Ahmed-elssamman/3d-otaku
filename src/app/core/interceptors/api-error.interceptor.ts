import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';
import { ApiErrorResponse } from '../models/api-response.model';
import { isApiUrl, isCredentialUrl, isPublicCatalogUrl } from '../utils/api-url.util';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';

function normalizeError(error: HttpErrorResponse, path: string): ApiErrorResponse {
  const body: Partial<ApiErrorResponse> | null =
    error.error && typeof error.error === 'object' ? error.error : null;
  return {
    success: false,
    message: typeof body?.message === 'string' ? body.message : 'تعذّر إكمال الطلب. حاول مرة أخرى.',
    statusCode: error.status,
    timestamp: new Date().toISOString(),
    path,
    ...(body?.errors ? { errors: body.errors } : {}),
  };
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);
  const origin = inject(DOCUMENT).location.origin;
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const transferState = inject(TransferState);
  if (!isApiUrl(req.url, origin)) return next(req);
  const transferError =
    req.method === 'GET' &&
    isPublicCatalogUrl(req.url) &&
    !req.headers.has('Authorization') &&
    !req.headers.has('Cookie') &&
    !req.withCredentials &&
    req.credentials !== 'include' &&
    req.credentials !== 'same-origin' &&
    req.transferCache !== false;
  const errorKey = makeStateKey<ApiErrorResponse | null>(`public-api-error:${req.urlWithParams}`);
  if (isBrowser && transferError && transferState.hasKey(errorKey)) {
    const error = transferState.get(errorKey, null);
    transferState.remove(errorKey);
    if (error) return throwError(() => error);
  }

  const expireSession = (): void => {
    auth.clearAuth();
    const isSessionProbe = new URL(req.url, origin).pathname.endsWith('/auth/me');
    if (!isSessionProbe && !/^\/(login|register)([/?#]|$)/.test(router.url)) {
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isBrowser && transferError) transferState.set(errorKey, normalizeError(error, req.url));
      if (
        !isBrowser ||
        req.context.get(GUEST_ORDER_TRACKING) ||
        error.status !== 401 ||
        isCredentialUrl(req.url, origin) ||
        isPublicCatalogUrl(req.url)
      ) {
        return throwError(() => normalizeError(error, req.url));
      }
      const currentToken = storage.getAccessToken();
      const sentToken = req.headers.get('Authorization');
      if (!sentToken || !storage.getRefreshToken()) {
        expireSession();
        return throwError(() => normalizeError(error, req.url));
      }

      // A late 401 may belong to the old token after another request refreshed it.
      const tokenRequest =
        currentToken && sentToken !== `Bearer ${currentToken}`
          ? of(currentToken)
          : auth.refreshToken();
      return tokenRequest.pipe(
        catchError((refreshError: ApiErrorResponse) => {
          if (refreshError.statusCode === 401 || refreshError.statusCode === 403) expireSession();
          return throwError(() => refreshError);
        }),
        switchMap((token) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
            catchError((retryError: HttpErrorResponse) => {
              if (retryError.status === 401) expireSession();
              return throwError(() => normalizeError(retryError, req.url));
            }),
          ),
        ),
      );
    }),
  );
};
