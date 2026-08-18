import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { CurriculumService } from '../../../core/infrastructure/curriculum/curriculum.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-student-enrollment',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './student-enrollment.component.html',
    styleUrl: './student-enrollment.component.css'
})
export class StudentEnrollmentComponent implements OnInit {
    private studentService = inject(StudentService);
    private curriculumService = inject(CurriculumService);
    private classService = inject(ClassService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    students = signal<Student[]>([]);
    filteredStudents = signal<Student[]>([]);
    classes = signal<Class[]>([]);

    selectedClassId: string | null = null;
    selectedStudentIds = new Set<string>();

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadInitialData();
        }
    }

    loadInitialData() {
        this.studentService.getStudents().subscribe(data => {
            this.students.set(data);
            this.filteredStudents.set(data);
        });
        this.classService.getClasses().subscribe(data => {
            this.classes.set(data);
        });
    }

    loadEnrolledStudents() {
        // Optional: highlight students already in this class
    }

    toggleStudent(id: string) {
        if (this.selectedStudentIds.has(id)) {
            this.selectedStudentIds.delete(id);
        } else {
            this.selectedStudentIds.add(id);
        }
    }

    toggleAll(event: any) {
        if (event.target.checked) {
            this.filteredStudents().forEach(s => this.selectedStudentIds.add(s.id!));
        } else {
            this.selectedStudentIds.clear();
        }
    }

    filterStudents(event: any) {
        const query = (event.target.value || '').toLowerCase();
        this.filteredStudents.set(
            this.students().filter(s =>
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) 
            )
        );
    }

    processEnrollment() {
        if (!this.selectedClassId || this.selectedStudentIds.size === 0) return;

        this.studentService.enrollStudents(
            Array.from(this.selectedStudentIds),
            this.selectedClassId
        ).subscribe(() => {
            this.dialog.alert('Institutional enrollment batch processed successfully.', 'Enrollment Complete', 'success').subscribe();
            this.selectedStudentIds.clear();
            this.loadInitialData();
        });
    }
}
