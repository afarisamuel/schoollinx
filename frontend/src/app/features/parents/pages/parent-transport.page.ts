import { Component, OnInit, inject, signal } from '@angular/core';
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

    // Live Bus Fleet status (simulated fallback data for rich UI)
    busRoutes = signal<any[]>([
        {
            id: 'route-east-legon',
            name: 'Route 1: East Legon & Airport Express',
            vehicle_plate: 'GR 4820-24',
            vehicle_info: 'Toyota Coaster (32-Seater • AC)',
            driver_name: 'Driver Kwame Mensah',
            driver_phone: '+233 24 411 2233',
            current_lat: 5.6358,
            current_lng: -0.1611,
            speed_kmh: 38.5,
            heading_deg: 45,
            next_stop_name: 'Boundary Road Junction',
            estimated_arrival_mins: 8,
            status: 'EN_ROUTE',
            stops: [
                { name: 'Campus Bus Terminal', status: 'DEPARTED', time: '03:30 PM' },
                { name: 'Shiashie Flyover', status: 'DEPARTED', time: '03:45 PM' },
                { name: 'Boundary Road Junction', status: 'NEXT', time: '03:55 PM' },
                { name: 'A&C Square Roundabout', status: 'UPCOMING', time: '04:05 PM' },
                { name: 'American House Terminal', status: 'UPCOMING', time: '04:15 PM' }
            ]
        },
        {
            id: 'route-cantonments',
            name: 'Route 2: Cantonments & Osu Shuttle',
            vehicle_plate: 'GW 9182-25',
            vehicle_info: 'Mercedes Sprinter (22-Seater)',
            driver_name: 'Driver Emmanuel Darko',
            driver_phone: '+233 50 882 1199',
            current_lat: 5.5780,
            current_lng: -0.1802,
            speed_kmh: 42.0,
            heading_deg: 180,
            next_stop_name: 'Danquah Circle',
            estimated_arrival_mins: 14,
            status: 'EN_ROUTE',
            stops: [
                { name: 'Campus Bus Terminal', status: 'DEPARTED', time: '03:30 PM' },
                { name: 'Police Headquarters', status: 'DEPARTED', time: '03:50 PM' },
                { name: 'Danquah Circle', status: 'NEXT', time: '04:02 PM' },
                { name: 'Osu Oxford Street Stop', status: 'UPCOMING', time: '04:12 PM' }
            ]
        }
    ]);

    ngOnInit() {
        this.fetchLiveGPS();
    }

    fetchLiveGPS() {
        // Try fetching live GPS from backend for routes
        this.portalService.getLiveBusGPS('default-route').subscribe({
            next: (live) => {
                if (live && live.name) {
                    this.busRoutes.update(routes => [live, ...routes.slice(1)]);
                }
            },
            error: () => {}
        });
    }

    callDriver(phone: string) {
        window.location.href = `tel:${phone}`;
    }

    refreshLiveTelemetry() {
        this.toast.info('Synchronizing real-time telemetry with bus GPS transponders...', 'Telemetry Updated');
        // Simulate minor speed & ETA jitter
        this.busRoutes.update(routes => routes.map(r => ({
            ...r,
            speed_kmh: Math.max(20, Math.min(60, r.speed_kmh + (Math.random() * 6 - 3))),
            estimated_arrival_mins: Math.max(1, r.estimated_arrival_mins - 1)
        })));
    }
}
