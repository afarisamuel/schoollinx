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
    
    const expectedRoles = (route.data['roles'] as string[]) || [];

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            if (!user) {
                if (isBrowser) {
                    const token = authService.getToken();
                    if (!token) {
                        router.navigate(['/login']);
                        return false;
                    }
                }
                return isBrowser ? false : true;
            }

            const userRoleStr = String(user.role || '').toUpperCase();

            // Super Admin (ECOPOWER_ADMIN / SUPER_ADMIN) has access to all routes
            if (userRoleStr === 'ECOPOWER_ADMIN' || userRoleStr === 'SUPER_ADMIN') {
                return true;
            }

            if (expectedRoles && expectedRoles.length > 0) {
                const normalizedExpected = expectedRoles.map(r => r.toUpperCase());
                
                // Comprehensive administrative roles that satisfy 'ADMIN' permission
                const adminRoles = [
                    'ADMIN', 'ADMINISTRATOR', 'HEADMASTER', 'PRINCIPAL', 
                    'IT_ADMIN', 'ECOPOWER_ADMIN', 'SUPER_ADMIN', 
                    'CLERK', 'SECRETARY', 'REGISTRAR', 'BURSAR', 'ACCOUNTANT',
                    'OPERATIONS_MANAGER', 'HR_MANAGER', 'LOGISTICS_MANAGER'
                ];

                const hasRole = normalizedExpected.some(r => {
                    if (r === userRoleStr) return true;
                    if (r === 'ADMIN' && adminRoles.includes(userRoleStr)) {
                        return true;
                    }
                    if ((r === 'GUARDIAN' || r === 'PARENT') && (userRoleStr === 'GUARDIAN' || userRoleStr === 'PARENT')) {
                        return true;
                    }
                    if ((r === 'TEACHER' || r === 'FACULTY') && (userRoleStr === 'TEACHER' || userRoleStr === 'FACULTY')) {
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

