import { Routes } from '@angular/router';
import { ShellComponent } from './core/components/shell/shell';
import { DashboardComponent } from './features/dashboard/dashboard';
import { AuditLogsComponent } from './features/audit-logs/audit-logs';
import { TenantOnboardingComponent } from './features/tenant-onboarding/tenant-onboarding.component';
import { GlobalDirectoryComponent } from './features/global-directory/global-directory';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { authGuard } from './core/guards/auth.guard';

import { TenantRegistryComponent } from './features/tenant-registry/tenant-registry.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tenants/onboard', component: TenantOnboardingComponent },
      { path: 'tenants/registry', component: TenantRegistryComponent },
      { path: 'users/directory', component: GlobalDirectoryComponent },
      { path: 'audit-logs', component: AuditLogsComponent },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements').then(m => m.AnnouncementsComponent) },
      { path: 'finance', loadComponent: () => import('./features/finance/finance').then(m => m.FinanceComponent) },
      { path: 'affiliates', loadComponent: () => import('./features/affiliates/affiliates').then(m => m.AffiliatesComponent) },
      { path: 'telemetry', loadComponent: () => import('./features/telemetry/telemetry').then(m => m.TelemetryComponent) },
      { path: 'security', loadComponent: () => import('./features/security/security').then(m => m.SecurityComponent) },
      { path: 'health', loadComponent: () => import('./features/health/health').then(m => m.HealthComponent) },
      { path: 'contact-submissions', loadComponent: () => import('./features/contact-submissions/contact-submissions').then(m => m.ContactSubmissionsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
