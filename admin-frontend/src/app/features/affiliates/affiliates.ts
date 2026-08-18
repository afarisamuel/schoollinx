import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AffiliateService, Affiliate, AffiliateReferral } from '../../core/services/affiliate.service';
import { TenantService, Tenant } from '../../core/services/tenant.service';

@Component({
  selector: 'app-affiliates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './affiliates.html'
})
export class AffiliatesComponent implements OnInit {
  private affiliateService = inject(AffiliateService);
  private tenantService = inject(TenantService);
  private fb = inject(FormBuilder);

  affiliates = signal<Affiliate[]>([]);
  isLoading = signal(true);

  // Modal State
  showModal = signal(false);
  isEditing = signal(false);
  editingId = signal<string | null>(null);
  affiliateForm: FormGroup;
  isSubmitting = signal(false);

  // Referrals Modal
  showReferralsModal = signal(false);
  selectedAffiliate = signal<Affiliate | null>(null);
  referrals = signal<AffiliateReferral[]>([]);
  isLoadingReferrals = signal(false);
  tenants = signal<Tenant[]>([]); // for linking new referrals
  showAddReferralForm = signal(false);
  selectedTenantId = signal<string>('');

  // Notifications
  successMessage = signal('');
  errorMessage = signal('');

  constructor() {
    this.affiliateForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      commission_rate: [0.10, [Validators.required, Validators.min(0), Validators.max(1)]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadAffiliates();
    // Preload tenants so we can add referrals later
    this.tenantService.getTenants().subscribe(res => this.tenants.set(res || []));
  }

  loadAffiliates() {
    this.isLoading.set(true);
    this.affiliateService.getAffiliates().subscribe({
      next: (data) => {
        this.affiliates.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // --- Modal Helpers ---
  openCreateModal() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.affiliateForm.reset({ commission_rate: 0.10 });
    this.showModal.set(true);
  }

  openEditModal(affiliate: Affiliate) {
    this.isEditing.set(true);
    this.editingId.set(affiliate.id);
    this.affiliateForm.patchValue(affiliate);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // --- CRUD Operations ---
  submitAffiliate() {
    if (this.affiliateForm.invalid) {
      this.affiliateForm.markAllAsTouched();
      return;
    }
    
    this.isSubmitting.set(true);
    const payload = this.affiliateForm.value;

    if (this.isEditing() && this.editingId()) {
      this.affiliateService.updateAffiliate(this.editingId()!, payload).subscribe({
        next: () => {
          this.notifySuccess('Affiliate updated successfully');
          this.closeModal();
          this.loadAffiliates();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.notifyError('Failed to update affiliate');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.affiliateService.createAffiliate(payload).subscribe({
        next: () => {
          this.notifySuccess('Affiliate created successfully');
          this.closeModal();
          this.loadAffiliates();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.notifyError('Failed to create affiliate');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  toggleAffiliate(id: string, currentStatus: boolean) {
    this.affiliateService.toggleAffiliate(id, !currentStatus).subscribe({
      next: () => {
        this.notifySuccess('Status updated');
        this.loadAffiliates();
      },
      error: () => this.notifyError('Failed to update status')
    });
  }

  deleteAffiliate(id: string) {
    if (confirm('Are you sure you want to delete this affiliate? This action cannot be undone.')) {
      this.affiliateService.deleteAffiliate(id).subscribe({
        next: () => {
          this.notifySuccess('Affiliate deleted');
          this.loadAffiliates();
        },
        error: () => this.notifyError('Failed to delete affiliate')
      });
    }
  }

  // --- Referrals Management ---
  openReferrals(affiliate: Affiliate) {
    this.selectedAffiliate.set(affiliate);
    this.showReferralsModal.set(true);
    this.showAddReferralForm.set(false);
    this.selectedTenantId.set('');
    this.loadReferrals(affiliate.id);
  }

  closeReferralsModal() {
    this.showReferralsModal.set(false);
    this.selectedAffiliate.set(null);
  }

  loadReferrals(id: string) {
    this.isLoadingReferrals.set(true);
    this.affiliateService.getReferrals(id).subscribe({
      next: (data) => {
        this.referrals.set(data || []);
        this.isLoadingReferrals.set(false);
      },
      error: () => this.isLoadingReferrals.set(false)
    });
  }

  addReferral() {
    const affiliate = this.selectedAffiliate();
    const tenantId = this.selectedTenantId();
    if (!affiliate || !tenantId) return;

    this.affiliateService.addReferral(affiliate.id, tenantId).subscribe({
      next: () => {
        this.notifySuccess('Referral added successfully');
        this.showAddReferralForm.set(false);
        this.selectedTenantId.set('');
        this.loadReferrals(affiliate.id);
        this.loadAffiliates(); // refresh counts
      },
      error: () => this.notifyError('Failed to add referral. Tenant may already be assigned.')
    });
  }

  markPaid(referralId: string) {
    if (confirm('Mark this commission as paid?')) {
      this.affiliateService.markReferralPaid(referralId).subscribe({
        next: () => {
          this.notifySuccess('Commission marked as paid');
          if (this.selectedAffiliate()) {
            this.loadReferrals(this.selectedAffiliate()!.id);
          }
        },
        error: () => this.notifyError('Failed to update payment status')
      });
    }
  }

  onTenantSelect(e: Event) {
    this.selectedTenantId.set((e.target as HTMLSelectElement).value);
  }

  // --- Notifications ---
  private timeoutId: any;
  private notifySuccess(msg: string) {
    this.successMessage.set(msg);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.successMessage.set(''), 4000);
  }

  private notifyError(msg: string) {
    this.errorMessage.set(msg);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.errorMessage.set(''), 4000);
  }
}
