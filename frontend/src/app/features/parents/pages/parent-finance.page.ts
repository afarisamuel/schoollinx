import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-parent-finance',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parent-finance.page.html'
})
export class ParentFinancePage {
    state = inject(ParentStateService);
    private api = inject(ParentPortalService);
    private paymentService = inject(PaymentService);
    private toast = inject(ToastService);
    private dialog = inject(DialogService);

    showTopUpModal = signal(false);
    topUpId = signal('');
    topUpName = signal('');
    topUpAmount = signal(50);
    topUpNote = signal('Daily Canteen & Transport');
    topUpMethod = signal<'paystack' | 'direct'>('paystack');
    submitting = signal(false);
    readonly quickAmounts = [20, 50, 100, 200, 500];

    openTopUp(studentId: string, name: string) {
        this.topUpId.set(studentId);
        this.topUpName.set(name);
        this.topUpAmount.set(50);
        this.showTopUpModal.set(true);
    }

    submitTopUp() {
        const id = this.topUpId();
        const amount = this.topUpAmount();
        if (!id || amount <= 0) return;
        this.submitting.set(true);

        if (this.topUpMethod() === 'paystack') {
            const email = this.state.profile()?.email || '';
            const cb = `${window.location.origin}/parents/finance`;
            this.paymentService.initializeWalletTopUp(id, amount, email, cb).subscribe({
                next: (r) => { window.location.href = r.authorization_url; },
                error: () => {
                    this.submitting.set(false);
                    this.toast.error('Failed to connect to Paystack.', 'Error');
                }
            });
            return;
        }

        this.api.topUpWallet(id, amount, this.topUpNote()).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showTopUpModal.set(false);
                this.toast.success(`GH₵${amount.toFixed(2)} added to ${this.topUpName()}'s wallet`, 'Top-Up Successful');
                this.state.reloadWallet(id);
                this.state.reloadLedger();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err?.error?.error || 'Failed to complete top-up.', 'Top-Up Failed');
            }
        });
    }

    payWard(studentId: string, studentName: string) {
        const records = this.state.fiscalMap()[studentId] || [];
        const pending = records.find(r => r.status !== 'PAID' && ((r.balance_due || 0) > 0));
        if (!pending) {
            this.dialog.alert(`No pending invoices for ${studentName}.`, 'Settled', 'info');
            return;
        }
        const amt = pending.balance_due || pending.amount;
        this.dialog.confirm(`Pay GH₵${amt.toFixed(2)} for ${studentName} via Paystack?`, 'Fee Payment', 'info', 'Pay Now').subscribe(ok => {
            if (!ok) return;
            const cb = `${window.location.origin}/parents/finance`;
            this.paymentService.initializePayment(pending.id, amt, cb).subscribe({
                next: (r) => { window.location.href = r.authorization_url; },
                error: (e) => { this.dialog.alert(e.error?.error || 'Payment init failed.', 'Error', 'error'); }
            });
        });
    }

    payFamilyBalance() {
        const wards = this.state.familyLedger()?.wards?.filter(w => w.balance_due > 0) || [];
        if (!wards.length) { this.dialog.alert('All fees are settled!', 'Settled', 'success'); return; }
        this.payWard(wards[0].student_id, wards[0].student_name);
    }

    downloadReceipt(studentId: string) {
        const r = (this.state.fiscalMap()[studentId] || []).find(r => r.status === 'PAID');
        if (!r) { this.toast.info('No paid records for download.', 'No Records'); return; }
        this.api.getReceipt(r.id).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt_${studentId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: () => this.toast.error('Could not download receipt.', 'Failed')
        });
    }
}
