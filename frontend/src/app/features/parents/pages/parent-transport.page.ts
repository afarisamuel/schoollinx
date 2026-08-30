import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-transport',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-transport.page.html'
})
export class ParentTransportPage implements OnInit {
    state = inject(ParentStateService);
    private portalService = inject(ParentPortalService);
    private toast = inject(ToastService);

    // Live Bus Fleet status loaded directly from real backend database
    busRoutes = signal<any[]>([]);
    loading = signal<boolean>(true);
    refreshing = signal<boolean>(false);
    assignedWards = signal<Record<string, string[]>>({}); // routeId -> [wardName]

    ngOnInit() {
        this.loadRealTransportData();
    }

    loadRealTransportData() {
        this.loading.set(true);
        this.portalService.getAllBusRoutes().subscribe({
            next: (routes) => {
                this.busRoutes.set(routes || []);
                this.loading.set(false);
                this.checkWardAssignments(routes || []);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    checkWardAssignments(routes: any[]) {
        const students = this.state.profile()?.students || [];
        for (const s of students) {
            if (s.id) {
                this.portalService.getStudentBusAssignment(s.id).subscribe({
                    next: (assignment) => {
                        if (assignment && assignment.route_id) {
                            const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Ward';
                            this.assignedWards.update(m => {
                                const list = m[assignment.route_id] || [];
                                if (!list.includes(name)) {
                                    return { ...m, [assignment.route_id]: [...list, name] };
                                }
                                return m;
                            });
                        }
                    },
                    error: () => {}
                });
            }
        }
    }

    callDriver(phone: string) {
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    }

    refreshLiveTelemetry() {
        this.refreshing.set(true);
        this.portalService.getAllBusRoutes().subscribe({
            next: (routes) => {
                this.refreshing.set(false);
                if (routes && routes.length > 0) {
                    this.busRoutes.set(routes);
                    this.toast.success('Live GPS transponder telemetry synchronized with satellite feeds.', 'Telemetry Updated');
                } else {
                    this.toast.info('Telemetry checked: No updates from transponders.', 'Status Checked');
                }
            },
            error: () => {
                this.refreshing.set(false);
                this.toast.error('Failed to communicate with campus bus transponder network.', 'Connection Error');
            }
        });
    }
}
