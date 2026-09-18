import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_ORIGIN } from '../api/api-origin.token';

export const apiOriginInterceptor: HttpInterceptorFn = (request, next) => {
  const origin = inject(API_ORIGIN);
  if (!request.url.startsWith('/api/')) return next(request);
  return next(request.clone({ url: new URL(request.url, origin).href }));
};
