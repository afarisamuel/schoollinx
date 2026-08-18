import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const logisticsRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./logistics-dashboard/logistics-dashboard.component').then(c => c.LogisticsDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    }
];
