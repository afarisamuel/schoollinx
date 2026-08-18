import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);

    const user = authService.currentUserValue;

    if (user) {
        // Check role boundaries if provided in route data
        const expectedRoles = route.data['roles'] as Array<string>;
        if (expectedRoles && !expectedRoles.includes(user.role)) {
            if (isBrowser) {
                router.navigate(['/']);
            }
            return false;
        }
        return true;
    }

    // On Server: Don't jump to conclusions (let browser hydration handle it)
    if (!isBrowser) {
        return true; 
    }

    // On Browser: Not logged in
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
};
