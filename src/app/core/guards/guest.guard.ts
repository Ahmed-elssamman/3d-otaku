import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getSafeReturnUrl } from '../utils/auth-navigation.util';

export const guestGuard: CanActivateFn = (route): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = getSafeReturnUrl(route.queryParamMap.get('returnUrl'));
  return router.parseUrl(returnUrl || '/products');
};
