import { Component, input, output, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/infrastructure/theme/theme.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { AppNotification } from '../../../core/infrastructure/websocket/websocket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  // Inputs
  currentRouteTitle = input<string>('Dashboard');
  unreadCount = input<number>(0);
  notifications = input<AppNotification[]>([]);
  canGoBack = input<boolean>(false);

  // Outputs
  toggleMobile = output<void>();
  goBack = output<void>();
  markRead = output<void>();

  // Dropdown States
  isNotificationsOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);

  userInitial(): string {
    const user = this.authService.currentUserValue;
    const firstChar = user?.username?.[0] || user?.email?.[0] || 'A';
    return firstChar.toUpperCase();
  }

  userName(): string {
    const user = this.authService.currentUserValue;
    return (user?.username || user?.email || 'Afari Adusei').toUpperCase();
  }

  userRole(): string {
    const role = this.authService.currentUserValue?.role;
    if (role === 'TEACHER') return 'FACULTY';
    if (role === 'GUARDIAN') return 'PARENT';
    if (role === 'STUDENT') return 'STUDENT';
    return 'ADMIN';
  }

  toggleFullscreen(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen.set(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        this.isFullscreen.set(false);
      }
    }
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    if (this.isUserMenuOpen()) this.isUserMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
    if (this.isNotificationsOpen()) this.isNotificationsOpen.set(false);
  }

  onMarkAllAsRead(): void {
    this.markRead.emit();
    this.isNotificationsOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
