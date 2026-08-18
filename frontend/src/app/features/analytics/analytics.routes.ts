import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const analyticsRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./dashboard/analytics-dashboard.component').then(c => c.AnalyticsDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'insights',
        loadComponent: () => import('./student-insights/student-insights.component').then(c => c.StudentInsightsComponent)
    },
    {
        path: 'at-risk',
        loadComponent: () => import('./at-risk-dashboard/at-risk-dashboard.component').then(c => c.AtRiskDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    }
];
