import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const teacherRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./teacher-list/teacher-list.component').then(c => c.TeacherListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'new',
        loadComponent: () => import('./teacher-form/teacher-form.component').then(c => c.TeacherFormComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./teacher-form/teacher-form.component').then(c => c.TeacherFormComponent)
    },
    {
        path: 'portal',
        loadComponent: () => import('./teacher-portal/teacher-portal.component').then(c => c.TeacherPortalComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'cbt-builder',
        loadComponent: () => import('./cbt-builder/cbt-builder.component').then(c => c.CbtBuilderComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER', 'ADMIN'] }
    },
    {
        path: 'attendance',
        loadComponent: () => import('../attendance/attendance-mark/attendance-mark.component').then(c => c.AttendanceMarkComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'grading',
        loadComponent: () => import('../grades/bulk-grading/bulk-grading.component').then(c => c.BulkGradingComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'homework',
        loadComponent: () => import('./homework-portal/homework-portal.component').then(c => c.HomeworkPortalComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'daily-collection',
        loadComponent: () => import('./daily-collection/daily-collection.component').then(c => c.DailyCollectionComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    }
];
