import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-shell',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './parent-shell.html'
})
export class ParentShell implements OnInit {
    state = inject(ParentStateService);
    private router = inject(Router);

    isOverviewPage = signal(true);

    navItems = [
        { path: '/parents', label: 'Overview', icon: 'fa-home', exact: true },
        { path: '/parents/academics', label: 'Academics', icon: 'fa-book-open' },
        { path: '/parents/finance', label: 'Finance & Fees', icon: 'fa-receipt',
          badge: computed(() => (this.state.familyLedger()?.total_family_balance || 0) > 0 ? 1 : 0),
          badgeClass: 'bg-rose-500/20 text-rose-400' },
        { path: '/parents/schedule', label: 'Schedule', icon: 'fa-calendar-alt' },
        { path: '/parents/homework', label: 'Homework', icon: 'fa-tasks' },
        { path: '/parents/absence', label: 'Leave & Absence', icon: 'fa-calendar-times',
          badge: computed(() => this.state.absenceRequests().filter(a => a.status === 'PENDING').length),
          badgeClass: 'bg-amber-500/20 text-amber-400' },
        { path: '/parents/meetings', label: 'Meetings', icon: 'fa-handshake' },
        { path: '/parents/pickup', label: 'Pickup Pass', icon: 'fa-qrcode' },
        { path: '/parents/health', label: 'Health', icon: 'fa-heartbeat' },
        { path: '/parents/activities', label: 'Activities', icon: 'fa-trophy' },
        { path: '/parents/notices', label: 'Notices', icon: 'fa-bullhorn',
          badge: computed(() => this.state.notices().length),
          badgeClass: 'bg-cyan-500/20 text-cyan-400' },
        { path: '/parents/settings', label: 'Settings', icon: 'fa-cog' },
    ];

    ngOnInit() {
        this.state.bootstrap();
        this.checkRoute(this.router.url);

        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e: any) => {
                this.checkRoute(e.urlAfterRedirects || e.url);
            });
    }

    private checkRoute(url: string) {
        const clean = url.split('?')[0].replace(/\/$/, '');
        this.isOverviewPage.set(clean === '/parents' || clean === '');
    }
}
