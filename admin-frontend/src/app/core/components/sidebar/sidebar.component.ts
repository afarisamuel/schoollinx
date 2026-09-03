import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

export interface NavGroup {
  name: string;
  items: NavItem[];
}

export interface NavItem {
  name: string;
  route: string;
  icon: string;
  badge?: string;
  badgeClass?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  isCollapsed = input<boolean>(false);
  isMobileOpen = input<boolean>(false);

  toggleCollapse = output<void>();
  closeMobile = output<void>();
  openCommandPalette = output<void>();

  searchQuery = signal<string>('');

  navGroups: NavGroup[] = [
    {
      name: 'Core Infrastructure',
      items: [
        { name: 'System Pulse', route: '/dashboard', icon: 'pulse' },
        { name: 'Tenant Registry', route: '/tenants/registry', icon: 'building' },
        { name: 'Provision School', route: '/tenants/onboard', icon: 'plus' },
        { name: 'Launch Checklist', route: '/tenants/onboarding-checklist', icon: 'check' },
        { name: 'Feature Flags', route: '/feature-flags', icon: 'flag' }
      ]
    },
    {
      name: 'Billing & Finance',
      items: [
        { name: 'MRR / Financials', route: '/finance', icon: 'chart' },
        { name: 'Billing Alerts', route: '/billing/alerts', icon: 'bell', badge: 'LIVE', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
        { name: 'Invoice Generator', route: '/billing/invoices', icon: 'receipt' },
        { name: 'Plan Tiers & Pricing', route: '/billing/plans', icon: 'plans' },
        { name: 'Storage & Quotas', route: '/storage', icon: 'database' }
      ]
    },
    {
      name: 'Communication & CRM',
      items: [
        { name: 'SMS & Sender IDs', route: '/sms-management', icon: 'chat' },
        { name: 'Broadcasts & Emails', route: '/announcements', icon: 'broadcast' },
        { name: 'CRM Notes Log', route: '/tenants/notes', icon: 'notes' },
        { name: 'Support Desk', route: '/support/tickets', icon: 'ticket' },
        { name: 'Contact Submissions', route: '/contact-submissions', icon: 'inbox' },
        { name: 'Partner Affiliates', route: '/affiliates', icon: 'users' }
      ]
    },
    {
      name: 'Security & Auditing',
      items: [
        { name: 'Security Center', route: '/security', icon: 'shield' },
        { name: 'System Health', route: '/health', icon: 'heart' },
        { name: 'Telemetry & Logs', route: '/telemetry', icon: 'activity' },
        { name: 'Global Directory', route: '/users/directory', icon: 'directory' },
        { name: 'Audit Trail', route: '/audit-logs', icon: 'ledger' }
      ]
    }
  ];

  filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.navGroups;

    return this.navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.name.toLowerCase().includes(q))
      }))
      .filter(group => group.items.length > 0);
  });

  onNavClick() {
    this.closeMobile.emit();
  }

  logout() {
    this.authService.logout();
  }
}
