import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../infrastructure/auth/auth.service';
import { Role } from '../domain/user.model';
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
                return isBrowser ? false : true;
            }

            // Super Admin (ECOPOWER_ADMIN) has access to all admin-accessible routes
            if (user.role === Role.ECOPOWER_ADMIN || (user.role as string) === 'ECOPOWER_ADMIN') {
                return true;
            }

            if (expectedRoles && expectedRoles.length > 0) {
                const userRoleStr = String(user.role);
                const hasRole = expectedRoles.some(r => {
                    if (r === userRoleStr) return true;
                    if (r === 'ADMIN' && (userRoleStr === 'ADMIN' || userRoleStr === 'HEADMASTER' || userRoleStr === 'IT_ADMIN' || userRoleStr === 'ECOPOWER_ADMIN')) {
                        return true;
                    }
                    if ((r === 'GUARDIAN' || r === 'PARENT') && (userRoleStr === 'GUARDIAN' || userRoleStr === 'PARENT')) {
                        return true;
                    }
                    return false;
                });

                if (!hasRole) {
                    if (isBrowser) {
                        router.navigate(['/dashboard']);
                    }
                    return false;
                }
            }

            return true;
        })
    );
};

