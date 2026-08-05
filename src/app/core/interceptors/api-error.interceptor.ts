import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { ApiErrorResponse } from '../models/api-response.model';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let normalizedError: ApiErrorResponse = {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        statusCode: error.status || 500,
        timestamp: new Date().toISOString(),
        path: req.url
      };

      if (error.error && typeof error.error === 'object') {
        normalizedError = {
          ...normalizedError,
          ...error.error
        };
      } else if (typeof error.error === 'string') {
        normalizedError.message = error.error;
      }

      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh-token')) {
        tokenStorage.clearStorage();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => normalizedError);
    })
  );
};
