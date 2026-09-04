import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { ScholasticLevelService } from '../../../core/infrastructure/scholastic-level/scholastic-level.service';
import { ScholasticLevel } from '../../../core/domain/scholastic-level.model';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-student-enrollment',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './student-enrollment.component.html',
    styleUrl: './student-enrollment.component.css'
})
export class StudentEnrollmentComponent implements OnInit {
    private studentService = inject(StudentService);
    private classService = inject(ClassService);
    private slService = inject(ScholasticLevelService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    students = signal<Student[]>([]);
    classes = signal<Class[]>([]);
    scholasticLevels = signal<ScholasticLevel[]>([]);
    
    searchQuery = signal<string>('');
    filterStatus = signal<'all' | 'unassigned' | 'enrolled' | 'boarding' | 'day'>('all');
    filterLevel = signal<number | null>(null);

    selectedClassId = signal<string | null>(null);
    selectedStudentIds = signal<Set<string>>(new Set());
    
    isLoading = signal<boolean>(false);
    isSubmitting = signal<boolean>(false);

    // Selected Target Class Info
    targetClass = computed(() => {
        const id = this.selectedClassId();
        if (!id) return null;
        return this.classes().find(c => c.id === id) || null;
    });

    // Current students enrolled in the selected target class
    studentsInTargetClassCount = computed(() => {
        const id = this.selectedClassId();
        if (!id) return 0;
        return this.students().filter(s => s.class_id === id).length;
    });

    // Enrolled vs Unassigned Counts
    enrolledCount = computed(() => this.students().filter(s => !!s.class_id).length);
    unassignedCount = computed(() => this.students().filter(s => !s.class_id).length);
    boardingCount = computed(() => this.students().filter(s => (s.placed_residence_type || '').toLowerCase().includes('board')).length);
    dayCount = computed(() => this.students().filter(s => (s.placed_residence_type || '').toLowerCase().includes('day')).length);

    // Filtered Students computation
    filteredStudents = computed(() => {
        let list = this.students();
        const query = this.searchQuery().toLowerCase().trim();
        const status = this.filterStatus();
        const level = this.filterLevel();

        // 1. Search Query
        if (query) {
            const tokens = query.split(/\s+/).filter(t => t.length > 0);
            list = list.filter(s => {
                const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                const otherNames = (s.other_name || '').toLowerCase();
                const enroll = (s.enrollment_num || '').toLowerCase();
                return tokens.every(t => fullName.includes(t) || otherNames.includes(t) || enroll.includes(t));
            });
        }

        // 2. Status Filter
        if (status === 'unassigned') {
            list = list.filter(s => !s.class_id);
        } else if (status === 'enrolled') {
            list = list.filter(s => !!s.class_id);
        } else if (status === 'boarding') {
            list = list.filter(s => (s.placed_residence_type || '').toLowerCase().includes('board'));
        } else if (status === 'day') {
            list = list.filter(s => (s.placed_residence_type || '').toLowerCase().includes('day'));
        }

        // 3. Level Filter
        if (level !== null) {
            list = list.filter(s => s.level === level);
        }

        return list;
    });

    // Check if all filtered are selected
    isAllFilteredSelected = computed(() => {
        const list = this.filteredStudents();
        const selected = this.selectedStudentIds();
        return list.length > 0 && list.every(s => selected.has(s.id!));
    });

    // Selected students objects for preview
    selectedStudentsList = computed(() => {
        const selected = this.selectedStudentIds();
        return this.students().filter(s => selected.has(s.id!));
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadInitialData();
        }
    }

    loadInitialData() {
        this.isLoading.set(true);
        this.studentService.getStudents().subscribe({
            next: (data) => {
                this.students.set(data || []);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });

        this.classService.getClasses().subscribe({
            next: (data) => this.classes.set(data || []),
            error: (err) => console.error('Error loading classes', err)
        });

        this.slService.getAll().subscribe({
            next: (data) => this.scholasticLevels.set(data || []),
            error: (err) => console.error('Error loading scholastic levels', err)
        });
    }

    getClassName(classId: string | undefined): string {
        if (!classId) return 'Unassigned';
        const cls = this.classes().find(c => c.id === classId);
        return cls ? cls.name : 'Unassigned';
    }

    getLevelName(ordinal: number | undefined): string {
        if (ordinal === undefined) return '—';
        const level = this.scholasticLevels().find(l => l.ordinal === ordinal);
        return level ? level.name : `Level ${ordinal}`;
    }

    toggleStudent(id: string) {
        this.selectedStudentIds.update(set => {
            const newSet = new Set(set);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }

    toggleAllFiltered() {
        const list = this.filteredStudents();
        if (this.isAllFilteredSelected()) {
            this.selectedStudentIds.update(set => {
                const newSet = new Set(set);
                list.forEach(s => newSet.delete(s.id!));
                return newSet;
            });
        } else {
            this.selectedStudentIds.update(set => {
                const newSet = new Set(set);
                list.forEach(s => newSet.add(s.id!));
                return newSet;
            });
        }
    }

    clearSelection() {
        this.selectedStudentIds.set(new Set());
    }

    processEnrollment() {
        const targetClassId = this.selectedClassId();
        const selectedIds = Array.from(this.selectedStudentIds());
        
        if (!targetClassId || selectedIds.length === 0) return;

        const targetCls = this.classes().find(c => c.id === targetClassId);
        const className = targetCls ? targetCls.name : 'Selected Class';

        this.isSubmitting.set(true);

        this.studentService.enrollStudents(selectedIds, targetClassId).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.dialog.alert(
                    `Successfully enrolled ${selectedIds.length} student(s) into ${className}!`,
                    'Enrollment Successful',
                    'success'
                ).subscribe();
                this.selectedStudentIds.set(new Set());
                this.loadInitialData();
            },
            error: (err: any) => {
                this.isSubmitting.set(false);
                this.dialog.alert('Enrollment failed: ' + (err.error?.error || err.message), 'Error', 'danger').subscribe();
            }
        });
    }
}

