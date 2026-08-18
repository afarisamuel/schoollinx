import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const hrRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./hr-shell/hr-shell').then(c => c.HrShell),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
            {
                path: '',
                loadComponent: () => import('./hr-dashboard/hr-dashboard').then(c => c.HrDashboard),
            },
            {
                path: 'staff',
                loadComponent: () => import('./staff-directory/staff-directory').then(c => c.StaffDirectory),
            },
            {
                path: 'staff/new',
                loadComponent: () => import('./staff-add/staff-add').then(c => c.StaffAdd),
            },
            {
                path: 'staff/:id/edit',
                loadComponent: () => import('./staff-edit/staff-edit').then(c => c.StaffEdit),
            },
            {
                path: 'payroll',
                loadComponent: () => import('./payroll-manager/payroll-manager').then(c => c.PayrollManager),
            },
            {
                path: 'leave',
                loadComponent: () => import('./leave-manager/leave-manager').then(c => c.LeaveManager),
            },
            {
                path: 'leave/new',
                loadComponent: () => import('./leave-add/leave-add').then(c => c.LeaveAdd),
            },
            {
                path: 'performance',
                loadComponent: () => import('./performance-reviews/performance-reviews').then(c => c.PerformanceReviews),
            },
            {
                path: 'development',
                loadComponent: () => import('./professional-development/professional-development').then(c => c.ProfessionalDevelopment),
            },
            {
                path: 'attendance',
                loadComponent: () => import('./staff-attendance/staff-attendance').then(c => c.StaffAttendancePage),
            },
            {
                path: 'onboarding/:staffId',
                loadComponent: () => import('./staff-onboarding/staff-onboarding.component').then(c => c.StaffOnboardingComponent),
            }
        ]
    }
];
