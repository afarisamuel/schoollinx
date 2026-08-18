import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const timetableRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./timetable-view/timetable.component').then(c => c.TimetableComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER', 'STUDENT'] }
    },
    {
        path: 'manage',
        loadComponent: () => import('./timetable-manager/timetable-manager.component').then(c => c.TimetableManagerComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'exams',
        loadComponent: () => import('./exam-scheduler/exam-scheduler.component').then(c => c.ExamSchedulerComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    }
];
