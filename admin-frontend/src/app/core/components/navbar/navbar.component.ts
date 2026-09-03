import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  themeService = inject(ThemeService);
  private tenantService = inject(TenantService);

  currentRouteTitle = input<string>('System Pulse');
  canGoBack = input<boolean>(false);

  toggleSidebar = output<void>();
  goBack = output<void>();
  openCommandPalette = output<void>();

  alertCount = signal<number>(0);

  ngOnInit() {
    this.tenantService.getBillingAlerts().subscribe({
      next: (alerts) => this.alertCount.set(alerts?.length || 0),
      error: () => this.alertCount.set(0)
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
