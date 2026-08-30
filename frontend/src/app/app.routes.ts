import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';
import { authGuard } from './core/infrastructure/auth/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const publicRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./shared/layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
        children: [
            { path: '', loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent) },
            { path: 'pricing', loadComponent: () => import('./features/public/pricing/pricing.component').then(m => m.PricingComponent) },
            { path: 'features', loadComponent: () => import('./features/public/features/features.component').then(m => m.FeaturesComponent) },
            { path: 'contact', loadComponent: () => import('./features/public/contact/contact.component').then(m => m.ContactComponent) },
            { path: 'how-it-works', loadComponent: () => import('./features/public/how-it-works/how-it-works').then(m => m.HowItWorks) },
            { path: 'case-studies', loadComponent: () => import('./features/public/case-studies/case-studies').then(m => m.CaseStudies) },
            { path: 'blog', loadComponent: () => import('./features/public/blog/blog').then(m => m.Blog) },
            { path: 'updates', loadComponent: () => import('./features/public/updates/updates').then(m => m.Updates) },
            { path: 'press', loadComponent: () => import('./features/public/press/press').then(m => m.Press) },
            { path: 'for-principals', loadComponent: () => import('./features/public/for-principals/for-principals').then(m => m.ForPrincipals) },
            { path: 'for-teachers', loadComponent: () => import('./features/public/for-teachers/for-teachers').then(m => m.ForTeachers) },
            { path: 'for-parents', loadComponent: () => import('./features/public/for-parents/for-parents').then(m => m.ForParents) }
        ]
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./features/public/signup/signup').then(m => m.SignupComponent)
    },
    {
        path: 'verify/transcript/:hash',
        loadComponent: () => import('./features/public/transcript-verify/transcript-verify.component').then(m => m.TranscriptVerifyComponent),
        title: 'Verifiable Document Registry'
    },
    { path: '**', redirectTo: '' }
];

export const tenantRoutes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent)
            },
            {
                path: 'hub/:hubId',
                loadComponent: () => import('./features/hub/hub-page.component').then(c => c.HubPageComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/auth/profile-settings/profile-settings').then(c => c.ProfileSettings),
                title: 'Security Settings'
            },
            {
                path: 'verify/transcript/:hash',
                loadComponent: () => import('./features/public/transcript-verify/transcript-verify.component').then(m => m.TranscriptVerifyComponent),
                title: 'Verifiable Document Registry'
            },
            // Feature Routes
            {
                path: 'students',
                loadChildren: () => import('./features/students/student.routes').then(m => m.studentRoutes)
            },
            {
                path: 'teachers',
                loadChildren: () => import('./features/teachers/teacher.routes').then(m => m.teacherRoutes)
            },
            {
                path: 'guardians',
                loadChildren: () => import('./features/guardians/guardian.routes').then(m => m.guardianRoutes)
            },
            {
                path: 'analytics',
                loadChildren: () => import('./features/analytics/analytics.routes').then(m => m.analyticsRoutes)
            },
            {
                path: 'library',
                loadChildren: () => import('./features/library/library.routes').then(m => m.libraryRoutes)
            },
            {
                path: 'exams',
                loadChildren: () => import('./features/exams/exams.routes').then(m => m.examsRoutes)
            },
            {
                path: 'communications',
                loadChildren: () => import('./features/communications/communications.routes').then(m => m.communicationsRoutes)
            },
            {
                path: 'portal',
                loadChildren: () => import('./features/portal/portal.routes').then(m => m.portalRoutes)
            },
            // Admin management routes (flattened)
            {
                path: '',
                loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
            },
            {
                path: 'biometrics',
                loadComponent: () => import('./features/attendance/biometric-hub/biometric-hub.component').then(c => c.BiometricHubComponent),
                title: 'Biometric Command Center'
            },
            {
                path: 'notifications',
                loadComponent: () => import('./features/notifications/notification-center.component').then(c => c.NotificationCenterComponent),
                title: 'Notification Center'
            },
            // Miscellaneous standalone routes

            {
                path: 'resources',
                loadComponent: () => import('./features/resources/resource-list/resource-list.component').then(c => c.ResourceListComponent)
            },
            {
                path: 'clubs',
                loadComponent: () => import('./features/extracurricular/club-discovery/club-discovery.component').then(c => c.ClubDiscoveryComponent)
            },
            {
                path: 'alumni',
                loadComponent: () => import('./features/alumni/alumni-list/alumni-list.component').then(c => c.AlumniListComponent)
            },
            {
                path: 'fiscal',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/fiscal/fiscal-dashboard/fiscal-dashboard.component').then(c => c.FiscalDashboardComponent),
                        title: ' Financial Ledger'
                    },
                    {
                        path: 'intelligence',
                        loadComponent: () => import('./features/fiscal/fiscal-intelligence/fiscal-intelligence.component').then(c => c.FiscalIntelligenceComponent),
                        title: 'System Intelligence & Recommendations'
                    },
                    {
                        path: 'fees',
                        loadComponent: () => import('./features/fiscal/configure-fees/configure-fees.component').then(c => c.ConfigureFeesComponent),
                        title: 'Configure Fees'
                    },
                    {
                        path: 'billing',
                        loadComponent: () => import('./features/fiscal/subscription-billing/subscription-billing.component').then(c => c.SubscriptionBillingComponent),
                        title: 'Subscription & Billing'
                    },
                    {
                        path: 'budget',
                        loadComponent: () => import('./features/fiscal/budget-planning/budget-planning').then(c => c.BudgetPlanningComponent),
                        title: 'Budget Planning'
                    },
                    {
                        path: 'wallet',
                        loadComponent: () => import('./features/fiscal/wallet/wallet.component').then(c => c.WalletComponent),
                        title: 'Digital Wallet & Canteen'
                    },
                    {
                        path: 'claims',
                        loadComponent: () => import('./features/fiscal/expense-claims/expense-claims').then(c => c.ExpenseClaimsComponent),
                        title: 'Expense Claims'
                    },
                    {
                        path: 'ledger',
                        loadComponent: () => import('./features/fiscal/ledger/ledger.component').then(c => c.LedgerComponent),
                        title: 'General Ledger'
                    },
                    {
                        path: 'scholarships',
                        loadComponent: () => import('./features/fiscal/scholarships/scholarships.component').then(c => c.ScholarshipsComponent),
                        title: 'Scholarships & Waivers'
                    }
                ],
                canActivate: [roleGuard],
                data: { roles: ['ADMIN'] }
            },
            {
                path: 'welfare',
                loadChildren: () => import('./features/welfare/welfare.routes').then(m => m.welfareRoutes)
            },
            {
                path: 'operations',
                loadComponent: () => import('./features/operations/operations-dashboard/operations-dashboard.component').then(c => c.OperationsDashboardComponent),
                canActivate: [roleGuard],
                data: { roles: ['ADMIN'] },
                title: 'Operations & Inventory'
            },
            {
                path: 'house-points',
                loadComponent: () => import('./features/house-points/leaderboard/leaderboard.component').then(c => c.LeaderboardComponent)
            },
            {
                path: 'logistics',
                loadChildren: () => import('./features/logistics/logistics.routes').then(m => m.logisticsRoutes)
            },
            {
                path: 'hr',
                loadChildren: () => import('./features/hr/hr.routes').then(m => m.hrRoutes)
            },
            {
                path: 'parents',
                loadChildren: () => import('./features/parents/parents.routes').then(m => m.PARENT_ROUTES)
            },
            {
                path: 'library-hub',
                loadChildren: () => import('./features/library/library.routes').then(m => m.libraryRoutes)
            },
            {
                path: 'facility',
                loadChildren: () => import('./features/facility/facility.routes').then(m => m.facilityRoutes)
            },
            {
                path: 'timetable',
                loadChildren: () => import('./features/timetable/timetable.routes').then(m => m.timetableRoutes)
            },
            {
                path: 'campus-ops',
                loadChildren: () => import('./features/campus-ops/campus-ops.routes').then(m => m.campusOpsRoutes)
            }
        ]
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./features/public/signup/signup').then(m => m.SignupComponent)
    },
    {
        path: 'setup-password',
        loadComponent: () => import('./features/auth/setup-password/setup-password.component').then(m => m.SetupPasswordComponent)
    },
    {
        path: 'change-password',
        loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent)
    },
    { path: '**', redirectTo: '' }
];
