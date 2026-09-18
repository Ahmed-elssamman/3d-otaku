import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/user-role.enum';
import { getAccountDestination } from '../utils/auth-navigation.util';

export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .loadCurrentUser()
    .pipe(
      map((user) =>
        user
          ? router.parseUrl(
              getAccountDestination(
                route.queryParamMap.get('returnUrl'),
                user.role === UserRole.ADMIN,
              ),
            )
          : true,
      ),
    );
};
