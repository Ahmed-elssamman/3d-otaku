import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../enums/user-role.enum';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadCurrentUser().pipe(
    map((user) => {
      if (!user) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      return user.role === UserRole.ADMIN ? true : router.createUrlTree(['/products']);
    }),
  );
};
