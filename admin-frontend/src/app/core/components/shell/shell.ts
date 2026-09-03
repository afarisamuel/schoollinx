import { Component, inject, ViewChild, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { CommandPaletteComponent } from '../command-palette/command-palette';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent,
    CommandPaletteComponent
  ],
  templateUrl: './shell.html',
  host: {
    'class': 'block h-full'
  }
})
export class ShellComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private platformId = inject(PLATFORM_ID);
  themeService = inject(ThemeService);

  // Sidebar state
  isSidebarCollapsed = signal<boolean>(false);
  isMobileSidebarOpen = signal<boolean>(false);

  // Dynamic Route Title
  currentRouteTitle = signal<string>('System Pulse');
  canGoBack = signal<boolean>(false);

  private sub = new Subscription();

  @ViewChild(CommandPaletteComponent) commandPalette?: CommandPaletteComponent;

  ngOnInit() {
    // Restore desktop collapsed sidebar state
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('schoollinx_admin_sidebar_collapsed');
      if (saved !== null) {
        this.isSidebarCollapsed.set(saved === 'true');
      }
    }

    this.updateRouteContext(this.router.url);

    this.sub.add(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe((event: any) => {
          this.isMobileSidebarOpen.set(false);
          this.updateRouteContext(event.urlAfterRedirects || event.url);
        })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private updateRouteContext(url: string) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.canGoBack.set(cleanUrl !== '/' && cleanUrl !== '/dashboard');

    const routeTitleMap: Record<string, string> = {
      '/dashboard': 'System Pulse & Telemetry',
      '/tenants/registry': 'Tenant Registry & Database Schemas',
      '/tenants/onboard': 'Provision Institution Node',
      '/tenants/onboarding-checklist': 'Institutional Launch Checklist',
      '/feature-flags': 'Global Feature Flag Manager',
      '/finance': 'MRR, ARR & Financial Intelligence',
      '/billing/alerts': 'Operational & Billing Alerts',
      '/billing/invoices': 'Institutional Invoice Generator',
      '/billing/plans': 'Subscription Plan Tiers & Limits',
      '/storage': 'Database & Document Storage Tracker',
      '/sms-management': 'SMS Gateway & Sender ID Approvals',
      '/announcements': 'Broadcast Notices & Email Dispatches',
      '/tenants/notes': 'Institutional CRM Timeline',
      '/support/tickets': 'Support Desk & Inquiries',
      '/contact-submissions': 'Public Contact Form Submissions',
      '/affiliates': 'Partner Affiliate Network',
      '/security': 'Security Ops & Global Whitelists',
      '/health': 'System Health & Service Pings',
      '/telemetry': 'Conversion Funnels & Error Telemetry',
      '/users/directory': 'Global Identity Directory',
      '/audit-logs': 'Immutable Compliance Audit Trail'
    };

    this.currentRouteTitle.set(routeTitleMap[cleanUrl] || 'Control Plane');
  }

  toggleSidebar() {
    // If mobile viewport, toggle mobile drawer
    if (window.innerWidth < 1024) {
      this.isMobileSidebarOpen.update(v => !v);
    } else {
      // Desktop collapse toggle with persistence
      this.isSidebarCollapsed.update(v => {
        const next = !v;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('schoollinx_admin_sidebar_collapsed', String(next));
        }
        return next;
      });
    }
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  goBack() {
    this.location.back();
  }

  openCommandPalette() {
    this.commandPalette?.toggle();
  }

  logout() {
    this.authService.logout();
  }
}
