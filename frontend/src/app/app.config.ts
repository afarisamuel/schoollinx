import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { publicRoutes, tenantRoutes } from './app.routes';
import { isTenantDomain } from './core/utils/tenant.util';

import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { errorToastInterceptor } from './core/interceptors/error-toast.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

const activeRoutes = isTenantDomain() ? tenantRoutes : publicRoutes;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(activeRoutes),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([tenantInterceptor, authInterceptor, errorToastInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
