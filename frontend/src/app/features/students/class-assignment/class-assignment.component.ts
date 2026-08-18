import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-class-assignment',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './class-assignment.component.html',
    styles: [`
        .field-input { 
            width: 100%;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-primary);
            border-radius: 1rem;
            padding: 0.75rem 1.25rem;
            font-size: 0.875rem;
            color: var(--text-primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .field-input:focus {
            outline: none;
            border-color: rgba(99, 102, 241, 0.5);
            background-color: var(--bg-secondary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .glass-panel {
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            box-shadow: var(--shadow-main);
        }
    `]
})
export class ClassAssignmentComponent implements OnInit {
    private dialog = inject(DialogService);
    classes = signal<Class[]>([]);
    students = signal<Student[]>([]);
    searchTerm = signal('');
    
    selectedClassId = '';
    selectedStudentIds = new Set<string>();
    isSubmitting = false;

    filteredStudents = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const allStudents = this.students();
        if (!term) return allStudents;
        
        return allStudents.filter(s => 
            s.first_name.toLowerCase().includes(term) || 
            s.last_name.toLowerCase().includes(term) 
        );
    });

    private route = inject(ActivatedRoute);

    constructor(
        private studentService: StudentService,
        private classService: ClassService
    ) {}

    ngOnInit(): void {
        this.loadClasses();
        this.loadStudents();
    }

    loadClasses() {
        this.classService.getClasses().subscribe((data: Class[]) => this.classes.set(data));
    }

    loadStudents() {
        this.studentService.getStudents().subscribe((data: Student[]) => {
            this.students.set(data);
        });
    }

    onClassChange() {
        this.selectedStudentIds.clear();
    }

    setSearchTerm(event: Event) {
        const input = event.target as HTMLInputElement;
        this.searchTerm.set(input.value);
    }



    toggleStudent(id: string) {
        if (this.selectedStudentIds.has(id)) {
            this.selectedStudentIds.delete(id);
        } else {
            this.selectedStudentIds.add(id);
        }
    }

    toggleAll() {
        if (this.selectedStudentIds.size === this.students().length) {
            this.selectedStudentIds.clear();
        } else {
            this.students().forEach(s => this.selectedStudentIds.add(s.id!));
        }
    }

    assign() {
        if (!this.selectedClassId || this.selectedStudentIds.size === 0) return;
        
        this.isSubmitting = true;
        const ids = Array.from(this.selectedStudentIds);
        
        this.studentService.enrollStudents(ids, this.selectedClassId).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.selectedStudentIds.clear();
                this.loadStudents(); // Refresh list
                this.dialog.alert('Students assigned successfully!', 'Assignment Success', 'success').subscribe();
            },
            error: () => this.isSubmitting = false
        });
    }
}
