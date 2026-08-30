import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { FiscalService, InstallmentPlanTemplate } from '../../../core/infrastructure/fiscal/fiscal.service';
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
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    // Active Tab State
    activeTab = signal<'ledger' | 'milestones' | 'wallets' | 'siblings'>('ledger');

    // Multi-Currency State
    selectedCurrency = signal<'GHS' | 'USD' | 'GBP' | 'EUR'>('GHS');
    exchangeRates = signal<Record<string, number>>({
        GHS: 1.0,
        USD: 15.55,
        GBP: 19.80,
        EUR: 16.90
    });

    // Installment Agreements & Admin Plan
    installmentsMap = signal<Record<string, any[]>>({});
    installmentPlan = signal<InstallmentPlanTemplate | null>(null);

    // Sibling Discount Savings
    siblingDiscounts = signal<Record<string, any>>({});

    // Top-up Modal State
    showTopUpModal = signal(false);
    topUpId = signal('');
    topUpName = signal('');
    topUpAmount = signal(50);
    topUpNote = signal('Daily Canteen & Transport');
    topUpMethod = signal<'direct' | 'paystack'>('direct');
    submitting = signal(false);
    readonly quickAmounts = [20, 50, 100, 200, 500];

    // Fee Payment Modal State (Full & Part Payment)
    showFeeModal = signal(false);
    paymentWardId = signal('');
    paymentWardName = signal('');
    paymentRecordId = signal('');
    paymentTotalDue = signal(0);
    paymentType = signal<'full' | 'partial'>('full');
    customPaymentAmount = signal(100);
    feePaymentMethod = signal<'paystack' | 'direct'>('paystack');
    processingFeePayment = signal(false);
    readonly quickPartAmounts = [50, 100, 200, 300, 500];

    // Computed Wards Ledger (falls back to profile students if familyLedger is empty)
    ledgerWards = computed(() => {
        const fromLedger = this.state.familyLedger()?.wards;
        if (fromLedger && fromLedger.length > 0) {
            return fromLedger;
        }
        const students = this.state.profile()?.students || [];
        return students.map(s => {
            const records = this.state.fiscalMap()[s.id || ''] || [];
            const billed = records.reduce((acc, r) => acc + (r.amount || 0), 0);
            const paid = records.reduce((acc, r) => acc + (r.amount_paid || 0), 0);
            const balance = records.reduce((acc, r) => acc + (r.balance_due !== undefined ? r.balance_due : (r.amount - (r.amount_paid || 0))), 0);
            return {
                student_id: s.id || '',
                student_name: `${s.first_name} ${s.last_name}`,
                class_name: s.class_name || 'Grade ' + (s.level || '1'),
                total_billed: billed > 0 ? billed : 1200,
                total_paid: paid > 0 ? paid : 1200,
                balance_due: balance
            };
        });
    });

    ngOnInit() {
        this.loadLiveExchangeRates();
        this.loadMilestoneData();
        this.checkPaymentReturn();
    }

    private checkPaymentReturn() {
        this.route.queryParams.subscribe(params => {
            const ref = params['reference'] || params['trxref'];
            if (ref) {
                this.toast.info('Verifying payment with Paystack...', 'Payment Verification');
                this.paymentService.verifyPayment(ref).subscribe({
                    next: () => {
                        this.toast.success('Payment verified successfully! Balance updated.', 'Payment Successful');
                        this.state.reloadLedger();
                        const students = this.state.profile()?.students || [];
                        students.forEach(s => {
                            if (s.id) {
                                this.state.reloadWallet(s.id);
                                this.state.loadStudentData(s.id, '');
                            }
                        });
                        this.router.navigate([], { queryParams: {}, replaceUrl: true });
                    },
                    error: () => {
                        this.router.navigate([], { queryParams: {}, replaceUrl: true });
                    }
                });
            }
        });
    }

    getMilestonesForStudent(studentId: string) {
        const ag = this.installmentsMap()[studentId];
        if (ag && ag.length > 0) return ag;

        const ward = this.ledgerWards().find(w => w.student_id === studentId);
        const total = ward?.total_billed && ward.total_billed > 0 ? ward.total_billed : 2500;
        const paid = ward?.total_paid || 0;

        const plan = this.installmentPlan();
        if (!plan || !plan.is_enabled || !plan.milestones || plan.milestones.length === 0) {
            return [];
        }

        const mDefs = plan.milestones;
        let accumulated = 0;
        let allocatedTotal = 0;

        return mDefs.map((def, idx) => {
            const isLast = idx === mDefs.length - 1;
            const amount = isLast ? Math.max(0, total - allocatedTotal) : Math.round(total * (def.percentage / 100));
            allocatedTotal += amount;

            const prevThreshold = accumulated;
            accumulated += amount;

            let status = 'UPCOMING';
            let badgeClass = 'bg-bg-tertiary text-text-muted border-border-primary';

            if (paid >= accumulated) {
                status = 'PAID';
                badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            } else if (paid > prevThreshold || idx === 0) {
                status = 'DUE';
                badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            } else if (paid === prevThreshold && idx === 1) {
                status = 'DUE SOON';
                badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            }

            return {
                name: `${def.title} (${def.percentage}%)`,
                desc: def.description,
                amount: amount,
                status: status,
                badgeClass: badgeClass
            };
        });
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
        this.fiscalService.getInstallmentSettings().subscribe({
            next: (plan) => {
                if (plan) {
                    this.installmentPlan.set(plan);
                }
            },
            error: () => {}
        });

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

        const email = this.state.profile()?.email || '';
        const cb = `${window.location.origin}/parents/finance`;
        this.paymentService.initializeWalletTopUp(id, amount, email, cb).subscribe({
            next: (r) => { window.location.href = r.authorization_url; },
            error: (e) => {
                this.submitting.set(false);
                this.toast.error(e.error?.error || 'Failed to connect to Paystack gateway.', 'Error');
            }
        });
    }

    openFeePayment(studentId: string, studentName: string) {
        const records = this.state.fiscalMap()[studentId] || [];
        const pending = records.find(r => r.status !== 'PAID' && (r.amount - (r.amount_paid || 0)) > 0);
        
        let due = 0;
        if (pending) {
            due = pending.balance_due !== undefined && pending.balance_due > 0 
                ? pending.balance_due 
                : (pending.amount - (pending.amount_paid || 0));
        } else {
            const ward = this.ledgerWards().find(w => w.student_id === studentId);
            due = ward?.balance_due || 0;
        }

        if (due <= 0) {
            this.dialog.alert(`All school fees are already settled for ${studentName}.`, 'Settled', 'info');
            return;
        }

        this.paymentWardId.set(studentId);
        this.paymentWardName.set(studentName);
        this.paymentRecordId.set(pending?.id || '');
        this.paymentTotalDue.set(due);
        this.paymentType.set('full');
        this.customPaymentAmount.set(Math.min(100, Math.round(due / 2)));
        this.feePaymentMethod.set('paystack');
        this.showFeeModal.set(true);
    }

    payWard(studentId: string, studentName: string) {
        this.openFeePayment(studentId, studentName);
    }

    payFamilyBalance() {
        const wards = this.ledgerWards().filter(w => w.balance_due > 0);
        if (!wards.length) { 
            this.dialog.alert('All family school fees are settled!', 'Settled', 'success'); 
            return; 
        }
        this.openFeePayment(wards[0].student_id, wards[0].student_name);
    }

    submitFeePayment() {
        const studentId = this.paymentWardId();
        const recordId = this.paymentRecordId();
        const totalDue = this.paymentTotalDue();
        const type = this.paymentType();
        
        const amount = type === 'full' ? totalDue : this.customPaymentAmount();

        if (amount <= 0) {
            this.toast.warning('Payment amount must be greater than zero.', 'Invalid Amount');
            return;
        }

        if (amount > totalDue) {
            this.toast.warning(`Payment cannot exceed the outstanding balance of GH₵${totalDue.toFixed(2)}.`, 'Amount Exceeded');
            return;
        }

        this.processingFeePayment.set(true);

        const email = this.state.profile()?.email || '';
        const cb = `${window.location.origin}/parents/finance`;
        this.paymentService.initializePayment(recordId || undefined, { amount, studentId: studentId || undefined, email, callbackUrl: cb }).subscribe({
            next: (r) => { 
                window.location.href = r.authorization_url; 
            },
            error: (e) => {
                this.processingFeePayment.set(false);
                this.toast.error(e.error?.error || 'Failed to connect to Paystack gateway.', 'Payment Error');
            }
        });
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
