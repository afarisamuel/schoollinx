import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { PayrollRecord, DeductionType, AllowanceType, TaxBracket } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-payroll-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll-manager.html',
  styleUrls: ['./payroll-manager.css']
})
export class PayrollManager implements OnInit {
  private hrService = inject(HrService);
  
  payrollRecords = signal<PayrollRecord[]>([]);
  deductionTypes = signal<DeductionType[]>([]);
  allowanceTypes = signal<AllowanceType[]>([]);
  taxBrackets = signal<TaxBracket[]>([]);
  
  activeTab: 'DISBURSEMENTS' | 'TAX_BRACKETS' = 'DISBURSEMENTS';

  totalPayrollGross = computed(() => {
    return this.payrollRecords().reduce((sum, r) => sum + (r.gross_pay || 0), 0);
  });

  totalPayrollDeductions = computed(() => {
    return this.payrollRecords().reduce((sum, r) => sum + (r.deductions || 0), 0);
  });

  totalPayrollNet = computed(() => {
    return this.payrollRecords().reduce((sum, r) => sum + (r.net_pay || 0), 0);
  });

  paidCount = computed(() => {
    return this.payrollRecords().filter(r => r.status === 'PAID').length;
  });

  pendingCount = computed(() => {
    return this.payrollRecords().filter(r => r.status === 'PENDING').length;
  });

  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();

  months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' },   { value: 4, label: 'April' },
    { value: 5, label: 'May' },     { value: 6, label: 'June' },
    { value: 7, label: 'July' },    { value: 8, label: 'August' },
    { value: 9, label: 'September' },{ value: 10, label: 'October' },
    { value: 11, label: 'November' },{ value: 12, label: 'December' },
  ];

  // Modal State
  isProcessModalOpen = false;
  isPaidModalOpen = false;
  isAlertModalOpen = false;
  isDeductionModalOpen = false;
  
  alertModalConfig = { title: '', message: '', isError: false };
  pendingRecordId: string | null = null;
  isProcessing = false;
  
  // Deduction Form State
  editingDeductionId: string | null = null;
  deductionForm: Partial<DeductionType> = { name: '', description: '', rate_type: 'PERCENTAGE', rate: 0, is_active: true };

  // Allowance Form State
  isAllowanceModalOpen = false;
  editingAllowanceId: string | null = null;
  allowanceForm: Partial<AllowanceType> = { name: '', description: '', rate_type: 'FIXED', rate: 0, is_active: true };

  // Tax Bracket Form State
  isTaxBracketModalOpen = false;
  editingTaxBracketId: string | null = null;
  taxBracketForm: Partial<TaxBracket> = { min_income: 0, max_income: undefined, rate: 0, is_active: true };

  ngOnInit(): void {
    this.loadPayroll();
    this.loadDeductions();
    this.loadAllowances();
    this.loadTaxBrackets();
  }

  loadAllowances(): void {
    this.hrService.getAllowanceTypes().subscribe({
      next: (res) => this.allowanceTypes.set(res || []),
      error: (err) => console.error('Error loading allowances', err)
    });
  }

  loadTaxBrackets(): void {
    this.hrService.getTaxBrackets().subscribe({
      next: (res) => this.taxBrackets.set(res || []),
      error: (err) => console.error('Error loading tax brackets', err)
    });
  }

  markAsPaid(id: string) {
    this.hrService.markPayrollPaid(id).subscribe({
        next: () => this.loadPayroll(),
        error: (err) => console.error(err)
    });
  }

  downloadPayslip(id: string) {
      this.hrService.downloadPayslip(id);
  }

  loadPayroll(): void {
    this.hrService.getPayrollHistory(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => this.payrollRecords.set(res || []),
      error: (err) => console.error('Error loading payroll', err)
    });
  }

  loadDeductions(): void {
    this.hrService.getDeductionTypes().subscribe({
      next: (res) => this.deductionTypes.set(res || []),
      error: (err) => console.error('Error loading deductions', err)
    });
  }

  // ---- Deduction Config Flow ----
  openDeductionModal(dt?: DeductionType): void {
    if (dt) {
      this.editingDeductionId = dt.id;
      this.deductionForm = { ...dt };
    } else {
      this.editingDeductionId = null;
      this.deductionForm = { name: '', description: '', rate_type: 'PERCENTAGE', rate: 0, is_active: true };
    }
    this.isDeductionModalOpen = true;
  }

  closeDeductionModal(): void {
    this.isDeductionModalOpen = false;
    this.editingDeductionId = null;
  }

  saveDeduction(): void {
    if (!this.deductionForm.name || !this.deductionForm.rate) return;
    this.isProcessing = true;

    if (this.editingDeductionId) {
      this.hrService.updateDeductionType(this.editingDeductionId, this.deductionForm).subscribe({
        next: () => {
          this.loadDeductions();
          this.closeDeductionModal();
          this.isProcessing = false;
          this.showAlert('Success', 'Deduction type updated.', false);
        },
        error: () => {
          this.isProcessing = false;
          this.showAlert('Error', 'Failed to update deduction.', true);
        }
      });
    } else {
      this.hrService.createDeductionType(this.deductionForm).subscribe({
        next: () => {
          this.loadDeductions();
          this.closeDeductionModal();
          this.isProcessing = false;
          this.showAlert('Success', 'Deduction type created.', false);
        },
        error: () => {
          this.isProcessing = false;
          this.showAlert('Error', 'Failed to create deduction.', true);
        }
      });
    }
  }

  deleteDeduction(id: string): void {
    if (confirm('Are you sure you want to delete this deduction type?')) {
      this.hrService.deleteDeductionType(id).subscribe({
        next: () => {
          this.loadDeductions();
          this.showAlert('Success', 'Deduction type deleted.', false);
        },
        error: () => this.showAlert('Error', 'Failed to delete deduction.', true)
      });
    }
  }

  toggleDeductionStatus(dt: DeductionType): void {
    const updated = { ...dt, is_active: !dt.is_active };
    this.hrService.updateDeductionType(dt.id, updated).subscribe({
      next: () => this.loadDeductions(),
      error: () => this.showAlert('Error', 'Failed to toggle status.', true)
    });
  }

  // ---- Allowance Config Flow ----
  openAllowanceModal(at?: AllowanceType): void {
    if (at) {
      this.editingAllowanceId = at.id;
      this.allowanceForm = { ...at };
    } else {
      this.editingAllowanceId = null;
      this.allowanceForm = { name: '', description: '', rate_type: 'FIXED', rate: 0, is_active: true };
    }
    this.isAllowanceModalOpen = true;
  }

  closeAllowanceModal(): void {
    this.isAllowanceModalOpen = false;
    this.editingAllowanceId = null;
  }

  saveAllowance(): void {
    if (!this.allowanceForm.name || !this.allowanceForm.rate) return;
    this.isProcessing = true;
    const req = this.editingAllowanceId 
      ? this.hrService.updateAllowanceType(this.editingAllowanceId, this.allowanceForm)
      : this.hrService.createAllowanceType(this.allowanceForm);

    req.subscribe({
      next: () => {
        this.loadAllowances();
        this.closeAllowanceModal();
        this.isProcessing = false;
        this.showAlert('Success', 'Allowance saved.', false);
      },
      error: () => {
        this.isProcessing = false;
        this.showAlert('Error', 'Failed to save allowance.', true);
      }
    });
  }

  deleteAllowance(id: string): void {
    if (confirm('Delete this allowance?')) {
      this.hrService.deleteAllowanceType(id).subscribe({
        next: () => { this.loadAllowances(); this.showAlert('Success', 'Allowance deleted.', false); },
        error: () => this.showAlert('Error', 'Failed to delete.', true)
      });
    }
  }

  toggleAllowanceStatus(at: AllowanceType): void {
    this.hrService.updateAllowanceType(at.id, { ...at, is_active: !at.is_active }).subscribe({
      next: () => this.loadAllowances()
    });
  }

  // ---- Tax Bracket Config Flow ----
  openTaxBracketModal(tb?: TaxBracket): void {
    if (tb) {
      this.editingTaxBracketId = tb.id;
      this.taxBracketForm = { ...tb };
    } else {
      this.editingTaxBracketId = null;
      this.taxBracketForm = { min_income: 0, max_income: undefined, rate: 0, is_active: true };
    }
    this.isTaxBracketModalOpen = true;
  }

  closeTaxBracketModal(): void {
    this.isTaxBracketModalOpen = false;
    this.editingTaxBracketId = null;
  }

  saveTaxBracket(): void {
    if (this.taxBracketForm.min_income === undefined || this.taxBracketForm.rate === undefined) return;
    this.isProcessing = true;
    const req = this.editingTaxBracketId 
      ? this.hrService.updateTaxBracket(this.editingTaxBracketId, this.taxBracketForm)
      : this.hrService.createTaxBracket(this.taxBracketForm);

    req.subscribe({
      next: () => {
        this.loadTaxBrackets();
        this.closeTaxBracketModal();
        this.isProcessing = false;
        this.showAlert('Success', 'Tax bracket saved.', false);
      },
      error: () => {
        this.isProcessing = false;
        this.showAlert('Error', 'Failed to save tax bracket.', true);
      }
    });
  }

  deleteTaxBracket(id: string): void {
    if (confirm('Delete this tax bracket?')) {
      this.hrService.deleteTaxBracket(id).subscribe({
        next: () => { this.loadTaxBrackets(); this.showAlert('Success', 'Tax Bracket deleted.', false); },
        error: () => this.showAlert('Error', 'Failed to delete.', true)
      });
    }
  }

  toggleTaxBracketStatus(tb: TaxBracket): void {
    this.hrService.updateTaxBracket(tb.id, { ...tb, is_active: !tb.is_active }).subscribe({
      next: () => this.loadTaxBrackets()
    });
  }

  // ---- Process Payroll Flow ----
  openProcessModal(): void {
    this.isProcessModalOpen = true;
  }

  closeProcessModal(): void {
    this.isProcessModalOpen = false;
  }

  confirmProcessPayroll(): void {
    this.isProcessing = true;
    this.hrService.processMonthlyPayroll(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => {
        this.payrollRecords.set(res || []);
        this.isProcessing = false;
        this.closeProcessModal();
        this.showAlert('Success', 'Payroll generated successfully.', false);
      },
      error: (err) => {
        console.error('Error processing payroll', err);
        this.isProcessing = false;
        this.closeProcessModal();
        this.showAlert('Error', 'Failed to process payroll.', true);
      }
    });
  }

  // ---- Mark Paid Flow ----
  openPaidModal(id: string): void {
    this.pendingRecordId = id;
    this.isPaidModalOpen = true;
  }

  closePaidModal(): void {
    this.isPaidModalOpen = false;
    this.pendingRecordId = null;
  }

  confirmMarkPaid(): void {
    if (!this.pendingRecordId) return;
    this.isProcessing = true;
    this.hrService.markPayrollPaid(this.pendingRecordId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.closePaidModal();
        this.loadPayroll();
        this.showAlert('Success', 'Salary disbursement marked as PAID.', false);
      },
      error: (err) => {
        console.error('Error marking paid', err);
        this.isProcessing = false;
        this.closePaidModal();
        this.showAlert('Error', 'Failed to mark disbursement as paid.', true);
      }
    });
  }

  // ---- Alert Modal Flow ----
  showAlert(title: string, message: string, isError: boolean): void {
    this.alertModalConfig = { title, message, isError };
    this.isAlertModalOpen = true;
  }

  closeAlertModal(): void {
    this.isAlertModalOpen = false;
  }

  get selectedMonthName(): string {
    return this.months.find(m => m.value == this.selectedMonth)?.label || '';
  }

  downloadSSNITSchedule(): void {
    const period = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    this.hrService.downloadSSNITSchedule(period);
  }

  downloadGRASchedule(): void {
    const period = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    this.hrService.downloadGRASchedule(period);
  }
}
