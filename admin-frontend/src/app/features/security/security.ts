import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AuditLog } from '../../core/services/admin.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface SecurityIP {
  id: string;
  ip_address: string;
  description: string;
  added_by: string;
  created_at: string;
}

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './security.html'
})
export class SecurityComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private sub = new Subscription();

  auditLogs = signal<AuditLog[]>([]);
  whitelistedIps = signal<SecurityIP[]>([]);
  isLoading = signal(true);

  // Modal State
  showAddIpModal = signal(false);
  isSubmitting = signal(false);
  ipForm: FormGroup;

  // Notification state
  successMessage = signal('');
  errorMessage = signal('');

  constructor() {
    this.ipForm = this.fb.group({
      ip_address: ['', [Validators.required, Validators.pattern('^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$')]],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    this.sub.add(this.adminService.getAuditLogs().subscribe({
      next: (logs) => {
        // Filter for high-risk actions to show on the security overview
        const highRisk = (logs || []).filter(l => 
          l.action.includes('FORCE_PASSWORD_RESET') || 
          l.action.includes('IMPERSONATE') || 
          l.action.includes('CREDIT') || 
          l.action.includes('DELETE') || 
          l.action.includes('WIPE')
        ).slice(0, 10);
        this.auditLogs.set(highRisk);
        this.checkDone();
      },
      error: () => this.checkDone()
    }));

    this.sub.add(this.adminService.getSecurityIPs().subscribe({
      next: (ips) => {
        this.whitelistedIps.set(ips || []);
        this.checkDone();
      },
      error: () => this.checkDone()
    }));
  }

  private calls = 0;
  private checkDone() {
    this.calls++;
    if (this.calls >= 2) {
      this.isLoading.set(false);
    }
  }

  openAddIpModal() {
    this.ipForm.reset();
    this.showAddIpModal.set(true);
  }

  closeAddIpModal() {
    this.showAddIpModal.set(false);
  }

  submitIp() {
    if (this.ipForm.invalid) {
      this.ipForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { ip_address, description } = this.ipForm.value;

    this.adminService.addSecurityIP(ip_address, description).subscribe({
      next: (newIp) => {
        this.whitelistedIps.update(ips => [newIp, ...ips]);
        this.notifySuccess('IP added to whitelist');
        this.closeAddIpModal();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.notifyError('Failed to add IP. It might already be whitelisted or invalid.');
        this.isSubmitting.set(false);
      }
    });
  }

  removeIp(id: string) {
    if (confirm('Are you sure you want to remove this IP from the whitelist?')) {
      this.adminService.deleteSecurityIP(id).subscribe({
        next: () => {
          this.whitelistedIps.update(ips => ips.filter(ip => ip.id !== id));
          this.notifySuccess('IP removed from whitelist');
        },
        error: () => this.notifyError('Failed to remove IP')
      });
    }
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

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
