import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod, AcademicTerm } from '../../../core/domain/academic-period.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-academic-period-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './academic-period-management.component.html',
  styleUrl: './academic-period-management.component.css'
})
export class AcademicPeriodManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apService = inject(AcademicPeriodService);
  private dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);

  periods = signal<AcademicPeriod[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showForm = signal<boolean>(false);

  periodForm = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(4)]],
    term_type: ['Semester', Validators.required],
    term_count: [2, [Validators.required, Validators.min(1), Validators.max(6)]]
  });

  selectedPeriod = signal<AcademicPeriod | null>(null);
  showCalendar = signal<boolean>(false);
  
  termForm = this.fb.group({
    id: [''],
    term_number: [1, [Validators.required, Validators.min(1)]],
    name: ['', Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required]
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPeriods();
    }
  }

  loadPeriods() {
    this.isLoading.set(true);
    this.apService.getAll().subscribe({
      next: (data) => {
        this.periods.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSubmit() {
    if (this.periodForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.periodForm.value;
    const period: Partial<AcademicPeriod> = {
      name: val.name!,
      term_type: val.term_type as any,
      term_count: val.term_count!
    };

    if (val.id) {
      this.apService.update(val.id!, period).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.loadPeriods();
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.apService.create(period).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.loadPeriods();
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  onActivate(id: string) {
    this.dialog.confirm('Are you sure you want to activate this period? All new records will use this configuration.', 'Activate Academic Period', 'info', 'Activate').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.apService.activate(id).subscribe(() => this.loadPeriods());
      }
    });
  }

  onEdit(period: AcademicPeriod) {
    this.periodForm.patchValue({
      id: period.id,
      name: period.name,
      term_type: period.term_type,
      term_count: period.term_count
    });
    this.showForm.set(true);
  }

  onDelete(id: string) {
    this.dialog.confirm('This action cannot be undone.', 'Delete Period', 'danger', 'Delete').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.apService.delete(id).subscribe(() => this.loadPeriods());
      }
    });
  }

  resetForm() {
    this.periodForm.reset({ term_type: 'Semester', term_count: 2 });
    this.showForm.set(false);
  }

  // Calendar / Term Methods

  openCalendar(period: AcademicPeriod) {
    this.selectedPeriod.set(period);
    this.showCalendar.set(true);
    this.termForm.reset({ term_number: (period.terms?.length || 0) + 1 });
  }

  closeCalendar() {
    this.showCalendar.set(false);
    this.selectedPeriod.set(null);
  }

  onTermSubmit() {
    if (this.termForm.invalid || !this.selectedPeriod()) return;
    this.isSubmitting.set(true);

    const val = this.termForm.value;
    const termData: Partial<AcademicTerm> = {
      term_number: val.term_number!,
      name: val.name!,
      start_date: val.start_date!,
      end_date: val.end_date!
    };

    const periodId = this.selectedPeriod()!.id;

    if (val.id) {
      this.apService.updateTerm(val.id, termData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.termForm.reset({ term_number: (this.selectedPeriod()?.terms?.length || 0) + 1 });
          this.loadPeriods(); // Reload all to get updated terms
          // Refresh selected period
          this.apService.getById(periodId).subscribe(p => this.selectedPeriod.set(p));
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.apService.createTerm(periodId, termData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.termForm.reset({ term_number: (this.selectedPeriod()?.terms?.length || 0) + 1 });
          this.loadPeriods();
          this.apService.getById(periodId).subscribe(p => this.selectedPeriod.set(p));
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  onEditTerm(term: AcademicTerm) {
    this.termForm.patchValue({
      id: term.id,
      term_number: term.term_number,
      name: term.name,
      start_date: new Date(term.start_date).toISOString().substring(0, 10),
      end_date: new Date(term.end_date).toISOString().substring(0, 10)
    });
  }

  onDeleteTerm(id: string) {
    this.dialog.confirm('Remove this term from the calendar?', 'Delete Term', 'danger', 'Delete').subscribe(confirmed => {
      if (confirmed) {
        this.apService.deleteTerm(id).subscribe(() => {
          this.loadPeriods();
          if (this.selectedPeriod()) {
             this.apService.getById(this.selectedPeriod()!.id).subscribe(p => this.selectedPeriod.set(p));
          }
        });
      }
    });
  }

  onActivateTerm(term: AcademicTerm) {
    const period = this.selectedPeriod();
    if (!period) return;
    this.dialog.confirm(
      `Set "${term.name}" as the current active term for this period?`,
      'Activate Term', 'info', 'Set Active'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      this.apService.activateTerm(period.id, term.id).subscribe({
        next: () => {
          this.dialog.alert(`"${term.name}" is now the active term.`, 'Term Activated', 'success').subscribe();
          this.loadPeriods();
          this.apService.getById(period.id).subscribe(p => this.selectedPeriod.set(p));
        },
        error: (err: any) => {
          this.dialog.alert(err.error?.error || 'Failed to activate term.', 'Error', 'danger').subscribe();
        }
      });
    });
  }

  onToggleTermLock(term: AcademicTerm) {
    const action = term.is_locked ? 'Unlock' : 'Lock';
    const msg = term.is_locked
      ? `Unlock "${term.name}"? Grading and data entry will resume for this term.`
      : `Lock "${term.name}"? This will freeze all data entry for this term globally.`;

    this.dialog.confirm(msg, `${action} Term`, term.is_locked ? 'info' : 'warning', action).subscribe(confirmed => {
      if (!confirmed) return;
      this.apService.toggleTermLock(term.id).subscribe({
        next: () => {
          const period = this.selectedPeriod();
          if (period) {
            this.apService.getById(period.id).subscribe(p => {
              this.selectedPeriod.set(p);
              this.loadPeriods();
            });
          }
        },
        error: (err: any) => {
          this.dialog.alert(err.error?.error || 'Failed to toggle term lock.', 'Error', 'danger').subscribe();
        }
      });
    });
  }
}

