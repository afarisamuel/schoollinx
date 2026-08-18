import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-scholastic-level-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './scholastic-level-management.component.html',
  styleUrl: './scholastic-level-management.component.css'
})
export class ScholasticLevelManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private slService = inject(ScholasticLevelService);
  private dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);

  levels = signal<ScholasticLevel[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showForm = signal<boolean>(false);

  levelForm = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    ordinal: [1, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.reloadLevels();
    }
  }

  reloadLevels() {
    this.isLoading.set(true);
    this.slService.getAll().subscribe({
      next: (data) => {
        this.levels.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSubmit() {
    if (this.levelForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.levelForm.value;
    const level: Partial<ScholasticLevel> = {
      name: val.name!,
      ordinal: val.ordinal!
    };

    if (val.id) {
      this.slService.update(val.id!, level).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.reloadLevels();
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.slService.create(level).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.reloadLevels();
        },
        error: () => this.isSubmitting.set(false)
      });
    }
  }

  onEdit(level: ScholasticLevel) {
    this.levelForm.patchValue({
      id: level.id,
      name: level.name,
      ordinal: level.ordinal
    });
    this.showForm.set(true);
  }

  onDelete(id: string) {
    this.dialog.confirm('All students associated with this level may lose classification accuracy. Continue?', 'Delete Scholastic Level', 'danger', 'Delete Level').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.slService.delete(id).subscribe(() => this.reloadLevels());
      }
    });
  }

  resetForm() {
    this.levelForm.reset({ ordinal: this.levels().length + 1 });
    this.showForm.set(false);
  }
}
