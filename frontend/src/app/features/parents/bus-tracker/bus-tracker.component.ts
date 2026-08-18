import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { BusLocation, TransportRoute } from '../../../core/domain/logistics.model';

@Component({
  selector: 'app-bus-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bus-tracker.component.html'
})
export class BusTrackerComponent implements OnInit, OnDestroy {
  routes = signal<TransportRoute[]>([]);
  selectedRouteId = signal<string>('');
  
  currentLocation = signal<BusLocation | null>(null);
  
  private pollInterval: any;

  constructor(private logisticsSvc: LogisticsService) {}

  ngOnInit() {
    this.logisticsSvc.getRoutes().subscribe(routes => {
      this.routes.set(routes);
      if (routes.length > 0) {
        this.selectRoute(routes[0].id!);
      }
    });
  }

  selectRoute(id: string) {
    this.selectedRouteId.set(id);
    this.loadLocation();
    
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.loadLocation(), 5000); // Poll every 5s
  }

  loadLocation() {
    if (!this.selectedRouteId()) return;
    this.logisticsSvc.getBusLocation(this.selectedRouteId()).subscribe(loc => {
      this.currentLocation.set(loc);
    });
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // Mock UI map coordinates
  get mapX(): number {
    const loc = this.currentLocation();
    if (!loc) return 50;
    // Map longitude (e.g. -0.1 to 0.1) to 0-100%
    return ((loc.longitude + 0.1) / 0.2) * 100;
  }

  get mapY(): number {
    const loc = this.currentLocation();
    if (!loc) return 50;
    // Map latitude (e.g. 5.5 to 5.7) to 0-100%
    return 100 - (((loc.latitude - 5.5) / 0.2) * 100);
  }
}
