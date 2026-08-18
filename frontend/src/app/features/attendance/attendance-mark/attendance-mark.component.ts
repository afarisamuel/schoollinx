import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { TeacherPortalService } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { ClassService } from '../../../core/infrastructure/curriculum/class.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Attendance, AttendanceStatus } from '../../../core/domain/attendance.model';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-attendance-mark',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './attendance-mark.component.html',
    styleUrl: './attendance-mark.component.css'
})
export class AttendanceMarkComponent implements OnInit {
    private attendanceService = inject(AttendanceService);
    private teacherPortalService = inject(TeacherPortalService);
    private classService = inject(ClassService);
    private studentService = inject(StudentService);
    private authService = inject(AuthService);
    private dialog = inject(DialogService);

    classes = signal<{ id: string; name: string }[]>([]);
    students = signal<Student[]>([]);
    attendanceRecords = signal<Map<string, AttendanceStatus>>(new Map());
    
    selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
    selectedClassId = signal<string>('');
    
    isSaving = signal(false);
    isLoading = signal(false);

    isAdmin = computed(() => {
        return this.authService.currentUserValue?.role === 'ADMIN' || this.authService.currentUserValue?.role === 'ECOPOWER_ADMIN';
    });

    presentCount = computed(() => {
        let count = 0;
        const records = this.attendanceRecords();
        this.students().forEach(s => {
            if ((records.get(s.id!) || 'Present') === 'Present') count++;
        });
        return count;
    });

    absentCount = computed(() => {
        let count = 0;
        const records = this.attendanceRecords();
        this.students().forEach(s => {
            const st = records.get(s.id!) || 'Present';
            if (st === 'Absent' || st === 'Tardy') count++;
        });
        return count;
    });

    ngOnInit() {
        this.loadClasses();
    }

    loadClasses() {
        if (this.isAdmin()) {
            this.classService.getClasses().subscribe({
                next: (res) => {
                    const classList = res.map(c => ({ id: c.id!, name: c.name }));
                    this.classes.set(classList);
                    if (classList.length > 0) {
                        this.selectedClassId.set(classList[0].id);
                        this.loadStudents();
                    }
                },
                error: (err) => console.error('Failed to load classes', err)
            });
        } else {
            this.teacherPortalService.getMyClasses().subscribe({
                next: (res) => {
                    // Extract unique classes from assignments
                    const uniqueClasses = new Map<string, {id: string; name: string}>();
                    res.assignments.forEach(a => {
                        if (a.class) uniqueClasses.set(a.class.id, a.class);
                    });
                    const classList = Array.from(uniqueClasses.values());
                    this.classes.set(classList);
                    
                    if (classList.length > 0) {
                        this.selectedClassId.set(classList[0].id);
                        this.loadStudents();
                    }
                },
                error: (err) => console.error('Failed to load classes', err)
            });
        }
    }

    onClassChange(newClassId: string) {
        this.selectedClassId.set(newClassId);
        this.loadStudents();
    }

    onDateChange(newDate: string) {
        this.selectedDate.set(newDate);
        if (this.selectedClassId()) {
            this.loadAttendanceForDate();
        }
    }

    loadStudents() {
        const classId = this.selectedClassId();
        if (!classId) return;
        
        this.isLoading.set(true);
        const request$ = this.isAdmin() 
            ? this.studentService.getStudentsByClass(classId) 
            : this.teacherPortalService.getClassStudents(classId);

        request$.subscribe({
            next: (students: Student[]) => {
                this.students.set(students || []);
                const newRecords = new Map<string, AttendanceStatus>();
                (students || []).forEach(s => newRecords.set(s.id!, 'Present'));
                this.attendanceRecords.set(newRecords);
                
                this.loadAttendanceForDate();
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load students', err);
                this.isLoading.set(false);
            }
        });
    }

    loadAttendanceForDate() {
        const classId = this.selectedClassId();
        const date = this.selectedDate();
        if (!classId || !date) return;
        
        this.attendanceService.getClassAttendance(classId, date)
            .subscribe((records: Attendance[]) => {
                const currentRecords = new Map(this.attendanceRecords());
                if (records && records.length > 0) {
                    records.forEach(record => {
                        currentRecords.set(record.student_id, record.status);
                    });
                } else {
                    // Reset to present if no records exist for this date
                    this.students().forEach((s: Student) => currentRecords.set(s.id!, 'Present'));
                }
                this.attendanceRecords.set(currentRecords);
            });
    }

    setStatus(studentId: string, status: AttendanceStatus) {
        const currentRecords = new Map(this.attendanceRecords());
        currentRecords.set(studentId, status);
        this.attendanceRecords.set(currentRecords);
    }

    getStatus(studentId: string): AttendanceStatus {
        return this.attendanceRecords().get(studentId) || 'Present';
    }

    markAll(status: AttendanceStatus) {
        const currentRecords = new Map(this.attendanceRecords());
        this.students().forEach(s => {
            if (s.id) {
                currentRecords.set(s.id, status);
            }
        });
        this.attendanceRecords.set(currentRecords);
    }

    saveAttendance() {
        const classId = this.selectedClassId();
        const date = this.selectedDate();
        if (!classId) {
            this.dialog.alert('Please select a class first.', 'Validation Error', 'error').subscribe();
            return;
        }

        this.isSaving.set(true);
        const isoDate = new Date(date + 'T00:00:00Z').toISOString();
        const attendances: Attendance[] = this.students().map(student => ({
            student_id: student.id!,
            class_id: classId,
            date: isoDate,
            status: this.getStatus(student.id!)
        }));

        this.attendanceService.markBulkAttendance(attendances).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.dialog.alert('Attendance marked successfully!', 'Attendance Saved', 'success').subscribe();
            },
            error: () => {
                this.isSaving.set(false);
                this.dialog.alert('Failed to mark attendance.', 'Save Failed', 'error').subscribe();
            }
        });
    }
}
