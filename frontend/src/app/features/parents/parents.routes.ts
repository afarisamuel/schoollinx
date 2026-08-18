import { Routes } from '@angular/router';

export const PARENT_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./parent-dashboard/parent-dashboard').then(c => c.ParentDashboard)
    },
    {
        path: 'bus-tracker',
        loadComponent: () => import('./bus-tracker/bus-tracker.component').then(c => c.BusTrackerComponent),
        title: 'Live Bus Tracker'
    }
];
