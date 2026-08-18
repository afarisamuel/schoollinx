import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TeacherAssignmentService, TeacherAssignment } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-teacher-assignments',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './teacher-assignments.component.html',
    styleUrl: './teacher-assignments.component.css'
})
export class TeacherAssignmentsComponent implements OnInit {
    private assignmentService = inject(TeacherAssignmentService);
    private teacherService = inject(TeacherService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    // Global Collections
    teachers = signal<Teacher[]>([]);
    subjects = signal<Subject[]>([]);
    classes = signal<Class[]>([]);
    allAssignments = signal<TeacherAssignment[]>([]);

    searchQuery = signal('');
    filteredTeachers = computed(() => {
        const q = this.searchQuery().toLowerCase();
        return this.teachers().filter(t => 
            (t.first_name + ' ' + t.last_name).toLowerCase().includes(q) || 
            (t.email || '').toLowerCase().includes(q)
        );
    });

    selectedTeacherId = signal<string | null>(null);
    activeTeacher = computed(() => this.teachers().find(t => t.id === this.selectedTeacherId()));

    // Active Edit State
    pendingAdditions = signal<Partial<TeacherAssignment>[]>([]);
    pendingRemovals = signal<string[]>([]); // Array of assignment IDs

    // Academic Year
    academicYear = signal('2023/2024');
    
    // Status
    isSaving = signal(false);
    successMsg = signal('');
    errorMsg = signal('');

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadCoreData();
        }
    }

    loadCoreData() {
        forkJoin({
            teachers: this.teacherService.getTeachers(),
            subjects: this.subjectService.getSubjects(),
            classes: this.classService.getClasses(),
            assignments: this.assignmentService.getAll()
        }).subscribe((data: any) => {
            this.teachers.set(data.teachers || []);
            this.subjects.set(data.subjects || []);
            this.classes.set(data.classes || []);
            this.allAssignments.set(data.assignments || []);
        });
    }

    refreshAssignments() {
        this.assignmentService.getAll().subscribe(data => {
            this.allAssignments.set(data);
        });
    }

    selectTeacher(id: string) {
        if (this.pendingAdditions().length > 0 || this.pendingRemovals().length > 0) {
            this.dialog.confirm("You have unsaved changes. Discard and switch teacher?", "Unsaved Changes", "warning", "Discard").subscribe((confirmed: boolean) => {
                if (confirmed) this.executeTeacherSwitch(id);
            });
            return;
        }
        this.executeTeacherSwitch(id);
    }

    private executeTeacherSwitch(id: string) {
        this.selectedTeacherId.set(id);
        this.pendingAdditions.set([]);
        this.pendingRemovals.set([]);
        this.successMsg.set('');
        this.errorMsg.set('');
    }

    // Grid Cell Helpers
    getExistingAssignment(subjectId: string, classId: string): TeacherAssignment | undefined {
        return this.allAssignments().find(a => a.subject_id === subjectId && a.class_id === classId);
    }

    isAssignedToSelected(subjectId: string, classId: string): boolean {
        const existing = this.getExistingAssignment(subjectId, classId);
        if (existing && existing.teacher_id === this.selectedTeacherId() && !this.pendingRemovals().includes(existing.id)) return true;
        
        // Check if added in pending
        const pending = this.pendingAdditions().find(a => a.subject_id === subjectId && a.class_id === classId);
        if (pending) return true;

        return false;
    }

    isAssignedToOther(subjectId: string, classId: string): boolean {
        const existing = this.getExistingAssignment(subjectId, classId);
        return existing !== undefined && existing.teacher_id !== this.selectedTeacherId();
    }

    getOtherTeacherName(subjectId: string, classId: string): string {
        const existing = this.getExistingAssignment(subjectId, classId);
        if (!existing) return '';
        const t = this.teachers().find(t => t.id === existing.teacher_id);
        return t ? `${t.first_name} ${t.last_name}` : 'Another Teacher';
    }

    toggleCell(subjectId: string, classId: string) {
        if (!this.selectedTeacherId()) return;

        // If it's assigned to someone else, we alert and block (for now)
        if (this.isAssignedToOther(subjectId, classId)) {
            const name = this.getOtherTeacherName(subjectId, classId);
            this.dialog.alert(`This class/subject is already assigned to ${name}. Unassign them first.`, 'Assignment Conflict', 'warning').subscribe();
            return;
        }

        const existing = this.getExistingAssignment(subjectId, classId);

        if (existing) {
            // It was already assigned to me. Toggle removal.
            const removals = [...this.pendingRemovals()];
            if (removals.includes(existing.id)) {
                // Was marked for removal, unmark it
                this.pendingRemovals.set(removals.filter(id => id !== existing.id));
            } else {
                // Mark for removal
                removals.push(existing.id);
                this.pendingRemovals.set(removals);
            }
        } else {
            // Not in DB. Check if in additions
            const additions = [...this.pendingAdditions()];
            const idx = additions.findIndex(a => a.subject_id === subjectId && a.class_id === classId);
            
            if (idx > -1) {
                // Was pending addition, remove it
                additions.splice(idx, 1);
                this.pendingAdditions.set(additions);
            } else {
                // Not assigned, mark for addition
                additions.push({
                    teacher_id: this.selectedTeacherId() as string,
                    subject_id: subjectId,
                    class_id: classId,
                    academic_year: this.academicYear()
                });
                this.pendingAdditions.set(additions);
            }
        }
    }

    hasChanges(): boolean {
        return this.pendingAdditions().length > 0 || this.pendingRemovals().length > 0;
    }

    applyChanges() {
        if (!this.hasChanges()) return;
        this.isSaving.set(true);
        this.successMsg.set('');
        this.errorMsg.set('');

        const ops = [];
        
        if (this.pendingRemovals().length > 0) {
            // Sequential or parallel unassign
            for (const id of this.pendingRemovals()) {
                ops.push(this.assignmentService.unassign(id));
            }
        }

        if (this.pendingAdditions().length > 0) {
            ops.push(this.assignmentService.bulkAssign(this.pendingAdditions()));
        }

        if (ops.length === 0) {
            this.isSaving.set(false);
            return;
        }

        forkJoin(ops).subscribe({
            next: () => {
                this.pendingAdditions.set([]);
                this.pendingRemovals.set([]);
                this.successMsg.set('Faculty schedule successfully updated.');
                this.refreshAssignments();
                this.isSaving.set(false);
            },
            error: (err) => {
                this.errorMsg.set('Error saving schedule: ' + (err.error?.error || err.message));
                this.refreshAssignments();
                this.isSaving.set(false);
            }
        });
    }

    discardChanges() {
        this.pendingAdditions.set([]);
        this.pendingRemovals.set([]);
    }
}
