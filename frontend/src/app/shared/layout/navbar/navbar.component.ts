import { Component, input, output, signal, inject, PLATFORM_ID, ElementRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/infrastructure/theme/theme.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { NotificationService, Notification } from '../../../core/infrastructure/notifications/notification.service';
import { SearchService } from '../../../core/infrastructure/search/search.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  searchService = inject(SearchService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);

  // Inputs
  currentRouteTitle = input<string>('Dashboard');
  unreadCount = input<number>(0);
  notifications = input<Notification[]>([]);
  canGoBack = input<boolean>(false);

  // Outputs
  toggleSidebar = output<void>();
  toggleMobile = output<void>();
  goBack = output<void>();
  markRead = output<void>();

  // Dropdown States
  isNotificationsOpen = signal<boolean>(false);
  isUserMenuOpen = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);

  // Close dropdowns on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      if (this.isNotificationsOpen()) this.isNotificationsOpen.set(false);
      if (this.isUserMenuOpen()) this.isUserMenuOpen.set(false);
    }
  }

  // Close on Escape key
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isNotificationsOpen()) this.isNotificationsOpen.set(false);
    if (this.isUserMenuOpen()) this.isUserMenuOpen.set(false);
  }

  openSearch(): void {
    this.searchService.open();
  }

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

  toggleNotifications(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isNotificationsOpen.update(v => !v);
    if (this.isUserMenuOpen()) this.isUserMenuOpen.set(false);
  }

  toggleUserMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isUserMenuOpen.update(v => !v);
    if (this.isNotificationsOpen()) this.isNotificationsOpen.set(false);
  }

  onMarkAllAsRead(): void {
    this.markRead.emit();
    this.isNotificationsOpen.set(false);
  }

  onMarkAsRead(id: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.notificationService.markAsRead(id);
  }

  getTypeIcon(type: Notification['type']): string {
    return this.notificationService.getTypeIcon(type);
  }

  logout(): void {
    this.authService.logout();
  }
}
