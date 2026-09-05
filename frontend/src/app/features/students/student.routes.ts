import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const studentRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./student-list/student-list.component').then(c => c.StudentListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'new',
        loadComponent: () => import('./student-form/student-form.component').then(c => c.StudentFormComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'details/:id',
        loadComponent: () => import('./student-detail/student-detail.component').then(c => c.StudentDetailComponent)
    },
    {
        path: 'id-cards',
        loadComponent: () => import('./id-card-studio/id-card-studio.component').then(c => c.IdCardStudioComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'class-assignment',
        loadComponent: () => import('./class-assignment/class-assignment.component').then(c => c.ClassAssignmentComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./student-form/student-form.component').then(c => c.StudentFormComponent)
    },
    {
        path: 'cbt/:id',
        loadComponent: () => import('./cbt-attempt/cbt-attempt.component').then(c => c.CbtAttemptComponent),
        canActivate: [roleGuard],
        data: { roles: ['STUDENT', 'ADMIN'] }
    },
    {
        path: ':studentId/grades',
        loadComponent: () => import('../grades/grade-list/grade-list.component').then(c => c.GradeListComponent)
    },
    {
        path: 'reports/generate',
        loadComponent: () => import('../academic/reports/report-generator.component').then(c => c.ReportGeneratorComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: ':studentId/grades/new',
        loadComponent: () => import('../grades/grade-form/grade-form.component').then(c => c.GradeFormComponent)
    },
    {
        path: ':studentId/grades/edit/:id',
        loadComponent: () => import('../grades/grade-form/grade-form.component').then(c => c.GradeFormComponent)
    },
    {
        path: ':studentId/report-card',
        loadComponent: () => import('./report-card/report-card.component').then(c => c.ReportCardComponent)
    },
    {
        path: 'admission-form',
        loadComponent: () => import('./admission-form/admission-form.component').then(c => c.AdmissionFormComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    },
    {
        path: 'admission-form/:id',
        loadComponent: () => import('./admission-form/admission-form.component').then(c => c.AdmissionFormComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] }
    }
];

