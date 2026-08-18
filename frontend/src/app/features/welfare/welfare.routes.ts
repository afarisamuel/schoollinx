import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const welfareRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./welfare-dashboard/welfare-dashboard.component').then(c => c.WelfareDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    }
];
