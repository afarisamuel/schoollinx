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
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tenants/onboard', component: TenantOnboardingComponent },
      { path: 'tenants/registry', component: TenantRegistryComponent },
      { path: 'tenants/onboarding-checklist', loadComponent: () => import('./features/onboarding-checklist/onboarding-checklist').then(m => m.OnboardingChecklistComponent) },
      { path: 'tenants/notes', loadComponent: () => import('./features/tenant-notes/tenant-notes').then(m => m.TenantNotesComponent) },
      { path: 'billing/alerts', loadComponent: () => import('./features/billing-alerts/billing-alerts').then(m => m.BillingAlertsComponent) },
      { path: 'billing/invoices', loadComponent: () => import('./features/invoices/invoices').then(m => m.InvoicesComponent) },
      { path: 'billing/plans', loadComponent: () => import('./features/plans/plans').then(m => m.PlansComponent) },
      { path: 'feature-flags', loadComponent: () => import('./features/feature-flags/feature-flags').then(m => m.FeatureFlagsComponent) },
      { path: 'storage', loadComponent: () => import('./features/storage-tracker/storage-tracker').then(m => m.StorageTrackerComponent) },
      { path: 'support/tickets', loadComponent: () => import('./features/support-tickets/support-tickets').then(m => m.SupportTicketsComponent) },
      { path: 'users/directory', component: GlobalDirectoryComponent },
      { path: 'audit-logs', component: AuditLogsComponent },
      { path: 'announcements', loadComponent: () => import('./features/announcements/announcements').then(m => m.AnnouncementsComponent) },
      { path: 'finance', loadComponent: () => import('./features/finance/finance').then(m => m.FinanceComponent) },
      { path: 'sms-management', loadComponent: () => import('./features/sms-management/sms-management').then(m => m.SmsManagementComponent) },
      { path: 'affiliates', loadComponent: () => import('./features/affiliates/affiliates').then(m => m.AffiliatesComponent) },
      { path: 'telemetry', loadComponent: () => import('./features/telemetry/telemetry').then(m => m.TelemetryComponent) },
      { path: 'security', loadComponent: () => import('./features/security/security').then(m => m.SecurityComponent) },
      { path: 'health', loadComponent: () => import('./features/health/health').then(m => m.HealthComponent) },
      { path: 'contact-submissions', loadComponent: () => import('./features/contact-submissions/contact-submissions').then(m => m.ContactSubmissionsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
