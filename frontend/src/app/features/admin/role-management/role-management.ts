import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Permission {
    key: string;
    label: string;
    group: string;
}

interface RolePermissions {
    role: string;
    permissions: string[];
}

interface User {
    id: string;
    email: string;
    username?: string;
    role: string;
    custom_permissions?: string[];
    two_factor_enabled: boolean;
    created_at: string;
}

@Component({
    selector: 'app-role-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './role-management.html',
})
export class RoleManagement implements OnInit {
    private http = inject(HttpClient);

    allPermissions = signal<Permission[]>([]);
    roleMatrix = signal<RolePermissions[]>([]);
    users = signal<User[]>([]);
    isLoading = signal(true);
    activeTab = signal<'matrix' | 'users'>('matrix');
    searchQuery = signal('');
    filterRole = signal('');
    
    // Modal state
    selectedUser = signal<User | null>(null);
    userCustomPermissions = signal<Set<string>>(new Set());
    isSaving = signal(false);

    // Computed permission groups for the matrix headers
    permissionGroups = computed(() => {
        const groups: Record<string, Permission[]> = {};
        for (const p of this.allPermissions()) {
            if (!groups[p.group]) groups[p.group] = [];
            groups[p.group].push(p);
        }
        return Object.entries(groups).map(([group, perms]) => ({ group, perms }));
    });

    filteredUsers = computed(() => {
        const q = this.searchQuery().toLowerCase();
        const role = this.filterRole();
        return this.users().filter(u =>
            (!q || u.email.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)) &&
            (!role || u.role === role)
        );
    });

    allRoles = computed(() => this.roleMatrix().map(r => r.role));

    ngOnInit(): void {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        Promise.all([
            this.http.get<Permission[]>('/api/roles/permissions').toPromise(),
            this.http.get<RolePermissions[]>('/api/roles').toPromise(),
            this.http.get<User[]>('/api/users/all').toPromise(),
        ]).then(([perms, roles, users]) => {
            this.allPermissions.set(perms || []);
            this.roleMatrix.set(roles || []);
            this.users.set(users || []);
            this.isLoading.set(false);
        }).catch(() => this.isLoading.set(false));
    }

    hasPermission(role: string, permKey: string): boolean {
        const r = this.roleMatrix().find(x => x.role === role);
        return r ? r.permissions.includes(permKey) : false;
    }

    getRoleDisplayName(role: string): string {
        return role.replace(/_/g, ' ');
    }

    getUserCount(role: string): number {
        return this.users().filter(u => u.role === role).length;
    }

    getRoleClass(role: string): string {
        const map: Record<string, string> = {
            'ADMIN': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'TEACHER': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'STUDENT': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'GUARDIAN': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'LIBRARIAN': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'ACCOUNTANT': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'BURSAR': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            'HR_MANAGER': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            'LOGISTICS_MANAGER': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'OPERATIONS_MANAGER': 'bg-red-500/10 text-red-400 border-red-500/20',
            'HEADMASTER': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
            'CLERK': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            'NURSE': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            'IT_ADMIN': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        };
        return map[role] || 'bg-text-muted/10 text-text-muted border-border-primary';
    }

    // Modal Actions
    openPermissionsModal(user: User) {
        this.selectedUser.set(user);
        this.userCustomPermissions.set(new Set(user.custom_permissions || []));
    }

    closeModal() {
        this.selectedUser.set(null);
        this.userCustomPermissions.set(new Set());
    }

    toggleCustomPermission(permKey: string) {
        const current = new Set(this.userCustomPermissions());
        if (current.has(permKey)) {
            current.delete(permKey);
        } else {
            current.add(permKey);
        }
        this.userCustomPermissions.set(current);
    }

    async saveCustomPermissions() {
        const user = this.selectedUser();
        if (!user) return;

        this.isSaving.set(true);
        try {
            const perms = Array.from(this.userCustomPermissions());
            await this.http.put(`/api/users/${user.id}/permissions`, { custom_permissions: perms }).toPromise();
            // Update local user state
            this.users.update(users => users.map(u => u.id === user.id ? { ...u, custom_permissions: perms } : u));
            this.closeModal();
        } catch (error) {
            console.error('Failed to save permissions:', error);
            alert('Failed to save permissions. Please try again.');
        } finally {
            this.isSaving.set(false);
        }
    }
}
