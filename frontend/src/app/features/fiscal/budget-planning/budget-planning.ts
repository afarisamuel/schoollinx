import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FiscalService, Budget } from '../../../core/infrastructure/fiscal/fiscal.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-budget-planning',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, FormsModule],
  templateUrl: './budget-planning.html',
  styleUrl: './budget-planning.css'
})
export class BudgetPlanningComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  private dialog = inject(DialogService);

  budgets = signal<Budget[]>([]);
  academicYear = signal<string>('2023-2024');

  // Stats
  totalAllocated = computed(() => this.budgets().reduce((acc, b) => acc + b.allocated_amount, 0));
  totalSpent = computed(() => this.budgets().reduce((acc, b) => acc + b.spent_amount, 0));
  totalVariance = computed(() => this.totalAllocated() - this.totalSpent());

  // Form State
  showModal = signal(false);
  formData = { category: '', allocated_amount: 0 };
  isSubmitting = signal(false);

  ngOnInit(): void {
    this.loadBudgets();
  }

  loadBudgets(): void {
    this.fiscalService.getBudgets(this.academicYear()).subscribe({
      next: (res) => this.budgets.set(res),
      error: (err) => console.error('Failed to load budgets', err)
    });
  }

  openCreateModal() {
    this.formData = { category: '', allocated_amount: 0 };
    this.showModal.set(true);
  }

  submitBudget() {
    if (!this.formData.category || this.formData.allocated_amount <= 0) {
      this.dialog.alert('Please provide a valid category and amount.', 'Validation Error', 'warning');
      return;
    }
    
    this.isSubmitting.set(true);
    const newBudget: Partial<Budget> = {
      academic_year: this.academicYear(),
      category: this.formData.category,
      allocated_amount: this.formData.allocated_amount,
    };

    this.fiscalService.createBudget(newBudget).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showModal.set(false);
        this.dialog.alert('Budget allocation created successfully.', 'Success', 'success');
        this.loadBudgets();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.dialog.alert(err?.error?.error || 'Failed to create budget', 'Error', 'danger');
      }
    });
  }
}
