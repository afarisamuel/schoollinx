import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  userInitial(): string {
    const user = this.authService.currentUserValue;
    const firstChar = user?.username?.[0] || user?.email?.[0] || 'A';
    return firstChar.toUpperCase();
  }

  userName(): string {
    const user = this.authService.currentUserValue;
    return user?.username || user?.email || 'User';
  }

  userRole(): string {
    const role = this.authService.currentUserValue?.role;
    if (role === 'TEACHER') return 'Faculty';
    if (role === 'GUARDIAN') return 'Parent / Guardian';
    if (role === 'STUDENT') return 'Student';
    return 'Administrator';
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
