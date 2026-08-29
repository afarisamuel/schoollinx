import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const guardianRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./guardian-list/guardian-list.component').then(c => c.GuardianListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] },
        title: 'Guardian & Parent Registry'
    },
    {
        path: ':id',
        loadComponent: () => import('./guardian-detail/guardian-detail.component').then(c => c.GuardianDetailComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] },
        title: 'Guardian Profile & Wards'
    }
];
