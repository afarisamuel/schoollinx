import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const communicationsRoutes: Routes = [
    {
        path: 'hub',
        loadComponent: () => import('./communications-hub/communications-hub.component').then(c => c.CommunicationsHubComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'campaigns',
        loadComponent: () => import('./campaign-builder/campaign-builder.component').then(c => c.CampaignBuilderComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'messages',
        loadComponent: () => import('./messaging-hub/messaging-hub.component').then(c => c.MessagingHubComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'TEACHER', 'GUARDIAN'] }
    },
    {
        path: 'inbox',
        loadComponent: () => import('./whatsapp-inbox/whatsapp-inbox.component').then(c => c.WhatsappInboxComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'BURSAR'] },
        title: 'WhatsApp Inbox'
    },
    {
        path: 'newsletter',
        loadComponent: () => import('./newsletter/newsletter.component').then(c => c.NewsletterComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        title: 'Parent Newsletters'
    }
];
