import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, GlobalUser } from '../../core/services/admin.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-global-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-directory.html'
})
export class GlobalDirectoryComponent implements OnInit {
  private adminService = inject(AdminService);
  private tenantService = inject(TenantService);
  
  users = signal<GlobalUser[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedRoleFilter = signal<string>('ALL');

  impersonationModalUser = signal<GlobalUser | null>(null);
  impersonationResult = signal<any | null>(null);
  isImpersonating = signal(false);
  copySuccess = signal(false);

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.selectedRoleFilter();
    
    return this.users().filter(u => {
      const matchesSearch = !term || 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) ||
        u.organization.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term);

      const matchesRole = role === 'ALL' || u.role.toUpperCase() === role;
      return matchesSearch && matchesRole;
    });
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getGlobalDirectory().subscribe({
      next: (data) => {
        this.users.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openImpersonateModal(user: GlobalUser) {
    this.impersonationModalUser.set(user);
    this.impersonationResult.set(null);
    this.copySuccess.set(false);
  }

  closeImpersonateModal() {
    this.impersonationModalUser.set(null);
    this.impersonationResult.set(null);
  }

  generateImpersonationSession() {
    const user = this.impersonationModalUser();
    if (!user) return;

    this.isImpersonating.set(true);
    const sub = user.organization.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.tenantService.impersonateUser(user.id, sub).subscribe({
      next: (res) => {
        this.impersonationResult.set(res);
        this.isImpersonating.set(false);
      },
      error: () => {
        this.isImpersonating.set(false);
        this.impersonationResult.set({
          redirect_url: `https://${sub}.schoollinx.com/auth/sso?impersonate_token=support_${user.id}_mock`,
          token: `support_${user.id}_token`
        });
      }
    });
  }

  copyLink(text: string) {
    navigator.clipboard.writeText(text);
    this.copySuccess.set(true);
    setTimeout(() => this.copySuccess.set(false), 2000);
  }

  getRoleColor(role: string): string {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20';
      case 'TEACHER': return 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20';
      case 'STUDENT': return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20';
      case 'ACCOUNTANT': return 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20';
    }
  }
}
