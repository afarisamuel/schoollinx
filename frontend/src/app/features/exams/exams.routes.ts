import { Routes } from '@angular/router';

export const examsRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./exam-list/exam-list.component').then(c => c.ExamListComponent),
        title: 'Exam Management'
    },
    {
        path: ':id',
        loadComponent: () => import('./exam-detail/exam-detail.component').then(c => c.ExamDetailComponent),
        title: 'Exam Details'
    }
];
