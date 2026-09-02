import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FiscalService, FiscalRecord, FiscalSummary, FinancialRecommendation } from '../../../core/infrastructure/fiscal/fiscal.service';
import { FiscalTopUpModalComponent, TopUpData } from '../components/fiscal-topup-modal/fiscal-topup-modal';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { PaginationState, defaultPaginationState } from '../../../core/domain/pagination.model';
import { CommunicationService } from '../../../core/infrastructure/communication/communication.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-fiscal-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, FormsModule, FiscalTopUpModalComponent],
    templateUrl: './fiscal-dashboard.component.html',
    styleUrl: './fiscal-dashboard.component.css'
})
export class FiscalDashboardComponent implements OnInit {
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private dialog = inject(DialogService);
    private commService = inject(CommunicationService);
    private classService = inject(ClassService);
    private datePipe = new DatePipe('en-US');

    records = signal<FiscalRecord[]>([]);
    summary = signal<FiscalSummary | null>(null);
    recommendations = signal<FinancialRecommendation[]>([]);
    defaulters = signal<FiscalRecord[]>([]);
    defaultersCount = signal(0);
    activeTab = signal<'records' | 'defaulters'>('records');
    feeTab = signal<'all' | 'term' | 'daily'>('all');
    statusFilter = signal<'all' | 'PENDING' | 'OVERDUE' | 'PAID' | 'partial'>('all');
    sendingDefaultersSMS = signal(false);
    generatingDailyBills = signal(false);

    // Bulk Class Bills
    availableClasses = signal<Class[]>([]);
    selectedClassId = signal('');
    printingClassBills = signal(false);

    // Pagination and Search State
    pagination = signal<PaginationState>(defaultPaginationState());
    searchQuery = signal('');

    // Computed paginated records
    paginatedRecords = computed(() => {
        let list = this.records();
        const query = this.searchQuery().toLowerCase();

        if (query) {
            list = list.filter(r =>
                (r.student?.first_name?.toLowerCase().includes(query)) ||
                (r.student?.last_name?.toLowerCase().includes(query)) ||
                r.student_id.toLowerCase().includes(query) ||
                r.category.toLowerCase().includes(query)
            );
        }

        const state = this.pagination();
        const startIndex = (state.currentPage - 1) * state.pageSize;

        // Fee-type tab filter
        const ft = this.feeTab();
        if (ft === 'term') {
            list = list.filter(r => r.category === 'TERM_FEE');
        } else if (ft === 'daily') {
            list = list.filter(r => r.category !== 'TERM_FEE');
        }

        // Status filter
        const sf = this.statusFilter();
        if (sf === 'partial') {
            list = list.filter(r => (r.amount_paid ?? 0) > 0 && r.status !== 'PAID');
        } else if (sf !== 'all') {
            list = list.filter(r => r.status === sf);
        }

        return list.slice(startIndex, startIndex + state.pageSize);
    });

    // Count helpers for filter badges
    partialCount = computed(() => this.records().filter(r => (r.amount_paid ?? 0) > 0 && r.status !== 'PAID').length);
    pendingCount = computed(() => this.records().filter(r => r.status === 'PENDING').length);
    overdueCount = computed(() => this.records().filter(r => r.status === 'OVERDUE').length);
    paidCount = computed(() => this.records().filter(r => r.status === 'PAID').length);

    collectionProgressWidth = computed(() => {
        const s = this.summary();
        if (!s || s.total_receivables <= 0) return '0%';
        const p = Math.min((s.collections_mtd / s.total_receivables) * 100, 100);
        return `${p}%`;
    });

    exportToCSV() {
        const rows = this.records().map(r => [
            r.student?.first_name + ' ' + r.student?.last_name || r.student_id,
            r.category,
            r.description,
            r.amount,
            r.amount_paid || 0,
            r.amount - (r.amount_paid || 0),
            this.datePipe.transform(r.due_date, 'mediumDate'),
            r.status
        ]);
        const csv = ['Student,Category,Description,Amount,Paid,Balance,Due Date,Status', ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fiscal_records_${this.datePipe.transform(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Class-level statistics
    classStats = computed(() => {
        const statsMap = new Map<string, { totalOwed: number, totalPaid: number }>();

        for (const record of this.records()) {
            const className = record.student?.class?.name || 'Unassigned';
            
            if (!statsMap.has(className)) {
                statsMap.set(className, { totalOwed: 0, totalPaid: 0 });
            }
            
            const stats = statsMap.get(className)!;
            stats.totalPaid += record.amount_paid || 0;
            
            const owed = record.balance_due ?? (record.amount - (record.amount_paid || 0));
            if (owed > 0) {
                stats.totalOwed += owed;
            }
        }

        return Array.from(statsMap.entries())
            .map(([className, data]) => ({
                className,
                totalOwed: data.totalOwed,
                totalPaid: data.totalPaid
            }))
            .sort((a, b) => b.totalOwed - a.totalOwed);
    });


    // Wallet State
    showTopUpModal = signal(false);
    topUpData: TopUpData = { student_id: '', amount: 0, description: 'Wallet Top-Up' };
    toppingUp = signal(false);

    openTopUpModal(studentId: string = '') {
        this.topUpData = { student_id: studentId, amount: 0, description: 'Wallet Top-Up' };
        this.showTopUpModal.set(true);
    }

    submitTopUp(data?: TopUpData) {
        const payload = data || this.topUpData;
        if (!payload.student_id || payload.amount <= 0) {
            this.dialog.alert('Please provide a valid Student ID and Amount.', 'Validation Error', 'warning', 'OK');
            return;
        }
        this.toppingUp.set(true);
        this.fiscalService.topUpWallet(payload.student_id, payload.amount, payload.description).subscribe({
            next: () => {
                this.toppingUp.set(false);
                this.showTopUpModal.set(false);
                this.topUpData = { student_id: '', amount: 0, description: 'Wallet Top-Up' };
                this.dialog.alert('Wallet has been successfully topped up.', 'Success', 'info', 'OK');
                this.loadData();
            },
            error: (err) => {
                this.toppingUp.set(false);
                this.dialog.alert('Failed to top-up wallet: ' + err.message, 'Error', 'info', 'OK');
            }
        });
    }

    // Partial Payment State
    showPartialPaymentModal = signal(false);
    partialPaymentRecord = signal<FiscalRecord | null>(null);
    partialPaymentAmount = signal<number>(0);
    partialPaymentNote = signal<string>('');
    processingPartialPayment = signal(false);

    openPartialPaymentModal(record: FiscalRecord) {
        this.partialPaymentRecord.set(record);
        // Default amount to remaining balance if available, otherwise the full amount
        const remaining = record.amount - (record.amount_paid || 0);
        this.partialPaymentAmount.set(remaining > 0 ? remaining : record.amount);
        this.partialPaymentNote.set(`Partial payment for ${record.category}`);
        this.showPartialPaymentModal.set(true);
    }

    closePartialPaymentModal() {
        this.showPartialPaymentModal.set(false);
        this.partialPaymentRecord.set(null);
        this.partialPaymentAmount.set(0);
        this.partialPaymentNote.set('');
    }

    submitPartialPayment() {
        const record = this.partialPaymentRecord();
        const amount = this.partialPaymentAmount();
        const note = this.partialPaymentNote();

        if (!record || amount <= 0) {
            this.dialog.alert('Please provide a valid amount greater than 0.', 'Validation Error', 'warning', 'OK');
            return;
        }

        const remaining = record.amount - (record.amount_paid || 0);
        if (amount > remaining) {
            this.dialog.alert(`Amount exceeds the outstanding balance of GHS ${remaining.toFixed(2)}.`, 'Validation Error', 'warning', 'OK');
            return;
        }

        this.processingPartialPayment.set(true);
        this.fiscalService.processPartialPayment(record.id, amount, note).subscribe({
            next: () => {
                this.processingPartialPayment.set(false);
                this.closePartialPaymentModal();
                this.dialog.alert('Partial payment recorded successfully.', 'Success', 'success', 'OK');
                this.loadData();
            },
            error: (err) => {
                this.processingPartialPayment.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to record partial payment.', 'Error', 'danger', 'OK');
            }
        });
    }

    ngOnInit() {
        this.loadData();
        this.classService.getClasses().subscribe({
            next: (classes) => this.availableClasses.set(classes),
            error: () => {}
        });
    }

    printAllClassBills() {
        const classId = this.selectedClassId();
        if (!classId) {
            this.dialog.alert('Please select a class first.', 'No Class Selected', 'warning', 'OK');
            return;
        }
        this.printingClassBills.set(true);
        this.fiscalService.printClassBills(classId).subscribe({
            next: (blob) => {
                this.printingClassBills.set(false);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const className = this.availableClasses().find(c => c.id === classId)?.name || 'class';
                a.download = `${className.replace(/\s+/g, '_')}_bills.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                this.printingClassBills.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to generate class bills.', 'Error', 'danger', 'OK');
            }
        });
    }

    getDaysLabel(record: FiscalRecord): { text: string; cls: string } | null {
        if (record.status === 'PAID') return null;
        const isDaily = record.category !== 'TERM_FEE';
        const now = new Date();
        const due = new Date(record.due_date);
        // Compare calendar dates only (ignore time)
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const diffMs = dueDay.getTime() - nowDay.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (days < 0) {
            const abs = Math.abs(days);
            return { text: `${abs} day${abs !== 1 ? 's' : ''} overdue`, cls: 'text-rose-400' };
        } else if (days === 0) {
            return isDaily
                ? { text: 'Generated today', cls: 'text-blue-400' }
                : { text: 'Due today', cls: 'text-amber-400' };
        } else {
            return { text: `${days} day${days !== 1 ? 's' : ''} left`, cls: 'text-emerald-400' };
        }
    }

    loadData() {
        this.loadRecords();
        this.loadSummary();
        this.loadRecommendations();
        this.loadDefaulters();
    }

    loadDefaulters() {
        this.fiscalService.getDefaulters().subscribe({
            next: (res) => {
                this.defaulters.set(res.defaulters);
                this.defaultersCount.set(res.count);
            },
            error: () => {}
        });
    }

    loadRecommendations() {
        this.fiscalService.getRecommendations().subscribe({
            next: (data) => this.recommendations.set(data),
            error: (err) => console.error('Failed to load recommendations:', err)
        });
    }

    loadSummary() {
        this.fiscalService.getSummary().subscribe({
            next: (data) => this.summary.set(data),
            error: (err) => console.error('Failed to load summary:', err)
        });
    }

    loadRecords() {
        this.fiscalService.getRecords().subscribe({
            next: (data) => {
                this.records.set(data);
                this.pagination.update(state => ({
                    ...state,
                    totalCount: data.length,
                    totalPages: Math.ceil(data.length / state.pageSize) || 1,
                    currentPage: 1 // Reset to first page on load
                }));
            },
            error: (err) => console.error('Failed to load records:', err)
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.pagination().totalPages) {
            this.pagination.update(state => ({ ...state, currentPage: page }));
        }
    }

    refreshOverdue() {
        this.fiscalService.refreshOverdue().subscribe(() => {
            this.loadData();
        });
    }

    payRecord(record: FiscalRecord) {
        this.dialog.confirm(`Confirm manual payment of GHS ${record.amount} for ${record.category}?`, 'Manual Settlement', 'info', 'Settle Payment').subscribe(confirmed => {
            if (confirmed) {
                this.fiscalService.processPayment(record.id).subscribe({
                    next: () => {
                        this.dialog.alert('Payment settled successfully.', 'Success', 'success');
                        this.loadData();
                    },
                    error: (err) => {
                        this.dialog.alert(err?.error?.error || 'Failed to settle payment.', 'Error', 'danger');
                    }
                });
            }
        });
    }

    printReceipt(record: FiscalRecord) {
        if ((record.amount_paid ?? 0) <= 0) {
            this.dialog.alert('No payment has been made on this record. A receipt is only available after a partial or full payment.', 'No Receipt Available', 'warning', 'OK');
            return;
        }
        this.fiscalService.getReceipt(record.id).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const win = window.open(url, '_blank');
                if (win) {
                    win.onload = () => {
                        win.print();
                    };
                }
                // Revoke after a short delay to allow printing
                setTimeout(() => window.URL.revokeObjectURL(url), 30000);
            },
            error: (err) => {
                const msg = err?.error instanceof Blob
                    ? err.error.text().then((t: string) => {
                        try { return JSON.parse(t)?.error; } catch { return 'Failed to generate receipt.'; }
                    })
                    : (err?.error?.error || 'Failed to generate receipt.');
                if (typeof msg === 'string') {
                    this.dialog.alert(msg, 'Error', 'danger', 'OK');
                } else {
                    msg.then((m: string) => this.dialog.alert(m, 'Error', 'danger', 'OK'));
                }
            }
        });
    }

    blastDefaultersSMS() {
        this.dialog.confirm(`Send an SMS reminder to all ${this.defaultersCount()} fee defaulters via Arkasel SMS?`, 'SMS Blast to Defaulters', 'info', 'Send SMS').subscribe(confirmed => {
            if (confirmed) {
                this.sendingDefaultersSMS.set(true);
                this.commService.sendUrgentSMS({ target_audience: 'FEE_DEFAULTERS', message: 'Dear Parent, your child has an outstanding fee balance. Please contact the school bursar to settle your account. Thank you.' }).subscribe({
                    next: () => {
                        this.sendingDefaultersSMS.set(false);
                        this.dialog.alert('SMS blast sent to all fee defaulters via Arkasel SMS.', 'Success', 'success');
                    },
                    error: (err) => {
                        this.sendingDefaultersSMS.set(false);
                        this.dialog.alert(err?.error?.error || 'Failed to send SMS blast.', 'Error', 'danger');
                    }
                });
            }
        });
    }


    viewAudit(record: FiscalRecord) {
        const details = `Record ID: ${record.id}
Category: ${record.category}
Amount: GHS ${record.amount.toFixed(2)}
Status: ${record.status}
Description: ${record.description}`;

        this.dialog.alert(details, 'Fiscal Audit Trail', 'info', 'Close').subscribe();
    }

    // Payment Modal
    showPaymentModal = signal(false);
    selectedRecordForPayment = signal<FiscalRecord | null>(null);
    paymentAmount = signal<number>(0);
    isPaymentLoading = signal(false);

    payOnline(record: FiscalRecord) {
        this.selectedRecordForPayment.set(record);
        this.paymentAmount.set(record.balance_due || (record.amount - (record.amount_paid || 0)));
        this.showPaymentModal.set(true);
    }

    closePaymentModal() {
        this.showPaymentModal.set(false);
        this.selectedRecordForPayment.set(null);
    }

    confirmPayment() {
        const record = this.selectedRecordForPayment();
        if (!record) return;

        const amount = this.paymentAmount();
        if (amount <= 0 || amount > (record.balance_due || (record.amount - (record.amount_paid || 0)))) {
            this.dialog.alert('Please enter a valid amount not exceeding the balance due.', 'Invalid Amount', 'warning');
            return;
        }

        this.isPaymentLoading.set(true);
        this.paymentService.initializePayment(record.id, amount).subscribe({
            next: (res) => {
                this.isPaymentLoading.set(false);
                window.location.href = res.authorization_url;
            },
            error: (err) => {
                this.isPaymentLoading.set(false);
                const errorMsg = err.error?.error || 'Failed to initialize Paystack payment checkout.';
                this.dialog.alert(errorMsg, 'Payment Initialization Failed', 'danger');
            }
        });
    }


}

