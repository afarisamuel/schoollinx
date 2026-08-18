import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.css'
})
export class SubjectsComponent implements OnInit {
  subjects = signal<Subject[]>([]);
  searchQuery = signal<string>('');
  
  filteredSubjects = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.subjects().filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.code.toLowerCase().includes(query)
    );
  });

  private subjectService = inject(SubjectService);
  private dialog = inject(DialogService);
  private platformId = inject(PLATFORM_ID);

  isSubmitting = false;
  newSubjectName = '';
  newSubjectCode = '';

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    }
  }

  loadData() {
    this.subjectService.getSubjects().subscribe(data => this.subjects.set(data));
  }

  addSubject() {
    if (!this.newSubjectName || !this.newSubjectCode) return;

    this.isSubmitting = true;

    const subj: any = {
      name: this.newSubjectName,
      code: this.newSubjectCode.toUpperCase()
    };

    (this.subjectService as any).createSubject(subj).subscribe({
      next: () => {
        this.newSubjectName = '';
        this.newSubjectCode = '';
        this.isSubmitting = false;
        this.loadData();
      },
      error: (err: any) => {
        this.dialog.alert('Failed to add subject: ' + (err.error?.error || err.message), 'Subject Error', 'error').subscribe();
        this.isSubmitting = false;
      }
    });
  }

  deleteSubject(id: string, name: string) {
    this.dialog.confirm(
      'Delete Subject',
      `Are you sure you want to delete ${name}? This cannot be undone.`
    ).subscribe(confirmed => {
      if (confirmed) {
        this.subjectService.deleteSubject(id).subscribe({
          next: () => {
            this.loadData();
          },
          error: (err: any) => {
            this.dialog.alert('Failed to delete subject: ' + (err.error?.error || err.message), 'Error', 'error').subscribe();
          }
        });
      }
    });
  }
}
