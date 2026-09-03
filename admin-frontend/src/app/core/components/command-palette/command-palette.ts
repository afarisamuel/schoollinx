import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService, Tenant } from '../../services/tenant.service';
import { ThemeService } from '../../services/theme.service';

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'NAVIGATION' | 'TENANT' | 'QUICK_ACTION';
  icon: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.html'
})
export class CommandPaletteComponent implements OnInit {
  private router = inject(Router);
  private tenantService = inject(TenantService);
  private themeService = inject(ThemeService);

  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);
  tenants = signal<Tenant[]>([]);

  // Listen for Cmd+K / Ctrl+K
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    } else if (event.key === 'ArrowDown' && this.isOpen()) {
      event.preventDefault();
      const max = this.filteredCommands().length - 1;
      this.selectedIndex.update(i => (i < max ? i + 1 : 0));
    } else if (event.key === 'ArrowUp' && this.isOpen()) {
      event.preventDefault();
      const max = this.filteredCommands().length - 1;
      this.selectedIndex.update(i => (i > 0 ? i - 1 : max));
    } else if (event.key === 'Enter' && this.isOpen()) {
      event.preventDefault();
      const items = this.filteredCommands();
      const idx = this.selectedIndex();
      if (items[idx]) {
        items[idx].action();
        this.close();
      }
    }
  }

  navigationCommands: CommandItem[] = [
    { id: 'nav-dash', title: 'System Pulse Dashboard', subtitle: 'View real-time platform metrics & active sessions', category: 'NAVIGATION', icon: 'pulse', action: () => this.navigate('/dashboard') },
    { id: 'nav-reg', title: 'Tenant Registry', subtitle: 'Manage all provisioned school organizations & schemas', category: 'NAVIGATION', icon: 'building', action: () => this.navigate('/tenants/registry') },
    { id: 'nav-onboard', title: 'Provision Infrastructure', subtitle: 'Onboard a new school with isolated Postgres schema', category: 'NAVIGATION', icon: 'plus', action: () => this.navigate('/tenants/onboard') },
    { id: 'nav-checklist', title: 'Onboarding Checklist', subtitle: 'Readiness checklist & launch milestones', category: 'NAVIGATION', icon: 'check', action: () => this.navigate('/tenants/onboarding-checklist') },
    { id: 'nav-alerts', title: 'Billing & Operational Alerts', subtitle: 'Overdue invoices, expiring trials & low SMS credits', category: 'NAVIGATION', icon: 'bell', action: () => this.navigate('/billing/alerts') },
    { id: 'nav-invoices', title: 'Invoice Generator', subtitle: 'Generate institutional billing invoices & PDF receipts', category: 'NAVIGATION', icon: 'receipt', action: () => this.navigate('/billing/invoices') },
    { id: 'nav-plans', title: 'Subscription Plan Tiers & Limits', subtitle: 'Configure platform tiers, per-student rates & included modules', category: 'NAVIGATION', icon: 'plans', action: () => this.navigate('/billing/plans') },
    { id: 'nav-broadcasts', title: 'Broadcasts & Email Dispatches', subtitle: 'Publish in-app banners or dispatch email blasts to school principals', category: 'NAVIGATION', icon: 'broadcast', action: () => this.navigate('/announcements') },
    { id: 'nav-flags', title: 'Feature Flag Manager', subtitle: 'Enable/disable modules per institution dynamically', category: 'NAVIGATION', icon: 'flag', action: () => this.navigate('/feature-flags') },
    { id: 'nav-storage', title: 'Storage & Disk Tracker', subtitle: 'Monitor quota usage and document volumes', category: 'NAVIGATION', icon: 'database', action: () => this.navigate('/storage') },
    { id: 'nav-notes', title: 'Institutional CRM Notes', subtitle: 'Meeting notes, headmaster discussions & client logs', category: 'NAVIGATION', icon: 'notes', action: () => this.navigate('/tenants/notes') },
    { id: 'nav-sms', title: 'SMS & Sender ID Gateway', subtitle: 'Approve Sender IDs and inject credit packs', category: 'NAVIGATION', icon: 'chat', action: () => this.navigate('/sms-management') },
    { id: 'nav-finance', title: 'Financial Analytics (MRR/ARR)', subtitle: 'Revenue breakdowns, churn prediction & payment health', category: 'NAVIGATION', icon: 'chart', action: () => this.navigate('/finance') },
    { id: 'nav-tickets', title: 'Support Desk & Inquiries', subtitle: 'Triage support tickets and incident resolutions', category: 'NAVIGATION', icon: 'ticket', action: () => this.navigate('/support/tickets') },
    { id: 'nav-security', title: 'Security & 2FA Enforcement', subtitle: 'Global password resets, IP whitelists & audit trails', category: 'NAVIGATION', icon: 'shield', action: () => this.navigate('/security') },
    { id: 'nav-health', title: 'System Health & Gateway Pings', subtitle: 'Database ping, Paystack & SMS gateway status', category: 'NAVIGATION', icon: 'heart', action: () => this.navigate('/health') },
    { id: 'nav-affiliates', title: 'Affiliate & Partner Network', subtitle: 'Referral commission tracking & affiliate payouts', category: 'NAVIGATION', icon: 'users', action: () => this.navigate('/affiliates') },
    { id: 'nav-telemetry', title: 'Telemetry & Error Logs', subtitle: 'Active users heatmap, funnels & 5xx error logs', category: 'NAVIGATION', icon: 'activity', action: () => this.navigate('/telemetry') },
    { id: 'action-theme', title: 'Toggle Light / Dark Mode', subtitle: 'Switch between light daylight theme and deep obsidian dark mode', category: 'QUICK_ACTION', icon: 'sun', action: () => this.themeService.toggleTheme() },
  ];

  filteredCommands = computed(() => {
    const q = this.query().toLowerCase().trim();
    const navs = this.navigationCommands.filter(c =>
      !q || c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    );

    const tenantItems: CommandItem[] = this.tenants()
      .filter(t => !q || t.name.toLowerCase().includes(q) || t.subdomain.toLowerCase().includes(q))
      .map(t => ({
        id: 'tenant-' + t.id,
        title: t.name,
        subtitle: `${t.subdomain}.schoollinx.com • Plan: ${t.subscription_plan || 'BASIC'}`,
        category: 'TENANT',
        icon: 'school',
        action: () => this.navigate('/tenants/registry')
      }));

    return [...navs, ...tenantItems];
  });

  ngOnInit() {
    this.tenantService.getTenants().subscribe({
      next: (t) => this.tenants.set(t || []),
      error: () => {}
    });
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.query.set('');
      this.selectedIndex.set(0);
    }
  }

  close() {
    this.isOpen.set(false);
  }

  navigate(path: string) {
    this.router.navigateByUrl(path);
    this.close();
  }
}
