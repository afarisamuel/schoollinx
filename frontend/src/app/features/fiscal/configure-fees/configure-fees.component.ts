import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FiscalService, FeeStructure, InstallmentPlanTemplate, InstallmentPlanMilestoneDef, BillTemplateConfig, BillSupplyItem } from '../../../core/infrastructure/fiscal/fiscal.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

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
  private toast = inject(ToastService);

  activePeriod = signal<AcademicPeriod | null>(null);
  feeStructures = signal<FeeStructure[]>([]);
  generatingFees = signal(false);
  generatingDailyFees = signal(false);

  activeTab = signal<'term' | 'daily' | 'installments' | 'bill_template'>('term');

  // Bill Template Customization State
  billConfig = signal<BillTemplateConfig>({
    title: 'PUPIL BILL FOR TERM',
    subtitle: 'Official School Billing & Academic Expense Statement',
    footer_notes: 'Toiletries, stationery, and books must be presented on the first day of resumption.\nAll fee payments must be made using your child\'s student ID via official school payment channels.\nSTRICTLY NO PHYSICAL CASH PAYMENT TO SCHOOL STAFF.\nPayment can be made in advance to enhance flexible installments.',
    show_supplies_table: true,
    supplies_title: 'REQUIRED BOOKS & MATERIALS TO BE BROUGHT / PURCHASED',
    required_items: [
      { category: 'BOOKS', description: 'Core Mathematics Course Book', quantity: '1 copy', note: 'Compulsory for all terms' },
      { category: 'BOOKS', description: 'English Language & Grammar Workbook', quantity: '1 copy', note: 'Compulsory' },
      { category: 'STATIONERY', description: 'Ruled Exercise Books (Pack of 10)', quantity: '1 pack', note: 'Available at school store' },
      { category: 'TOILETRIES', description: 'Antiseptic Liquid / Disinfectant (250ml)', quantity: '2 bottles', note: 'Hand to Housemaster' },
      { category: 'TOILETRIES', description: 'Washing Powder (1kg)', quantity: '1 pack', note: 'Term requirement' },
      { category: 'TOILETRIES', description: 'Toilet Paper Rolls', quantity: '3 rolls', note: 'Standard pack' }
    ]
  });
  savingBillConfig = signal(false);
  newSupplyItem: BillSupplyItem = { category: 'BOOKS', description: '', quantity: '1', note: '' };

  // Installment Plan Configuration State
  installmentPlan = signal<InstallmentPlanTemplate>({
    name: 'Standard 3-Tier Split',
    schedule_text: '40% / 30% / 30% Schedule',
    is_enabled: true,
    milestones: [
      { index: 1, title: 'Milestone 1', description: 'Term Registration', percentage: 40, due_trigger: 'Term Registration' },
      { index: 2, title: 'Milestone 2', description: 'Mid-Term Assessment', percentage: 30, due_trigger: 'Mid-Term Assessment' },
      { index: 3, title: 'Milestone 3', description: 'Final Examinations', percentage: 30, due_trigger: 'Final Examinations' }
    ]
  });
  savingInstallments = signal(false);
  installmentTotalPct = computed(() =>
    this.installmentPlan().milestones.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0)
  );

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
    this.loadInstallmentSettings();
    this.loadBillConfig();
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

  // ── Installment Milestone Policy Methods ─────────────────────────────

  loadInstallmentSettings() {
    this.fiscalService.getInstallmentSettings().subscribe({
      next: (plan) => {
        if (plan && plan.milestones && plan.milestones.length > 0) {
          this.installmentPlan.set(plan);
        }
      },
      error: () => {}
    });
  }

  applyInstallmentPreset(type: '40-30-30' | '50-50' | '60-40' | '25-25-25-25') {
    if (type === '40-30-30') {
      this.installmentPlan.set({
        name: 'Standard 3-Tier Split',
        schedule_text: '40% / 30% / 30% Schedule',
        is_enabled: true,
        milestones: [
          { index: 1, title: 'Milestone 1', description: 'Term Registration', percentage: 40, due_trigger: 'Term Registration' },
          { index: 2, title: 'Milestone 2', description: 'Mid-Term Assessment', percentage: 30, due_trigger: 'Mid-Term Assessment' },
          { index: 3, title: 'Milestone 3', description: 'Final Examinations', percentage: 30, due_trigger: 'Final Examinations' }
        ]
      });
    } else if (type === '50-50') {
      this.installmentPlan.set({
        name: 'Biannual Split',
        schedule_text: '50% / 50% Schedule',
        is_enabled: true,
        milestones: [
          { index: 1, title: 'Milestone 1', description: 'Term Registration', percentage: 50, due_trigger: 'Term Registration' },
          { index: 2, title: 'Milestone 2', description: 'Mid-Term Clearance', percentage: 50, due_trigger: 'Mid-Term Assessment' }
        ]
      });
    } else if (type === '60-40') {
      this.installmentPlan.set({
        name: 'Admission & Clearance Split',
        schedule_text: '60% / 40% Schedule',
        is_enabled: true,
        milestones: [
          { index: 1, title: 'Milestone 1', description: 'Term Registration & Enrollment', percentage: 60, due_trigger: 'Term Registration' },
          { index: 2, title: 'Milestone 2', description: 'Exam Clearance', percentage: 40, due_trigger: 'Final Examinations' }
        ]
      });
    } else if (type === '25-25-25-25') {
      this.installmentPlan.set({
        name: 'Quarterly 4-Tier Plan',
        schedule_text: '25% / 25% / 25% / 25% Schedule',
        is_enabled: true,
        milestones: [
          { index: 1, title: 'Milestone 1', description: 'First Month Registration', percentage: 25, due_trigger: 'Term Registration' },
          { index: 2, title: 'Milestone 2', description: 'Month 2 Installment', percentage: 25, due_trigger: 'Month 2' },
          { index: 3, title: 'Milestone 3', description: 'Month 3 Installment', percentage: 25, due_trigger: 'Month 3' },
          { index: 4, title: 'Milestone 4', description: 'Final Month Clearance', percentage: 25, due_trigger: 'Final Examinations' }
        ]
      });
    }
  }

  addMilestone() {
    const cur = this.installmentPlan();
    const nextIdx = cur.milestones.length + 1;
    const remaining = Math.max(0, 100 - this.installmentTotalPct());
    this.installmentPlan.update(p => ({
      ...p,
      milestones: [
        ...p.milestones,
        {
          index: nextIdx,
          title: `Milestone ${nextIdx}`,
          description: `Installment Phase ${nextIdx}`,
          percentage: remaining,
          due_trigger: `Phase ${nextIdx}`
        }
      ]
    }));
    this.updateScheduleText();
  }

  removeMilestone(idx: number) {
    this.installmentPlan.update(p => {
      const updated = p.milestones.filter((_, i) => i !== idx).map((m, i) => ({
        ...m,
        index: i + 1,
        title: `Milestone ${i + 1}`
      }));
      return { ...p, milestones: updated };
    });
    this.updateScheduleText();
  }

  updateScheduleText() {
    const m = this.installmentPlan().milestones;
    const parts = m.map(x => `${x.percentage || 0}%`);
    this.installmentPlan.update(p => ({
      ...p,
      schedule_text: parts.join(' / ') + ' Schedule'
    }));
  }

  saveInstallmentPlan() {
    if (this.installmentTotalPct() !== 100) {
      this.toast.error(`Milestone percentages sum to ${this.installmentTotalPct()}%. They must sum to exactly 100%.`, 'Invalid Percentages');
      return;
    }

    this.savingInstallments.set(true);
    this.updateScheduleText();
    this.fiscalService.saveInstallmentSettings(this.installmentPlan()).subscribe({
      next: (saved) => {
        this.savingInstallments.set(false);
        this.installmentPlan.set(saved);
        this.toast.success('Tuition installment milestone policy saved and deployed to parent portals.', 'Installment Policy Saved');
      },
      error: (err) => {
        this.savingInstallments.set(false);
        this.toast.error(err?.error?.error || 'Failed to save installment milestone policy.', 'Error');
      }
    });
  }

  loadBillConfig() {
    this.fiscalService.getBillConfig().subscribe({
      next: (cfg) => {
        if (cfg) {
          if (!cfg.required_items) cfg.required_items = [];
          this.billConfig.set(cfg);
        }
      },
      error: () => console.warn('Using default bill configuration')
    });
  }

  onSaveBillConfig() {
    this.savingBillConfig.set(true);
    this.fiscalService.saveBillConfig(this.billConfig()).subscribe({
      next: (saved) => {
        this.savingBillConfig.set(false);
        this.billConfig.set(saved);
        this.toast.success('Bill template & supplies list updated successfully');
      },
      error: (err) => {
        this.savingBillConfig.set(false);
        this.toast.error('Failed to save bill template: ' + (err.error?.error || err.message));
      }
    });
  }

  addSupplyItem() {
    if (!this.newSupplyItem.description.trim()) {
      this.toast.error('Please enter an item description');
      return;
    }
    const current = this.billConfig();
    const updatedItems = [...(current.required_items || []), { ...this.newSupplyItem }];
    this.billConfig.set({ ...current, required_items: updatedItems });
    this.newSupplyItem = { category: 'BOOKS', description: '', quantity: '1', note: '' };
    this.toast.success('Item added to supplies table. Click Save to persist changes.');
  }

  removeSupplyItem(index: number) {
    const current = this.billConfig();
    const updatedItems = (current.required_items || []).filter((_, i) => i !== index);
    this.billConfig.set({ ...current, required_items: updatedItems });
  }
}
