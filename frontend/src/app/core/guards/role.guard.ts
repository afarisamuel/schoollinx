import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../infrastructure/auth/auth.service';
import { map, take } from 'rxjs';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);
    
    const expectedRoles = route.data['roles'] as string[];

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (!user) {
                if (isBrowser) {
                    router.navigate(['/login']);
                }
                return isBrowser ? false : true; // Allow server render to continue
            }

            if (expectedRoles && !expectedRoles.includes(user.role)) {
                if (isBrowser) {
                    router.navigate(['/dashboard']);
                }
                return false;
            }

            return true;
        })
    );
};
