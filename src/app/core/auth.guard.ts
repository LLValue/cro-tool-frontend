import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../data/auth.service';
import { map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    take(1),
    switchMap(isLoggedIn => {
      if (!isLoggedIn) {
        const token = authService.getToken();
        if (token) {
          return authService.checkAuth().pipe(
            map(authValid => {
              if (!authValid) {
                router.navigate(['/login']);
                return false;
              }
              return true;
            })
          );
        } else {
          router.navigate(['/login']);
          return of(false);
        }
      }
      return of(true);
    })
  );
};
