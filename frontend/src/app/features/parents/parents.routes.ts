import { Routes } from '@angular/router';

export const PARENT_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./parent-shell/parent-shell').then(c => c.ParentShell),
        children: [
            {
                path: '',
                loadComponent: () => import('./pages/parent-overview.page').then(c => c.ParentOverviewPage),
                title: 'Parent Portal - Overview'
            },
            {
                path: 'academics',
                loadComponent: () => import('./pages/parent-academics.page').then(c => c.ParentAcademicsPage),
                title: 'Parent Portal - Academics'
            },
            {
                path: 'finance',
                loadComponent: () => import('./pages/parent-finance.page').then(c => c.ParentFinancePage),
                title: 'Parent Portal - Finance & Fees'
            },
            {
                path: 'schedule',
                loadComponent: () => import('./pages/parent-schedule.page').then(c => c.ParentSchedulePage),
                title: 'Parent Portal - Schedule'
            },
            {
                path: 'homework',
                loadComponent: () => import('./pages/parent-homework.page').then(c => c.ParentHomeworkPage),
                title: 'Parent Portal - Homework'
            },
            {
                path: 'absence',
                loadComponent: () => import('./pages/parent-absence.page').then(c => c.ParentAbsencePage),
                title: 'Parent Portal - Leave & Absence'
            },
            {
                path: 'meetings',
                loadComponent: () => import('./pages/parent-meetings.page').then(c => c.ParentMeetingsPage),
                title: 'Parent Portal - Teacher Meetings'
            },
            {
                path: 'pickup',
                loadComponent: () => import('./pages/parent-pickup.page').then(c => c.ParentPickupPage),
                title: 'Parent Portal - Pickup Pass'
            },
            {
                path: 'health',
                loadComponent: () => import('./pages/parent-health.page').then(c => c.ParentHealthPage),
                title: 'Parent Portal - Health & Wellness'
            },
            {
                path: 'activities',
                loadComponent: () => import('./pages/parent-activities.page').then(c => c.ParentActivitiesPage),
                title: 'Parent Portal - Activities & Badges'
            },
            {
                path: 'notices',
                loadComponent: () => import('./pages/parent-notices.page').then(c => c.ParentNoticesPage),
                title: 'Parent Portal - School Notices'
            },
            {
                path: 'settings',
                loadComponent: () => import('./pages/parent-settings.page').then(c => c.ParentSettingsPage),
                title: 'Parent Portal - Settings'
            },
            {
                path: 'bus-tracker',
                loadComponent: () => import('./bus-tracker/bus-tracker.component').then(c => c.BusTrackerComponent),
                title: 'Live Bus Tracker'
            }
        ]
    }
];
