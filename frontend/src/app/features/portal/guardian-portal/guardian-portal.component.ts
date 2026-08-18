import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { Student } from '../../../core/domain/student.model';
import { AcademicInsight } from '../../../core/infrastructure/insights/insights.service';
import { FiscalService, FiscalRecord } from '../../../core/infrastructure/fiscal/fiscal.service';
import { PaymentService } from '../../../core/infrastructure/payment/payment.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-guardian-portal',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './guardian-portal.component.html',
    styleUrl: './guardian-portal.component.css'
})
export class GuardianPortalComponent implements OnInit {
    private guardianService = inject(GuardianService);
    private fiscalService = inject(FiscalService);
    private paymentService = inject(PaymentService);
    private dialog = inject(DialogService);

    children = signal<Student[]>([]);
    selectedChild = signal<Student | null>(null);
    insights = signal<AcademicInsight[]>([]);
    fiscalRecords = signal<FiscalRecord[]>([]);
    fiscalBalance = signal<number>(0);

    isLoading = signal(true);
    insightsLoading = signal(false);
    fiscalLoading = signal(false);

    ngOnInit() {
        this.guardianService.getChildren().subscribe({
            next: (data) => {
                this.children.set(data);
                this.isLoading.set(false);
                if (data.length > 0) {
                    this.selectChild(data[0]); // Auto-select first child
                }
            },
            error: () => this.isLoading.set(false)
        });
    }

    selectChild(child: Student) {
        this.selectedChild.set(child);
        this.loadInsights(child.id!);
        this.loadFiscalStatus(child.id!);
    }

    loadInsights(studentId: string) {
        this.insightsLoading.set(true);
        this.guardianService.getChildAcademics(studentId).subscribe({
            next: (data) => {
                this.insights.set(data);
                this.insightsLoading.set(false);
            },
            error: () => {
                this.insights.set([]);
                this.insightsLoading.set(false);
            }
        });
    }

    loadFiscalStatus(studentId: string) {
        this.fiscalLoading.set(true);
        this.fiscalService.getStudentFiscalStatus(studentId).subscribe({
            next: (data) => {
                this.fiscalRecords.set(data.records || []);
                this.fiscalBalance.set(data.balance || 0);
                this.fiscalLoading.set(false);
            },
            error: () => {
                this.fiscalRecords.set([]);
                this.fiscalBalance.set(0);
                this.fiscalLoading.set(false);
            }
        });
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
