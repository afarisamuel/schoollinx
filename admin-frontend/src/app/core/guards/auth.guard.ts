import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.currentUser()?.role === 'ECOPOWER_ADMIN') {
    return true;
  }

  // Redirect to login page with selection of the return url
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
