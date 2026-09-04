import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

export interface SubjectPreset {
  name: string;
  category: string;
  description: string;
  subjects: { name: string; code: string }[];
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.css'
})
export class SubjectsComponent implements OnInit {
  private subjectService = inject(SubjectService);
  private classService = inject(ClassService);
  private dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);

  subjects = signal<Subject[]>([]);
  classes = signal<Class[]>([]);
  searchQuery = signal<string>('');
  filterCategory = signal<'all' | 'stem' | 'languages' | 'humanities' | 'core'>('all');
  viewMode = signal<'table' | 'grid'>('table');
  
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showPresetsModal = signal<boolean>(false);

  newSubjectName = '';
  newSubjectCode = '';

  // Standard Presets for 1-click setup
  curriculumPresets: SubjectPreset[] = [
    {
      name: 'Ghana GES Basic Education Core',
      category: 'Ghana National',
      description: 'Standard primary & junior high foundational courses',
      subjects: [
        { name: 'English Language', code: 'ENG' },
        { name: 'Mathematics', code: 'MATH' },
        { name: 'Integrated Science', code: 'SCI' },
        { name: 'Social Studies', code: 'SOC' },
        { name: 'Information & Comm. Tech (ICT)', code: 'ICT' },
        { name: 'Religious & Moral Education (RME)', code: 'RME' },
        { name: 'Creative Arts & Design', code: 'CAD' },
        { name: 'French', code: 'FRE' },
        { name: 'Ghanaian Language & Culture', code: 'GLC' }
      ]
    },
    {
      name: 'Senior High STEM Track',
      category: 'Science & Tech',
      description: 'Advanced Science and Engineering preparatory curriculum',
      subjects: [
        { name: 'Physics', code: 'PHY' },
        { name: 'Chemistry', code: 'CHEM' },
        { name: 'Biology', code: 'BIO' },
        { name: 'Elective Mathematics', code: 'EMATH' },
        { name: 'Computer Science', code: 'CS' },
        { name: 'Applied Technical Drawing', code: 'TD' }
      ]
    },
    {
      name: 'Business & Commercial Studies',
      category: 'Business',
      description: 'Accounting, economics, and business management courses',
      subjects: [
        { name: 'Financial Accounting', code: 'ACC' },
        { name: 'Cost Accounting', code: 'COST' },
        { name: 'Business Management', code: 'BM' },
        { name: 'Economics', code: 'ECON' },
        { name: 'Principles of Costing', code: 'POC' }
      ]
    },
    {
      name: 'Arts & Humanities Track',
      category: 'General Arts',
      description: 'Literature, geography, government, and historical studies',
      subjects: [
        { name: 'Literature in English', code: 'LIT' },
        { name: 'Geography', code: 'GEO' },
        { name: 'Government & Civics', code: 'GOV' },
        { name: 'History', code: 'HIST' },
        { name: 'Economics', code: 'ECON' }
      ]
    }
  ];

  // Helper: detect subject category
  getSubjectCategory(subject: Subject): { label: string; class: string } {
    const name = subject.name.toLowerCase();
    const code = subject.code.toLowerCase();

    if (name.includes('math') || name.includes('physic') || name.includes('chem') || name.includes('bio') || name.includes('tech') || name.includes('ict') || name.includes('comput') || name.includes('sci') || code.includes('sci') || code.includes('math')) {
      return { label: 'STEM / Science', class: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' };
    }
    if (name.includes('english') || name.includes('french') || name.includes('lang') || name.includes('literat') || name.includes('span') || code.includes('eng') || code.includes('fre')) {
      return { label: 'Language & Literacy', class: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
    }
    if (name.includes('social') || name.includes('hist') || name.includes('geog') || name.includes('gov') || name.includes('rme') || name.includes('relig') || name.includes('civic')) {
      return { label: 'Social & Humanities', class: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' };
    }
    if (name.includes('art') || name.includes('music') || name.includes('design') || name.includes('p.e') || name.includes('sport') || name.includes('dram')) {
      return { label: 'Arts & Creative', class: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' };
    }
    return { label: 'Core Curriculum', class: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400' };
  }

  // Count classes taking this subject
  getClassesForSubject(subjectId: string): Class[] {
    return this.classes().filter(c => (c.subjects || []).some(s => s.id === subjectId));
  }

  // Filtered subjects list
  filteredSubjects = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.filterCategory();

    return this.subjects().filter(s => {
      // 1. Search Query
      const matchesQuery = !query || 
        s.name.toLowerCase().includes(query) || 
        s.code.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      // 2. Category Filter
      if (category === 'all') return true;
      const cat = this.getSubjectCategory(s).label.toLowerCase();
      if (category === 'stem' && cat.includes('stem')) return true;
      if (category === 'languages' && cat.includes('language')) return true;
      if (category === 'humanities' && cat.includes('social')) return true;
      if (category === 'core' && (cat.includes('core') || cat.includes('creative'))) return true;

      return false;
    });
  });

  // Total enrolled class subject mappings
  totalEnrollmentLinks = computed(() => {
    return this.classes().reduce((acc, c) => acc + (c.subjects || []).length, 0);
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    }
  }

  loadData() {
    this.isLoading.set(true);
    this.subjectService.getSubjects().subscribe({
      next: (data) => {
        this.subjects.set(data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.classService.getClasses().subscribe({
      next: (cls) => this.classes.set(cls || []),
      error: (err) => console.error('Error loading classes for subjects', err)
    });
  }

  // Auto-generate suggested course code based on title
  onSubjectNameChange(name: string) {
    this.newSubjectName = name;
    if (!this.newSubjectCode || this.newSubjectCode.length <= 4) {
      const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (clean.length > 0) {
        this.newSubjectCode = clean.substring(0, 4);
      }
    }
  }

  addSubject() {
    if (!this.newSubjectName.trim() || !this.newSubjectCode.trim()) return;

    this.isSubmitting.set(true);

    const subj: Partial<Subject> = {
      name: this.newSubjectName.trim(),
      code: this.newSubjectCode.trim().toUpperCase()
    };

    this.subjectService.createSubject(subj).subscribe({
      next: () => {
        this.newSubjectName = '';
        this.newSubjectCode = '';
        this.isSubmitting.set(false);
        this.loadData();
      },
      error: (err: any) => {
        this.dialog.alert('Failed to register subject: ' + (err.error?.error || err.message), 'Subject Error', 'danger').subscribe();
        this.isSubmitting.set(false);
      }
    });
  }

  deleteSubject(id: string, name: string) {
    const linked = this.getClassesForSubject(id);
    const warning = linked.length > 0
      ? `"${name}" is currently mapped to ${linked.length} active class stream(s). Deleting this subject will unassign it from their curricula. Continue?`
      : `Are you sure you want to delete "${name}"? This action cannot be undone.`;

    this.dialog.confirm(warning, 'Delete Curriculum Subject', 'danger', 'Delete Subject').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.subjectService.deleteSubject(id).subscribe({
          next: () => {
            this.loadData();
          },
          error: (err: any) => {
            this.dialog.alert('Failed to delete subject: ' + (err.error?.error || err.message), 'Error', 'danger').subscribe();
          }
        });
      }
    });
  }

  // Apply curriculum preset
  applyPreset(preset: SubjectPreset) {
    this.dialog.confirm(
      `Scaffold the "${preset.name}" preset template (${preset.subjects.length} courses)?`,
      'Apply Curriculum Template',
      'info',
      'Apply Preset'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.showPresetsModal.set(false);
        this.isLoading.set(true);
        let completed = 0;
        preset.subjects.forEach(sub => {
          this.subjectService.createSubject(sub).subscribe({
            next: () => {
              completed++;
              if (completed === preset.subjects.length) {
                this.loadData();
                this.dialog.alert(`Curriculum preset "${preset.name}" applied successfully!`, 'Courses Added', 'success');
              }
            },
            error: () => {
              completed++;
              if (completed === preset.subjects.length) this.loadData();
            }
          });
        });
      }
    });
  }
}

