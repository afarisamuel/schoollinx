import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';

@Component({
    selector: 'app-parent-notices',
    standalone: true,
    imports: [CommonModule, DatePipe],
    templateUrl: './parent-notices.page.html'
})
export class ParentNoticesPage implements OnInit {
    state = inject(ParentStateService);
    private portalService = inject(ParentPortalService);

    filter = signal('ALL');
    emergencyBroadcasts = signal<any[]>([]);

    ngOnInit() {
        this.loadBroadcasts();
    }

    loadBroadcasts() {
        this.portalService.getEmergencyBroadcasts().subscribe({
            next: (data) => this.emergencyBroadcasts.set(data || []),
            error: () => {}
        });
    }

    filtered() {
        const f = this.filter();
        if (f === 'ALL') return this.state.notices();
        return this.state.notices().filter(n => n.target === f || n.target === 'ALL');
    }
}
