import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const portalRoutes: Routes = [
    {
        path: 'guardian',
        loadComponent: () => import('./guardian-portal/guardian-portal.component').then(c => c.GuardianPortalComponent),
        canActivate: [roleGuard],
        data: { roles: ['GUARDIAN'] }
    },
    {
        path: 'learning-path',
        loadComponent: () => import('./learning-path/learning-path.component').then(c => c.LearningPathComponent),
        canActivate: [roleGuard],
        data: { roles: ['STUDENT'] }
    },
    {
        path: 'homework',
        loadComponent: () => import('./student-homework/student-homework.component').then(c => c.StudentHomeworkComponent),
        canActivate: [roleGuard],
        data: { roles: ['STUDENT'] }
    },
    {
        path: 'staff',
        loadComponent: () => import('./staff-portal/staff-portal.component').then(c => c.StaffPortalComponent),
        canActivate: [roleGuard],
        data: { roles: ['STAFF', 'TEACHER'] }
    }
];
