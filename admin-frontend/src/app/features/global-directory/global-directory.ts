import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, GlobalUser } from '../../core/services/admin.service';

@Component({
  selector: 'app-global-directory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-directory.html'
})
export class GlobalDirectoryComponent implements OnInit {
  private adminService = inject(AdminService);
  
  users = signal<GlobalUser[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.users();
    
    return this.users().filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) ||
      u.organization.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getGlobalDirectory().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'TEACHER': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'STUDENT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }
}
