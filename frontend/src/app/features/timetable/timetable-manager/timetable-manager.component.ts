import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { TimetableEntry } from '../../../core/domain/timetable.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-timetable-manager',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './timetable-manager.component.html',
    styleUrl: './timetable-manager.component.css'
})
export class TimetableManagerComponent implements OnInit {
    private timetableService = inject(TimetableService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private teacherService = inject(TeacherService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    classes = signal<Class[]>([]);
    subjects = signal<Subject[]>([]);
    teachers = signal<Teacher[]>([]);
    entries = signal<TimetableEntry[]>([]);

    selectedClassId = signal<string>('');
    isAdding = signal(false);
    isSaving = signal(false);
    successMsg = signal('');
    errorMsg = signal('');
    conflictMsg = signal('');

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    timeSlots = [
        '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    draft: Partial<TimetableEntry> = {
        day_of_week: 1,
        start_time: '08:00',
        end_time: '09:30',
        room: ''
    };

    entriesByDay = computed(() => {
        const result: Record<number, TimetableEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        for (const e of this.entries()) {
            if (result[e.day_of_week]) result[e.day_of_week].push(e);
        }
        for (const day of Object.keys(result)) {
            result[+day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        return result;
    });

    subjectMap = computed(() => {
        const m: Record<string, string> = {};
        for (const s of this.subjects()) m[s.id!] = s.name;
        return m;
    });

    teacherMap = computed(() => {
        const m: Record<string, string> = {};
        for (const t of this.teachers()) if (t.id) m[t.id] = `${t.first_name} ${t.last_name}`;
        return m;
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadCoreData();
        }
    }

    loadCoreData() {
        forkJoin({
            classes: this.classService.getClasses(),
            subjects: this.subjectService.getSubjects(),
            teachers: this.teacherService.getTeachers()
        }).subscribe(({ classes, subjects, teachers }) => {
            this.classes.set(classes);
            this.subjects.set(subjects);
            this.teachers.set(teachers);
        });
    }

    onClassChange() {
        const cid = this.selectedClassId();
        if (!cid) { this.entries.set([]); return; }
        this.timetableService.getClassTimetable(cid).subscribe(data => this.entries.set(data));
    }

    addEntry() {
        if (!this.selectedClassId() || !this.draft.subject_id || !this.draft.teacher_id) {
            this.errorMsg.set('Class, subject and teacher are required.');
            return;
        }
        this.isSaving.set(true);
        this.errorMsg.set('');
        this.conflictMsg.set('');
        const payload: TimetableEntry = {
            class_id: this.selectedClassId(),
            subject_id: this.draft.subject_id!,
            teacher_id: this.draft.teacher_id!,
            day_of_week: this.draft.day_of_week!,
            start_time: this.draft.start_time!,
            end_time: this.draft.end_time!,
            room: this.draft.room || ''
        };
        this.timetableService.addEntry(payload).subscribe({
            next: () => {
                this.successMsg.set('Entry added!');
                this.isAdding.set(false);
                this.draft = { day_of_week: 1, start_time: '08:00', end_time: '09:30', room: '' };
                this.onClassChange();
                this.isSaving.set(false);
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: e => {
                if (e.error?.code === 'CONFLICT') {
                    this.conflictMsg.set(e.error.error || 'Scheduling conflict detected.');
                } else {
                    this.errorMsg.set(e.error?.error || 'Failed to add entry.');
                }
                this.isSaving.set(false);
            }
        });
    }

    removeEntry(entryId?: string) {
        if (!entryId) return;
        this.dialog.confirm('Are you sure you want to remove this timetable entry?', 'Remove Entry', 'warning', 'Remove').subscribe((confirmed) => {
            if (confirmed) {
                this.timetableService.removeEntry(entryId).subscribe({
                    next: () => {
                        this.successMsg.set('Entry removed successfully!');
                        this.onClassChange();
                        setTimeout(() => this.successMsg.set(''), 3000);
                    },
                    error: e => {
                        this.errorMsg.set(e.error?.error || 'Failed to remove entry.');
                        setTimeout(() => this.errorMsg.set(''), 3000);
                    }
                });
            }
        });
    }


    dayLabel(n: number) { return this.days[n - 1] ?? ''; }
}
