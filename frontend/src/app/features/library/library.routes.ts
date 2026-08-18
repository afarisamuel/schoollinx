import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const libraryRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./book-catalog/book-catalog.component').then(c => c.BookCatalogComponent)
    },
    {
        path: 'admin',
        loadComponent: () => import('./lending-dashboard/lending-dashboard.component').then(c => c.LendingDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'add',
        loadComponent: () => import('./book-form/book-form.component').then(c => c.BookFormComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    }
];
