import { Component, inject, signal, OnInit, PLATFORM_ID, computed } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ThemeService } from '../../../core/infrastructure/theme/theme.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { WebsocketService, AppNotification } from '../../../core/infrastructure/websocket/websocket.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AiChatbotComponent } from '../../ui/ai-chatbot/ai-chatbot.component';
import { TenantProfileService, TenantProfile, SystemAnnouncement } from '../../../core/infrastructure/tenant-profile.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AiChatbotComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  themeService = inject(ThemeService);
  private wsService = inject(WebsocketService);
  private tenantProfileService = inject(TenantProfileService);

  currentUser = toSignal(this.authService.currentUser$);
  tenantProfile = signal<TenantProfile | null>(null);
  isBillingLocked = signal<boolean>(false);
  activeAnnouncements = signal<SystemAnnouncement[]>([]);

  currentRouteTitle = signal<string>('Dashboard');

  // Notifications State
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal<number>(0);
  isDropdownOpen = signal<boolean>(false);

  // Online/Offline status
  isOnline = signal<boolean>(true);

  // Back button visibility — hide on the root dashboard
  canGoBack = signal<boolean>(false);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    this.updateLayoutState();

    // Track online/offline status
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }

    // Load Tenant Profile to check billing
    this.tenantProfileService.getProfile().subscribe({
      next: (profile) => {
        this.tenantProfile.set(profile);
        if (profile.billing_due_date) {
          const dueDate = new Date(profile.billing_due_date);
          if (new Date() > dueDate) {
            this.isBillingLocked.set(true);
          }
        }
      },
      error: () => { }
    });

    // Load Global Announcements
    this.tenantProfileService.getActiveAnnouncements().subscribe({
      next: (announcements) => {
        this.activeAnnouncements.set(announcements);
      },
      error: () => { }
    });

    // Listen for global 402 Payment Required events from interceptor
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('billing-locked', () => {
        this.isBillingLocked.set(true);
      });
    }

    // Subscribe to incoming notifications
    this.wsService.messages$.subscribe(msg => {
      this.notifications.update(n => [msg, ...n]);
      if (!msg.read) {
        this.unreadCount.update(c => c + 1);
      }
    });

    // Update layout state on route changes
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateLayoutState();
      });
  }

  homeRoute = computed(() => {
    const role = this.currentUser()?.role;
    if (role === 'GUARDIAN') return '/parents';
    if (role === 'STUDENT') return '/portal';
    return '/dashboard';
  });

  private updateLayoutState() {
    const url = this.router.url;

    // Set back-button visibility based on current URL
    this.canGoBack.set(url !== '/dashboard' && url !== '/' && url !== '/parents' && url !== '/portal');

    if (url.includes('parents')) this.currentRouteTitle.set('Parent Portal');
    else if (url.includes('teachers')) this.currentRouteTitle.set('Faculty Workspace');
    else if (url.includes('portal')) this.currentRouteTitle.set('Student Portal');
    else if (url.includes('dashboard')) this.currentRouteTitle.set('Institutional Dashboard');
    else if (url.includes('students')) this.currentRouteTitle.set('Student Registry');
    else if (url.includes('program-management')) this.currentRouteTitle.set('Curriculum Management');
    else if (url.includes('department-management')) this.currentRouteTitle.set('Departmental Oversight');
    else if (url.includes('academic-assignment')) this.currentRouteTitle.set('Academic Assignments');
    else if (url.includes('subjects')) this.currentRouteTitle.set('Subject Registry');
    else if (url.includes('insights')) this.currentRouteTitle.set('Academic Intelligence');
    else if (url.includes('academic-periods')) this.currentRouteTitle.set('Academic Period Management');
    else if (url.includes('scholastic-levels')) this.currentRouteTitle.set('Scholastic Level Configuration');
    else if (url.includes('executive')) this.currentRouteTitle.set('Executive Statistics');
    else if (url.includes('alumni')) this.currentRouteTitle.set('Alumni Network');
    else if (url.includes('role-management')) this.currentRouteTitle.set('Role & Permission Matrix');
    else if (url.includes('profile')) this.currentRouteTitle.set('Security Settings');
    else if (url.includes('hr/attendance')) this.currentRouteTitle.set('Staff Attendance');
  }

  userInitial(): string {
    const user = this.currentUser();
    const firstChar = user?.username?.[0] || user?.email?.[0] || 'A';
    return firstChar.toUpperCase();
  }

  userName(): string {
    return this.currentUser()?.username || this.currentUser()?.email || 'User';
  }

  userRole(): string {
    return this.currentUser()?.role || 'STUDENT';
  }

  hasAccess(roles: string[]): boolean {
    const role = this.currentUser()?.role;
    if (!role) return false;
    if (role === 'ECOPOWER_ADMIN') return true; // Superuser access
    return roles.includes(role);
  }

  toggleNotifications(): void {
    this.isDropdownOpen.update(v => !v);
  }

  markAllAsRead(): void {
    this.unreadCount.set(0);
    this.notifications.update(n => n.map(msg => ({ ...msg, read: true })));
    this.isDropdownOpen.set(false);
  }

  goBack() {
    this.location.back();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
