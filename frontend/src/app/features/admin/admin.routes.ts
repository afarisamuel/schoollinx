import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const adminRoutes: Routes = [
    {
        path: 'audit-logs',
        loadComponent: () => import('./audit-logs/audit-logs.component').then(c => c.AuditLogsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'course-demand',
        loadComponent: () => import('./course-demand/course-demand.component').then(c => c.CourseDemandComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Course Demand Forecaster'
    },
    {
        path: 'retention-risk',
        loadComponent: () => import('./retention-risk/retention-risk.component').then(c => c.RetentionRiskComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Retention Risk Matrix'
    },

    {
        path: 'biometrics',
        loadComponent: () => import('../attendance/biometric-hub/biometric-hub.component').then(c => c.BiometricHubComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'academic-assignment',
        loadComponent: () => import('./academic-assignment/academic-assignment.component').then(c => c.AcademicAssignmentComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'department-management',
        loadComponent: () => import('./department-management/department-management.component').then(c => c.DepartmentManagementComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'executive-dashboard',
        loadComponent: () => import('./executive-dashboard/executive-dashboard.component').then(c => c.ExecutiveDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'library-hub',
        loadComponent: () => import('./library-hub/library-hub.component').then(c => c.LibraryHubComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'LIBRARIAN'] }
    },
    {
        path: 'student-enrollment',
        loadComponent: () => import('./student-enrollment/student-enrollment.component').then(c => c.StudentEnrollmentComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'teacher-assignments',
        loadComponent: () => import('./teacher-assignments/teacher-assignments.component').then(c => c.TeacherAssignmentsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'classes',
        loadComponent: () => import('./class-management/class-management.component').then(c => c.ClassManagementComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'subjects',
        loadComponent: () => import('./subjects/subjects.component').then(c => c.SubjectsComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'promotion-manager',
        loadComponent: () => import('./promotion-manager/promotion-manager.component').then(c => c.PromotionManagerComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'academic-periods',
        loadComponent: () => import('./academic-period-management/academic-period-management.component').then(c => c.AcademicPeriodManagementComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'scholastic-levels',
        loadComponent: () => import('./scholastic-level-management/scholastic-level-management.component').then(c => c.ScholasticLevelManagementComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'super-admin',
        loadComponent: () => import('./super-admin/super-admin.component').then(c => c.SuperAdminComponent),
        canActivate: [roleGuard],
        data: { roles: ['ECOPOWER_ADMIN'] }
    },
    {
        path: 'role-management',
        loadComponent: () => import('./role-management/role-management').then(c => c.RoleManagement),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'ECOPOWER_ADMIN'] },
        title: 'Role & Permission Matrix'
    }
];
