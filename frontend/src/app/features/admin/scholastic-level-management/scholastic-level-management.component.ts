import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

export interface LevelPreset {
  title: string;
  category: string;
  description: string;
  levels: { name: string; ordinal: number }[];
}

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
  private classService = inject(ClassService);
  private dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);

  levels = signal<ScholasticLevel[]>([]);
  classes = signal<Class[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showForm = signal<boolean>(false);
  showPresetsModal = signal<boolean>(false);
  
  searchQuery = signal<string>('');
  filterTier = signal<'all' | 'entry' | 'intermediate' | 'final'>('all');
  activeViewMode = signal<'matrix' | 'pipeline'>('matrix');

  levelForm = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    ordinal: [1, [Validators.required, Validators.min(1), Validators.max(50)]]
  });

  // Sorted levels by ordinal ascending
  sortedLevels = computed(() => {
    return [...this.levels()].sort((a, b) => a.ordinal - b.ordinal);
  });

  // Entry Point Level (Lowest Ordinal)
  entryLevel = computed(() => {
    const list = this.sortedLevels();
    return list.length > 0 ? list[0] : null;
  });

  // Final/Graduating Level (Highest Ordinal)
  finalLevel = computed(() => {
    const list = this.sortedLevels();
    return list.length > 1 ? list[list.length - 1] : (list.length === 1 ? list[0] : null);
  });

  // Total linked classes across all levels
  totalLinkedClasses = computed(() => {
    const allLevels = this.levels();
    const levelIds = new Set(allLevels.map(l => l.id));
    return this.classes().filter(c => c.scholastic_level_id && levelIds.has(c.scholastic_level_id)).length;
  });

  // Filtered levels based on search and tier filter
  filteredLevels = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tier = this.filterTier();
    const list = this.sortedLevels();
    const total = list.length;

    return list.filter((lvl, idx) => {
      const matchesQuery = !query || lvl.name.toLowerCase().includes(query) || lvl.ordinal.toString().includes(query);
      if (!matchesQuery) return false;

      if (tier === 'entry') return idx === 0;
      if (tier === 'final') return idx === total - 1 && total > 1;
      if (tier === 'intermediate') return idx > 0 && idx < total - 1;
      return true;
    });
  });

  // Presets catalogue
  standardPresets: LevelPreset[] = [
    {
      title: 'Basic Education (Ghana Standard)',
      category: 'Ghana GES',
      description: 'Primary 1-6 through Junior High School (JHS 1-3)',
      levels: [
        { name: 'Primary 1', ordinal: 1 },
        { name: 'Primary 2', ordinal: 2 },
        { name: 'Primary 3', ordinal: 3 },
        { name: 'Primary 4', ordinal: 4 },
        { name: 'Primary 5', ordinal: 5 },
        { name: 'Primary 6', ordinal: 6 },
        { name: 'JHS 1', ordinal: 7 },
        { name: 'JHS 2', ordinal: 8 },
        { name: 'JHS 3', ordinal: 9 }
      ]
    },
    {
      title: 'Senior High School (SHS)',
      category: 'Secondary',
      description: '3-Year Secondary Education (SHS 1 - SHS 3)',
      levels: [
        { name: 'SHS 1', ordinal: 1 },
        { name: 'SHS 2', ordinal: 2 },
        { name: 'SHS 3', ordinal: 3 }
      ]
    },
    {
      title: 'Early Childhood Development',
      category: 'Preschool',
      description: 'Early foundational tiers (Crèche to Kindergarten 2)',
      levels: [
        { name: 'Crèche', ordinal: 1 },
        { name: 'Nursery 1', ordinal: 2 },
        { name: 'Nursery 2', ordinal: 3 },
        { name: 'KG 1', ordinal: 4 },
        { name: 'KG 2', ordinal: 5 }
      ]
    },
    {
      title: 'International K-12 System',
      category: 'International',
      description: 'Standard Grade 1 through Grade 12 hierarchy',
      levels: Array.from({ length: 12 }, (_, i) => ({
        name: `Grade ${i + 1}`,
        ordinal: i + 1
      }))
    }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.reloadLevels();
      this.loadClasses();
    }
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (cls) => this.classes.set(cls || []),
      error: (err) => console.error('Error loading classes for levels', err)
    });
  }

  getClassesForLevel(levelId: string): Class[] {
    return this.classes().filter(c => c.scholastic_level_id === levelId);
  }

  reloadLevels() {
    this.isLoading.set(true);
    this.slService.getAll().subscribe({
      next: (data) => {
        this.levels.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getTierStatus(level: ScholasticLevel): { label: string; class: string; dot: string } {
    const list = this.sortedLevels();
    const idx = list.findIndex(l => l.id === level.id);
    const total = list.length;

    if (idx === 0) {
      return {
        label: 'Entry Point',
        class: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500'
      };
    }
    if (idx === total - 1 && total > 1) {
      return {
        label: 'Graduating Gate',
        class: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500'
      };
    }
    return {
      label: 'Intermediate',
      class: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
      dot: 'bg-slate-400'
    };
  }

  openCreateModal() {
    const nextOrdinal = this.levels().length > 0
      ? Math.max(...this.levels().map(l => l.ordinal)) + 1
      : 1;
    this.levelForm.reset({
      id: '',
      name: '',
      ordinal: nextOrdinal
    });
    this.showForm.set(true);
  }

  onEdit(level: ScholasticLevel) {
    this.levelForm.patchValue({
      id: level.id,
      name: level.name,
      ordinal: level.ordinal
    });
    this.showForm.set(true);
  }

  closeModal() {
    this.showForm.set(false);
    this.levelForm.reset();
  }

  onSubmit() {
    if (this.levelForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.levelForm.value;
    const level: Partial<ScholasticLevel> = {
      name: val.name!.trim(),
      ordinal: Number(val.ordinal!)
    };

    if (val.id) {
      this.slService.update(val.id!, level).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.reloadLevels();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err.error?.error || 'Failed to update scholastic level.', 'Error', 'danger');
        }
      });
    } else {
      this.slService.create(level).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showForm.set(false);
          this.reloadLevels();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err.error?.error || 'Failed to create scholastic level.', 'Error', 'danger');
        }
      });
    }
  }

  onDelete(level: ScholasticLevel) {
    const linked = this.getClassesForLevel(level.id);
    const warningText = linked.length > 0
      ? `Warning: There are ${linked.length} active class stream(s) currently mapped to "${level.name}". Deleting this level will remove their scholastic tier association. Continue?`
      : `Are you sure you want to delete "${level.name}"? This action cannot be undone.`;

    this.dialog.confirm(warningText, 'Delete Scholastic Level', 'danger', 'Delete Level').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.slService.delete(level.id).subscribe({
          next: () => {
            this.reloadLevels();
            this.loadClasses();
          },
          error: (err) => this.dialog.alert(err.error?.error || 'Failed to delete scholastic level.', 'Error', 'danger')
        });
      }
    });
  }

  // Shift level ordinal up/down for easy sequencing
  moveOrdinal(level: ScholasticLevel, direction: 'up' | 'down') {
    const list = this.sortedLevels();
    const idx = list.findIndex(l => l.id === level.id);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = list[idx - 1];
      const targetOrdinal = prev.ordinal;
      const currentOrdinal = level.ordinal;

      this.slService.update(level.id, { name: level.name, ordinal: targetOrdinal }).subscribe(() => {
        this.slService.update(prev.id, { name: prev.name, ordinal: currentOrdinal }).subscribe(() => {
          this.reloadLevels();
        });
      });
    } else if (direction === 'down' && idx < list.length - 1) {
      const next = list[idx + 1];
      const targetOrdinal = next.ordinal;
      const currentOrdinal = level.ordinal;

      this.slService.update(level.id, { name: level.name, ordinal: targetOrdinal }).subscribe(() => {
        this.slService.update(next.id, { name: next.name, ordinal: currentOrdinal }).subscribe(() => {
          this.reloadLevels();
        });
      });
    }
  }

  // Auto Re-Index ordinals sequentially 1..N
  reindexOrdinals() {
    const list = this.sortedLevels();
    if (list.length === 0) return;

    this.dialog.confirm(
      'This will re-sequence all scholastic levels sequentially from ordinal 1 to ' + list.length + ' based on their current ordering. Proceed?',
      'Re-Index Ordinals',
      'info',
      'Re-Index Sequence'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.isLoading.set(true);
        let completed = 0;
        list.forEach((lvl, index) => {
          this.slService.update(lvl.id, { name: lvl.name, ordinal: index + 1 }).subscribe({
            next: () => {
              completed++;
              if (completed === list.length) {
                this.reloadLevels();
                this.dialog.alert('Scholastic hierarchy successfully re-indexed from 1 to ' + list.length + '.', 'Success', 'success');
              }
            },
            error: () => {
              completed++;
              if (completed === list.length) this.reloadLevels();
            }
          });
        });
      }
    });
  }

  // Apply institutional preset
  applyPreset(preset: LevelPreset) {
    this.dialog.confirm(
      `Apply the "${preset.title}" preset template (${preset.levels.length} levels)? This will create these levels in sequence.`,
      'Apply Hierarchy Preset',
      'info',
      'Apply Preset'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.showPresetsModal.set(false);
        this.isLoading.set(true);
        let completed = 0;
        preset.levels.forEach(lvl => {
          this.slService.create(lvl).subscribe({
            next: () => {
              completed++;
              if (completed === preset.levels.length) {
                this.reloadLevels();
                this.dialog.alert(`Preset "${preset.title}" applied successfully!`, 'Preset Created', 'success');
              }
            },
            error: () => {
              completed++;
              if (completed === preset.levels.length) this.reloadLevels();
            }
          });
        });
      }
    });
  }
}

