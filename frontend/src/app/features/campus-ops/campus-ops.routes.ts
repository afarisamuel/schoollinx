import { Routes } from '@angular/router';
import { authGuard } from '../../core/infrastructure/auth/auth.guard';
import { LostAndFoundComponent } from './lost-and-found/lost-and-found.component';
import { VisitorManagementComponent } from './visitor-management/visitor-management.component';
import { DisciplinaryComponent } from './disciplinary/disciplinary.component';

export const campusOpsRoutes: Routes = [
    {
        path: 'lost-and-found',
        component: LostAndFoundComponent,
        canActivate: [authGuard]
    },
    {
        path: 'visitor-management',
        component: VisitorManagementComponent,
        canActivate: [authGuard]
    },
    {
        path: 'disciplinary',
        component: DisciplinaryComponent,
        canActivate: [authGuard]
    }
];
