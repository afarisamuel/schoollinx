import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const facilityRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./facility-dashboard/facility-dashboard.component').then(c => c.FacilityDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'assets',
        loadComponent: () => import('./asset-register/asset-register').then(c => c.AssetRegisterComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Asset Register'
    },
    {
        path: 'rooms',
        loadComponent: () => import('./room-booking/room-booking').then(c => c.RoomBookingComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Room Booking'
    }
];
