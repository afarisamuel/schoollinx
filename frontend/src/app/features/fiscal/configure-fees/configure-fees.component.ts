import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FiscalService, FeeStructure } from '../../../core/infrastructure/fiscal/fiscal.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

interface CategoryMeta {
  key: string;
  label: string;
  emoji: string;
  bg: string;
}

@Component({
  selector: 'app-configure-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterModule],
  templateUrl: './configure-fees.component.html'
})
export class ConfigureFeesComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  private academicPeriodService = inject(AcademicPeriodService);
  private dialog = inject(DialogService);

  activePeriod = signal<AcademicPeriod | null>(null);
  feeStructures = signal<FeeStructure[]>([]);
  generatingFees = signal(false);
  generatingDailyFees = signal(false);

  activeTab = signal<'term' | 'daily'>('term');

  termFees = computed(() => this.feeStructures().filter(f => f.is_term_fee || f.frequency !== 'DAILY'));
  dailyFees = computed(() => this.feeStructures().filter(f => !f.is_term_fee || f.frequency === 'DAILY'));

  availableCategories = ['TUITION', 'CANTEEN', 'LAB', 'LIBRARY_FINE', 'EXTRACURRICULAR', 'CUSTOM'];
  availableFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'TERMLY', 'ANNUALLY', 'CUSTOM'];

  newFee: Partial<FeeStructure> & { frequency?: string, is_term_fee?: boolean } = { category: 'TUITION', amount: 0, frequency: 'TERMLY', is_term_fee: true };
  customCategory = '';
  customFrequency = '';

  categoryMeta: CategoryMeta[] = [
    { key: 'TUITION',       label: 'Tuition',       emoji: '📚', bg: 'rgba(99,102,241,0.15)' },
    { key: 'CANTEEN',       label: 'Canteen',        emoji: '🍽️', bg: 'rgba(251,191,36,0.15)' },
    { key: 'LAB',           label: 'Lab',            emoji: '🔬', bg: 'rgba(6,182,212,0.15)'  },
    { key: 'LIBRARY_FINE',  label: 'Library',        emoji: '📖', bg: 'rgba(168,85,247,0.15)' },
    { key: 'EXTRACURRICULAR', label: 'Extra',        emoji: '⚽', bg: 'rgba(249,115,22,0.15)' },
    { key: 'CUSTOM',        label: 'Custom',         emoji: '✏️', bg: 'rgba(148,163,184,0.15)'},
  ];

  private categoryEmojiMap: Record<string, string> = {
    TUITION: '📚', CANTEEN: '🍽️',
    LAB: '🔬', LIBRARY_FINE: '📖', EXTRACURRICULAR: '⚽', CUSTOM: '✏️',
  };

  getCategoryEmoji(cat: string): string {
    return this.categoryEmojiMap[cat] ?? '💰';
  }

  selectCategory(key: string): void {
    this.newFee = { ...this.newFee, category: key as any };
    if (key !== 'CUSTOM') this.customCategory = '';
  }

  totalFees = computed(() =>
    this.feeStructures().reduce((sum, f) => sum + (f.amount ?? 0), 0)
  );

  ngOnInit() {
    this.loadActivePeriod();
  }

  loadActivePeriod() {
    this.academicPeriodService.getActive().subscribe({
      next: (period: AcademicPeriod) => {
        this.activePeriod.set(period);
        this.loadFeeStructures(period.id);
      },
      error: () => console.warn('No active academic period found')
    });
  }

  loadFeeStructures(periodId: string) {
    this.fiscalService.getFeeStructures(periodId).subscribe({
      next: (structures: FeeStructure[]) => this.feeStructures.set(structures || []),
      error: (err: any) => console.error('Failed to load fee structures:', err)
    });
  }

  onSave() {
    const period = this.activePeriod();
    if (!period || !this.newFee.amount || this.newFee.amount <= 0) return;

    let finalCategory = this.newFee.category;
    if ((finalCategory as any) === 'CUSTOM') {
      if (!this.customCategory.trim()) return;
      finalCategory = this.customCategory.trim().toUpperCase() as any;
    }
    if (!finalCategory) return;

    let finalFrequency = this.newFee.frequency;
    if (finalFrequency === 'CUSTOM') {
      if (!this.customFrequency.trim()) return;
      finalFrequency = this.customFrequency.trim().toUpperCase();
    }
    if (!finalFrequency) finalFrequency = 'TERMLY';

    const payload: Partial<FeeStructure> = {
      academic_period_id: period.id,
      category: finalCategory as any,
      amount: this.newFee.amount,
      frequency: finalFrequency,
      is_term_fee: this.newFee.is_term_fee
    };

    this.fiscalService.setFeeStructure(payload).subscribe({
      next: () => {
        this.loadFeeStructures(period.id);
        this.dialog.alert('Fee structure saved successfully.', 'Saved', 'success', 'OK');
        this.newFee = { category: 'TUITION', amount: 0, frequency: 'TERMLY', is_term_fee: true };
        this.customCategory = '';
        this.customFrequency = '';
      },
      error: (err: any) => this.dialog.alert(err?.error?.error || 'Failed to save fee structure', 'Error', 'danger')
    });
  }

  onDeleteFee(fee: FeeStructure) {
    if (!fee.id) return;
    this.dialog.confirm(`Are you sure you want to remove the ${fee.category} fee structure?`, 'Remove Fee', 'warning', 'Remove')
      .subscribe(confirmed => {
        if (confirmed) {
          this.fiscalService.deleteFeeStructure(fee.id!).subscribe({
            next: () => {
              const period = this.activePeriod();
              if (period) this.loadFeeStructures(period.id);
            },
            error: (err: any) => this.dialog.alert(err?.error?.error || 'Failed to delete fee structure', 'Error', 'danger')
          });
        }
      });
  }

  onGenerate() {
    const period = this.activePeriod();
    if (!period) return;

    // Find the active term label to display in the confirmation
    const activeTerm = period.terms?.find(t => t.term_number === period.current_term);
    const termLabel = activeTerm ? `"${activeTerm.name}"` : `Term ${period.current_term}`;

    this.dialog.confirm(
      `This will issue outstanding fee balances for ${termLabel} to all active students. The due date will be set to the end of ${termLabel}. Continue?`,
      `Generate Fees — ${termLabel}`,
      'info',
      'Generate'
    ).subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.generatingFees.set(true);
        this.fiscalService.generateTermFees(period.id).subscribe({
          next: (res: { message: string; count: number }) => {
            this.generatingFees.set(false);
            this.dialog.alert(res.message || `Term fees generated for ${termLabel}.`, 'Done', 'success');
          },
          error: (err: any) => {
            this.generatingFees.set(false);
            this.dialog.alert(err?.error?.error || 'Failed to generate term fees.', 'Error', 'danger');
          }
        });
      }
    });
  }

  onGenerateDailyBills() {
    const period = this.activePeriod();
    if (!period) return;

    this.dialog.confirm(
      'This will automatically read all DAILY fee structures configured for the current academic period, sum their amounts, and generate today\'s daily bills for every active student. Continue?',
      'Generate Daily Bills',
      'info',
      'Generate'
    ).subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.generatingDailyFees.set(true);
        this.fiscalService.generateDailyBillsFromConfig(period.id).subscribe({
          next: (res) => {
            this.generatingDailyFees.set(false);
            this.dialog.alert(
              `Generated ${res.count} bills successfully. Total Amount: GHS ${res.amount}. Categories: ${res.categories.join(', ')}.`,
              'Success',
              'success'
            ).subscribe();
          },
          error: (err) => {
            this.generatingDailyFees.set(false);
            this.dialog.alert(err?.error?.error || 'Failed to generate daily bills.', 'Error', 'danger').subscribe();
          }
        });
      }
    });
  }
}
