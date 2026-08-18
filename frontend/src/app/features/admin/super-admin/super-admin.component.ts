import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, Tenant, OnboardTenantRequest, SystemStats } from '../../../core/infrastructure/admin/tenant.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-super-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './super-admin.component.html',
    styleUrl: './super-admin.component.css'
})
export class SuperAdminComponent implements OnInit {
    private tenantService = inject(TenantService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    tenants = signal<Tenant[]>([]);
    stats = signal<SystemStats | null>(null);
    isAdding = signal(false);
    isSaving = signal(false);
    activeTab = signal<'tenants' | 'announcements'>('tenants');
    searchTerm = signal('');
    successMsg = signal('');
    errorMsg = signal('');

    draft: OnboardTenantRequest = {
        name: '',
        subdomain: '',
        admin_email: '',
        admin_first_name: '',
        admin_last_name: ''
    };

    // Billing config state
    showBillingModal = signal<boolean>(false);
    selectedTenantForBilling = signal<Tenant | null>(null);
    billingDraft = signal<{ plan: string, rate: number, credits: number, storage: number, due_date: string }>({
        plan: 'BASIC',
        rate: 0,
        credits: 0,
        storage: 5,
        due_date: ''
    });

    filteredTenants = computed(() => {
        const term = this.searchTerm().toLowerCase();
        if (!term) return this.tenants();
        return this.tenants().filter(t =>
            t.name.toLowerCase().includes(term) ||
            t.subdomain.toLowerCase().includes(term)
        );
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadData();
            this.loadAnnouncements();
        }
    }

    announcements = signal<any[]>([]);
    showAnnouncementModal = signal(false);
    announcementDraft = signal({ title: '', content: '', priority: 'INFO' });

    loadAnnouncements() {
        this.tenantService.listAnnouncements().subscribe(a => this.announcements.set(a));
    }

    createAnnouncement() {
        if (!this.announcementDraft().title || !this.announcementDraft().content) {
            this.errorMsg.set('Title and content are required');
            return;
        }
        this.tenantService.createAnnouncement(this.announcementDraft()).subscribe({
            next: () => {
                this.successMsg.set('Announcement created');
                this.showAnnouncementModal.set(false);
                this.announcementDraft.set({ title: '', content: '', priority: 'INFO' });
                this.loadAnnouncements();
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: () => this.errorMsg.set('Failed to create announcement')
        });
    }

    toggleAnnouncement(id: string, current: boolean) {
        this.tenantService.toggleAnnouncement(id, !current).subscribe(() => this.loadAnnouncements());
    }

    deleteAnnouncement(id: string) {
        this.dialog.confirm('Are you sure you want to delete this announcement?', 'Delete Announcement', 'danger', 'Delete')
            .subscribe(confirmed => {
                if (confirmed) {
                    this.tenantService.deleteAnnouncement(id).subscribe(() => this.loadAnnouncements());
                }
            });
    }

    loadData() {
        this.tenantService.listTenants().subscribe(t => this.tenants.set(t));
        this.tenantService.getStats().subscribe(s => this.stats.set(s));
    }

    onboard() {
        if (!this.draft.name || !this.draft.subdomain || !this.draft.admin_email) {
            this.errorMsg.set('Name, subdomain and admin email are required.');
            return;
        }
        this.isSaving.set(true);
        this.errorMsg.set('');
        this.tenantService.onboardTenant(this.draft).subscribe({
            next: () => {
                this.successMsg.set('Organisation onboarded! Setup email sent to admin.');
                this.isAdding.set(false);
                this.draft = { name: '', subdomain: '', admin_email: '', admin_first_name: '', admin_last_name: '' };
                this.loadData();
                this.isSaving.set(false);
                setTimeout(() => this.successMsg.set(''), 4000);
            },
            error: e => {
                this.errorMsg.set(e.error?.error || 'Onboarding failed.');
                this.isSaving.set(false);
            }
        });
    }

    toggleStatus(tenant: Tenant) {
        const next = !tenant.is_active;
        const action = next ? 'Activate' : 'Deactivate';
        this.dialog.confirm(`${action} "${tenant.name}"?`, `${action} Organisation`, next ? 'warning' : 'danger', action)
            .subscribe((confirmed: boolean) => {
                if (!confirmed) return;
                this.tenantService.updateStatus(tenant.id, next).subscribe(() => this.loadData());
            });
    }

    resendSetup(tenant: Tenant) {
        this.tenantService.resendSetupEmail(tenant.id).subscribe({
            next: () => { this.successMsg.set(`Setup email resent to ${tenant.name}.`); setTimeout(() => this.successMsg.set(''), 3000); },
            error: e => this.errorMsg.set(e.error?.error || 'Failed to resend.')
        });
    }

    onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }

    openBillingConfig(tenant: Tenant) {
        this.selectedTenantForBilling.set(tenant);
        this.billingDraft.set({
            plan: 'BASIC', // Would ideally read current tenant config if returned from API
            rate: 0,
            credits: 0,
            storage: 5,
            due_date: tenant.billing_due_date ? new Date(tenant.billing_due_date).toISOString().split('T')[0] : ''
        });
        this.showBillingModal.set(true);
    }

    closeBillingConfig() {
        this.showBillingModal.set(false);
        this.selectedTenantForBilling.set(null);
    }

    saveBillingConfig() {
        const tenant = this.selectedTenantForBilling();
        if (!tenant) return;

        const draft = this.billingDraft();
        const payload = {
            subscription_plan: draft.plan,
            per_student_per_term_rate: draft.rate,
            sms_credits: draft.credits,
            storage_limit_gb: draft.storage,
            billing_due_date: draft.due_date ? new Date(draft.due_date).toISOString() : null
        };

        this.tenantService.updateBilling(tenant.id, payload).subscribe({
            next: () => {
                this.successMsg.set(`Billing updated for ${tenant.name}`);
                this.closeBillingConfig();
                this.loadData();
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (err) => {
                this.errorMsg.set('Failed to update billing config');
                setTimeout(() => this.errorMsg.set(''), 5000);
            }
        });
    }

    impersonateTenant(tenant: Tenant) {
        this.tenantService.impersonate(tenant.id).subscribe({
            next: (res) => {
                // Save impersonation token
                localStorage.setItem('auth_token', res.token);
                // Hard refresh to reload context with impersonation token
                window.location.href = '/dashboard';
            },
            error: (err) => {
                this.errorMsg.set(err.error?.error || 'Failed to impersonate tenant');
                setTimeout(() => this.errorMsg.set(''), 5000);
            }
        });
    }

    wipeTenantData(tenant: Tenant) {
        this.dialog.confirm(`DANGER: Are you sure you want to WIPE all data for "${tenant.name}"? This will drop their entire database schema!`, `WIPE TENANT DATA`, 'danger', 'WIPE DATA')
            .subscribe((confirmed: boolean) => {
                if (!confirmed) return;
                this.tenantService.resetData(tenant.id).subscribe({
                    next: () => {
                        this.successMsg.set(`Data for ${tenant.name} has been completely wiped.`);
                        setTimeout(() => this.successMsg.set(''), 5000);
                    },
                    error: (err) => {
                        this.errorMsg.set(err.error?.error || 'Failed to wipe data');
                        setTimeout(() => this.errorMsg.set(''), 5000);
                    }
                });
            });
    }

    exportTenantData(tenant: Tenant) {
        this.tenantService.exportData(tenant.id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${tenant.subdomain}_export.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.successMsg.set(`Data exported for ${tenant.name}`);
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: () => {
                this.errorMsg.set(`Failed to export data for ${tenant.name}`);
                setTimeout(() => this.errorMsg.set(''), 3000);
            }
        });
    }
}
