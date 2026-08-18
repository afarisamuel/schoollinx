import { Component, Input, Output, EventEmitter, OnInit, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';

@Component({
  selector: 'app-student-search-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-search-dropdown.component.html'
})
export class StudentSearchDropdownComponent implements OnInit {
  private studentService = inject(StudentService);
  private eRef = inject(ElementRef);

  @Input() studentId: string | null | undefined = '';
  @Input() placeholder: string = 'Search by name or ID...';
  @Input() inputClass: string = 'w-full bg-bg-tertiary border border-border-primary rounded-xl pr-4 py-3 text-text-primary text-sm focus:outline-none focus:border-indigo-500 transition-colors';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;

  @Output() studentIdChange = new EventEmitter<string>();
  @Output() studentSelected = new EventEmitter<Student>();

  students = signal<Student[]>([]);
  searchTerm = signal('');
  isOpen = signal(false);

  // Derive selected student name if we have a studentId
  get selectedStudentName(): string {
    const id = this.studentId;
    if (!id) return '';
    const student = this.students().find(s => s.id === id);
    if (student) {
      return `${student.first_name} ${student.last_name}`;
    }
    // If not found yet (e.g. data still loading or ID is raw string)
    return id;
  }

  filteredStudents = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.students().filter(s => 
        s.first_name?.toLowerCase().includes(term) || 
        s.last_name?.toLowerCase().includes(term) ||
        (s.id && s.id.toLowerCase().includes(term)) ||
        (s.enrollment_num && s.enrollment_num.toLowerCase().includes(term))
    );
  });

  ngOnInit() {
    this.studentService.getStudents().subscribe({
      next: (data: Student[]) => this.students.set(data || [])
    });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  onInputFocus() {
    this.isOpen.set(true);
    // When focusing, if we already have a selected student, we might want to clear the search term
    // to show the full list, or we could just set it to empty so they can search again.
    this.searchTerm.set('');
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.isOpen.set(true);
    
    // If they clear the input, clear the selection
    if (!term.trim()) {
      this.studentIdChange.emit('');
    }
  }

  selectStudent(student: Student) {
    this.studentIdChange.emit(student.id);
    this.studentSelected.emit(student);
    this.isOpen.set(false);
    this.searchTerm.set(`${student.first_name} ${student.last_name}`);
  }
}
