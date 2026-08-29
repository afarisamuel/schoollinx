import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { FiscalService } from '../../../core/infrastructure/fiscal/fiscal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-parent-finance',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parent-finance.page.html'
})
export class ParentFinancePage implements OnInit {
    state = inject(ParentStateService);
    private api = inject(ParentPortalService);
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private toast = inject(ToastService);
    private dialog = inject(DialogService);

    // Multi-Currency State
    selectedCurrency = signal<'GHS' | 'USD' | 'GBP' | 'EUR'>('GHS');
    exchangeRates = signal<Record<string, number>>({
        GHS: 1.0,
        USD: 15.55,
        GBP: 19.80,
        EUR: 16.90
    });

    // Installment Agreements
    installmentsMap = signal<Record<string, any[]>>({});

    // Sibling Discount Savings
    siblingDiscounts = signal<Record<string, any>>({});

    // Top-up Modal State
    showTopUpModal = signal(false);
    topUpId = signal('');
    topUpName = signal('');
    topUpAmount = signal(50);
    topUpNote = signal('Daily Canteen & Transport');
    topUpMethod = signal<'paystack' | 'direct'>('paystack');
    submitting = signal(false);
    readonly quickAmounts = [20, 50, 100, 200, 500];

    ngOnInit() {
        this.loadLiveExchangeRates();
        this.loadMilestoneData();
    }

    loadLiveExchangeRates() {
        this.fiscalService.getLiveExchangeRates().subscribe({
            next: (rates) => {
                if (rates) {
                    this.exchangeRates.set(rates);
                }
            },
            error: () => {
                // Fallback cached rates maintained
            }
        });
    }

    loadMilestoneData() {
        const students = this.state.profile()?.students || [];
        for (const s of students) {
            if (s.id) {
                this.fiscalService.getInstallmentAgreements(s.id).subscribe({
                    next: (agreements) => {
                        this.installmentsMap.update(m => ({ ...m, [s.id!]: agreements }));
                    }
                });

                this.fiscalService.getSiblingDiscount(s.id).subscribe({
                    next: (discount) => {
                        this.siblingDiscounts.update(m => ({ ...m, [s.id!]: discount }));
                    }
                });
            }
        }
    }

    formatMoney(amountInGhs: number): string {
        const curr = this.selectedCurrency();
        const rate = this.exchangeRates()[curr] || 1.0;
        const symbols: Record<string, string> = { GHS: 'GH₵', USD: '$', GBP: '£', EUR: '€' };
        const sym = symbols[curr] || 'GH₵';

        if (curr === 'GHS') {
            return `${sym}${amountInGhs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const converted = amountInGhs / rate;
        return `${sym}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    setCurrency(curr: 'GHS' | 'USD' | 'GBP' | 'EUR') {
        this.selectedCurrency.set(curr);
    }

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

    payMilestone(milestoneId: string, amount: number, studentName: string) {
        this.dialog.confirm(`Proceed with installment payment of GH₵${amount.toFixed(2)} for ${studentName}?`, 'Installment Milestone', 'info', 'Pay Installment').subscribe(ok => {
            if (!ok) return;
            this.fiscalService.payInstallmentMilestone(milestoneId, amount).subscribe({
                next: () => {
                    this.toast.success('Installment payment recorded.', 'Payment Successful');
                    this.loadMilestoneData();
                    this.state.reloadLedger();
                },
                error: () => {
                    this.toast.error('Payment processing failed.', 'Error');
                }
            });
        });
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
