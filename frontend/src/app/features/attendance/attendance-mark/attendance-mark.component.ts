import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
    imports: [CommonModule, FormsModule, RouterModule],
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

    searchTerm = signal<string>('');
    filterStatus = signal<'ALL' | AttendanceStatus>('ALL');
    viewMode = signal<'grid' | 'table'>('grid');
    studentRemarks = signal<Map<string, string>>(new Map());

    isAdmin = computed(() => {
        return this.authService.currentUserValue?.role === 'ADMIN' || this.authService.currentUserValue?.role === 'ECOPOWER_ADMIN';
    });

    selectedClassName = computed(() => {
        const cls = this.classes().find(c => c.id === this.selectedClassId());
        return cls ? cls.name : 'Selected Class';
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
            if (records.get(s.id!) === 'Absent') count++;
        });
        return count;
    });

    tardyCount = computed(() => {
        let count = 0;
        const records = this.attendanceRecords();
        this.students().forEach(s => {
            if (records.get(s.id!) === 'Tardy') count++;
        });
        return count;
    });

    attendanceRate = computed(() => {
        const total = this.students().length;
        if (total === 0) return 100;
        return Math.round((this.presentCount() / total) * 100);
    });

    filteredStudents = computed(() => {
        const query = this.searchTerm().trim().toLowerCase();
        const statusFilter = this.filterStatus();
        const records = this.attendanceRecords();

        return this.students().filter(s => {
            const matchesSearch = !query || 
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
                (s.id && s.id.toLowerCase().includes(query)) ||
                (s.enrollment_num && s.enrollment_num.toLowerCase().includes(query));

            if (!matchesSearch) return false;

            if (statusFilter === 'ALL') return true;
            const currentStatus = records.get(s.id!) || 'Present';
            return currentStatus === statusFilter;
        });
    });

    ngOnInit() {
        this.loadClasses();
    }

    loadClasses() {
        this.isLoading.set(true);
        // Primary: fetch from classService (calls /api/classes which resolves teacher-specific or all institutional classes)
        this.classService.getClasses().subscribe({
            next: (res) => {
                const classMap = new Map<string, { id: string; name: string }>();
                (res || []).forEach(c => {
                    if (c.id && c.name) classMap.set(c.id, { id: c.id, name: c.name });
                });

                // Also check teacher portal assignments to ensure all assigned classes are included
                this.teacherPortalService.getMyClasses().subscribe({
                    next: (portalRes) => {
                        (portalRes.assignments || []).forEach(a => {
                            const cid = a.class?.id || a.class_id;
                            const cname = a.class?.name || (a as any).class_name;
                            if (cid && cname && !classMap.has(cid)) {
                                classMap.set(cid, { id: cid, name: cname });
                            }
                        });
                        this.finishClassLoading(classMap);
                    },
                    error: () => this.finishClassLoading(classMap)
                });
            },
            error: () => {
                // Fallback directly to teacher portal if classService failed
                this.teacherPortalService.getMyClasses().subscribe({
                    next: (portalRes) => {
                        const classMap = new Map<string, { id: string; name: string }>();
                        (portalRes.assignments || []).forEach(a => {
                            const cid = a.class?.id || a.class_id;
                            const cname = a.class?.name || (a as any).class_name;
                            if (cid && cname) classMap.set(cid, { id: cid, name: cname });
                        });
                        this.finishClassLoading(classMap);
                    },
                    error: (err) => {
                        console.error('Failed to load classes', err);
                        this.isLoading.set(false);
                    }
                });
            }
        });
    }

    private finishClassLoading(classMap: Map<string, { id: string; name: string }>) {
        const classList = Array.from(classMap.values());
        this.classes.set(classList);
        if (classList.length > 0) {
            if (!this.selectedClassId() || !classList.some(c => c.id === this.selectedClassId())) {
                this.selectedClassId.set(classList[0].id);
            }
            this.loadStudents();
        } else {
            this.isLoading.set(false);
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
        if (!classId) {
            this.isLoading.set(false);
            return;
        }
        
        this.isLoading.set(true);
        // Load via studentService with seamless fallback to teacherPortalService
        this.studentService.getStudentsByClass(classId).subscribe({
            next: (students: Student[]) => {
                if (students && students.length > 0) {
                    this.applyStudents(students);
                } else {
                    this.teacherPortalService.getClassStudents(classId).subscribe({
                        next: (portalStudents) => this.applyStudents(portalStudents || []),
                        error: () => this.applyStudents([])
                    });
                }
            },
            error: () => {
                this.teacherPortalService.getClassStudents(classId).subscribe({
                    next: (portalStudents) => this.applyStudents(portalStudents || []),
                    error: (err) => {
                        console.error('Failed to load students', err);
                        this.applyStudents([]);
                    }
                });
            }
        });
    }

    private applyStudents(students: Student[]) {
        this.students.set(students || []);
        const newRecords = new Map<string, AttendanceStatus>();
        (students || []).forEach(s => newRecords.set(s.id!, 'Present'));
        this.attendanceRecords.set(newRecords);
        this.loadAttendanceForDate();
        this.isLoading.set(false);
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

    setToday() {
        this.selectedDate.set(new Date().toISOString().split('T')[0]);
        if (this.selectedClassId()) {
            this.loadAttendanceForDate();
        }
    }

    shiftDate(days: number) {
        const current = new Date(this.selectedDate());
        current.setDate(current.getDate() + days);
        this.selectedDate.set(current.toISOString().split('T')[0]);
        if (this.selectedClassId()) {
            this.loadAttendanceForDate();
        }
    }

    setFilter(status: 'ALL' | AttendanceStatus) {
        this.filterStatus.set(status);
    }

    setViewMode(mode: 'grid' | 'table') {
        this.viewMode.set(mode);
    }

    setRemark(studentId: string, remark: string) {
        const remarks = new Map(this.studentRemarks());
        remarks.set(studentId, remark);
        this.studentRemarks.set(remarks);
    }

    getRemark(studentId: string): string {
        return this.studentRemarks().get(studentId) || '';
    }

    exportCSV() {
        const className = this.selectedClassName();
        const date = this.selectedDate();
        const records = this.attendanceRecords();
        
        let csv = `Student ID,Enrollment Number,Full Name,Attendance Status,Remarks\n`;
        this.students().forEach(s => {
            const status = records.get(s.id!) || 'Present';
            const remark = this.getRemark(s.id!);
            csv += `"${s.id || ''}","${s.enrollment_num || ''}","${s.first_name} ${s.last_name}","${status}","${remark}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_${className.replace(/\s+/g, '_')}_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    printSheet() {
        window.print();
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
            status: this.getStatus(student.id!),
            remarks: this.getRemark(student.id!) || undefined
        }));

        this.attendanceService.markBulkAttendance(attendances).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.dialog.alert('Attendance registry synchronized and saved successfully!', 'Attendance Saved', 'success').subscribe();
            },
            error: () => {
                this.isSaving.set(false);
                this.dialog.alert('Failed to mark attendance. Please check network connection and try again.', 'Save Failed', 'error').subscribe();
            }
        });
    }
}
