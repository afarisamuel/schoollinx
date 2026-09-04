import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiscalService, ExpenseClaim } from '../../../core/infrastructure/fiscal/fiscal.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-expense-claims',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './expense-claims.html',
  styleUrl: './expense-claims.css'
})
export class ExpenseClaimsComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  private dialog = inject(DialogService);

  claims = signal<ExpenseClaim[]>([]);
  activeTab = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  stats = computed(() => {
    const list = this.claims();
    const pending = list.filter(c => c.status.startsWith('PENDING'));
    const approved = list.filter(c => c.status === 'APPROVED' || c.status === 'PAID');
    const rejected = list.filter(c => c.status === 'REJECTED');
    const totalApprovedVal = approved.reduce((sum, c) => sum + (c.amount || 0), 0);
    return {
      total: list.length,
      pendingCount: pending.length,
      approvedVal: totalApprovedVal,
      rejectedCount: rejected.length
    };
  });

  // Submit state
  showModal = signal(false);
  formData = { amount: 0, description: '' };
  isSubmitting = signal(false);

  // Hardcoded for now. In a real app, this comes from AuthService
  private currentUserId = '00000000-0000-0000-0000-000000000000';

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims() {
    const status = this.activeTab() === 'ALL' ? undefined : this.activeTab();
    // For pending, fetch both manager and finance pending
    let queryStatus = status;
    
    this.fiscalService.getExpenseClaims(queryStatus).subscribe({
      next: (res) => {
        if (this.activeTab() === 'PENDING') {
           this.claims.set(res.filter(c => c.status.startsWith('PENDING')));
        } else {
           this.claims.set(res);
        }
      },
      error: (err) => console.error('Failed to load claims', err)
    });
  }

  setTab(tab: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') {
    this.activeTab.set(tab);
    this.loadClaims();
  }

  submitClaim() {
    if (this.formData.amount <= 0 || !this.formData.description) {
      this.dialog.alert('Please provide valid amount and description', 'Validation Error', 'warning');
      return;
    }
    
    this.isSubmitting.set(true);
    const claim: Partial<ExpenseClaim> = {
      requestor_id: this.currentUserId,
      amount: this.formData.amount,
      description: this.formData.description,
    };

    this.fiscalService.submitExpenseClaim(claim).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showModal.set(false);
        this.dialog.alert('Expense claim submitted successfully', 'Success', 'success');
        this.loadClaims();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.dialog.alert(err?.error?.error || 'Failed to submit claim', 'Error', 'danger');
      }
    });
  }

  reviewClaim(claim: ExpenseClaim, approved: boolean) {
    const action = approved ? 'Approve' : 'Reject';
    this.dialog.confirm(`Are you sure you want to ${action} this claim?`, `${action} Claim`, 'info', action).subscribe(confirmed => {
      if (confirmed) {
        this.fiscalService.reviewExpenseClaim(claim.id, approved, this.currentUserId).subscribe({
          next: () => {
            this.dialog.alert(`Claim ${action}d successfully.`, 'Success', 'success');
            this.loadClaims();
          },
          error: (err) => {
            this.dialog.alert(err?.error?.error || 'Failed to review claim', 'Error', 'danger');
          }
        });
      }
    });
  }
}
