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
        path: 'assignments',
        loadComponent: () => import('../admin/teacher-assignments/teacher-assignments.component').then(c => c.TeacherAssignmentsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Assign Teachers to Classes & Subjects'
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
        path: 'scanner',
        loadComponent: () => import('../attendance/barcode-scanner/barcode-attendance-scanner.component').then(c => c.BarcodeAttendanceScannerComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER'] },
        title: 'Barcode & QR Attendance Scanner'
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
    },
    {
        path: 'lessons',
        loadComponent: () => import('./pages/teacher-lessons/teacher-lessons.component').then(c => c.TeacherLessonsComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'seating',
        loadComponent: () => import('./pages/teacher-seating/teacher-seating.component').then(c => c.TeacherSeatingComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'timetable',
        loadComponent: () => import('./pages/teacher-timetable/teacher-timetable.component').then(c => c.TeacherTimetableComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'consultations',
        loadComponent: () => import('./pages/teacher-consultations/teacher-consultations.component').then(c => c.TeacherConsultationsComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'notices',
        loadComponent: () => import('./pages/teacher-notices/teacher-notices.component').then(c => c.TeacherNoticesComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'cover-board',
        loadComponent: () => import('./pages/teacher-cover-board/teacher-cover-board.component').then(c => c.TeacherCoverBoardComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'sickbay',
        loadComponent: () => import('./pages/teacher-sickbay/teacher-sickbay.component').then(c => c.TeacherSickbayComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'conduct',
        loadComponent: () => import('./pages/teacher-conduct/teacher-conduct.component').then(c => c.TeacherConductComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'ai-copilot',
        loadComponent: () => import('./pages/teacher-ai-copilot/teacher-ai-copilot.component').then(c => c.TeacherAiCopilotComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    },
    {
        path: 'hr-vault',
        loadComponent: () => import('./pages/teacher-hr-vault/teacher-hr-vault.component').then(c => c.TeacherHrVaultComponent),
        canActivate: [roleGuard],
        data: { roles: ['TEACHER'] }
    }
];
