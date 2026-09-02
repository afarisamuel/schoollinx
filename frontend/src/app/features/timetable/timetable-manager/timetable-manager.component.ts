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

export interface SchedulePeriod {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    isBreak?: boolean;
}

export interface SubjectTheme {
    bg: string;
    border: string;
    text: string;
    badge: string;
    accent: string;
}

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
    classCounts = signal<Record<string, number>>({});

    selectedClassId = signal<string>('');
    viewMode = signal<'grid' | 'list'>('grid');
    isAdding = signal(false);
    isSaving = signal(false);
    showCopyModal = signal(false);
    copySourceClassId = signal('');
    isCopying = signal(false);

    successMsg = signal('');
    errorMsg = signal('');
    conflictMsg = signal('');

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    timeSlots = [
        '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    periods: SchedulePeriod[] = [
        { id: 'p1', label: 'Period 1', startTime: '08:00', endTime: '08:45' },
        { id: 'p2', label: 'Period 2', startTime: '08:45', endTime: '09:30' },
        { id: 'p3', label: 'Period 3', startTime: '09:30', endTime: '10:15' },
        { id: 'break1', label: 'Snack Break', startTime: '10:15', endTime: '10:45', isBreak: true },
        { id: 'p4', label: 'Period 4', startTime: '10:45', endTime: '11:30' },
        { id: 'p5', label: 'Period 5', startTime: '11:30', endTime: '12:15' },
        { id: 'lunch', label: 'Lunch Break', startTime: '12:15', endTime: '13:15', isBreak: true },
        { id: 'p6', label: 'Period 6', startTime: '13:15', endTime: '14:00' },
        { id: 'p7', label: 'Period 7', startTime: '14:00', endTime: '14:45' },
        { id: 'p8', label: 'Period 8', startTime: '14:45', endTime: '15:30' }
    ];

    draft: Partial<TimetableEntry> = {
        day_of_week: 1,
        start_time: '08:00',
        end_time: '08:45',
        room: ''
    };

    selectedClass = computed(() => {
        const id = this.selectedClassId();
        return this.classes().find(c => c.id === id) || null;
    });

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

    totalSessions = computed(() => this.entries().length);

    totalWeeklyMinutes = computed(() => {
        let mins = 0;
        for (const e of this.entries()) {
            const [sh, sm] = (e.start_time || '00:00').split(':').map(Number);
            const [eh, em] = (e.end_time || '00:00').split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur > 0) mins += dur;
        }
        return mins;
    });

    totalWeeklyHours = computed(() => (this.totalWeeklyMinutes() / 60).toFixed(1));

    subjectDistribution = computed(() => {
        const counts: Record<string, number> = {};
        for (const e of this.entries()) {
            const name = this.subjectMap()[e.subject_id] || 'Other';
            counts[name] = (counts[name] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([name, count]) => ({
                name,
                count,
                theme: this.getSubjectTheme(name)
            }))
            .sort((a, b) => b.count - a.count);
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

            if (classes.length > 0 && !this.selectedClassId()) {
                this.selectClass(classes[0].id!);
            }
        });
    }

    selectClass(classId: string) {
        this.selectedClassId.set(classId);
        this.onClassChange();
    }

    onClassChange() {
        const cid = this.selectedClassId();
        if (!cid) { this.entries.set([]); return; }
        this.timetableService.getClassTimetable(cid).subscribe(data => {
            this.entries.set(data);
            this.classCounts.update(map => ({ ...map, [cid]: data.length }));
        });
    }

    getEntryForSlot(day: number, period: SchedulePeriod): TimetableEntry | undefined {
        const dayEntries = this.entriesByDay()[day] || [];
        return dayEntries.find(e => {
            // Match if entry start time aligns or overlaps with the period
            return e.start_time === period.startTime || 
                   (e.start_time <= period.startTime && e.end_time >= period.endTime);
        });
    }

    openAddForSlot(day: number, period?: SchedulePeriod) {
        this.draft = {
            day_of_week: day,
            start_time: period ? period.startTime : '08:00',
            end_time: period ? period.endTime : '08:45',
            room: ''
        };
        this.isAdding.set(true);
    }

    getSubjectTheme(name?: string): SubjectTheme {
        if (!name) {
            return {
                bg: 'bg-slate-500/10 hover:bg-slate-500/20',
                border: 'border-slate-500/30',
                text: 'text-slate-300',
                badge: 'bg-slate-500/20 text-slate-300',
                accent: 'bg-slate-500'
            };
        }
        const lower = name.toLowerCase();
        if (lower.includes('math')) {
            return {
                bg: 'bg-blue-500/15 hover:bg-blue-500/25',
                border: 'border-blue-500/40',
                text: 'text-blue-300',
                badge: 'bg-blue-500/20 text-blue-300',
                accent: 'bg-blue-500'
            };
        }
        if (lower.includes('scien') || lower.includes('bio') || lower.includes('chem') || lower.includes('phys')) {
            return {
                bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
                border: 'border-emerald-500/40',
                text: 'text-emerald-300',
                badge: 'bg-emerald-500/20 text-emerald-300',
                accent: 'bg-emerald-500'
            };
        }
        if (lower.includes('eng') || lower.includes('french') || lower.includes('twi') || lower.includes('lang') || lower.includes('lit')) {
            return {
                bg: 'bg-purple-500/15 hover:bg-purple-500/25',
                border: 'border-purple-500/40',
                text: 'text-purple-300',
                badge: 'bg-purple-500/20 text-purple-300',
                accent: 'bg-purple-500'
            };
        }
        if (lower.includes('social') || lower.includes('hist') || lower.includes('geo') || lower.includes('civic')) {
            return {
                bg: 'bg-amber-500/15 hover:bg-amber-500/25',
                border: 'border-amber-500/40',
                text: 'text-amber-300',
                badge: 'bg-amber-500/20 text-amber-300',
                accent: 'bg-amber-500'
            };
        }
        if (lower.includes('ict') || lower.includes('comput') || lower.includes('tech')) {
            return {
                bg: 'bg-cyan-500/15 hover:bg-cyan-500/25',
                border: 'border-cyan-500/40',
                text: 'text-cyan-300',
                badge: 'bg-cyan-500/20 text-cyan-300',
                accent: 'bg-cyan-500'
            };
        }
        if (lower.includes('art') || lower.includes('music') || lower.includes('drama') || lower.includes('rme')) {
            return {
                bg: 'bg-rose-500/15 hover:bg-rose-500/25',
                border: 'border-rose-500/40',
                text: 'text-rose-300',
                badge: 'bg-rose-500/20 text-rose-300',
                accent: 'bg-rose-500'
            };
        }
        if (lower.includes('pe') || lower.includes('sport') || lower.includes('physic')) {
            return {
                bg: 'bg-orange-500/15 hover:bg-orange-500/25',
                border: 'border-orange-500/40',
                text: 'text-orange-300',
                badge: 'bg-orange-500/20 text-orange-300',
                accent: 'bg-orange-500'
            };
        }

        // Generic hash fallback
        const colors = [
            { bg: 'bg-indigo-500/15 hover:bg-indigo-500/25', border: 'border-indigo-500/40', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300', accent: 'bg-indigo-500' },
            { bg: 'bg-teal-500/15 hover:bg-teal-500/25', border: 'border-teal-500/40', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300', accent: 'bg-teal-500' },
            { bg: 'bg-fuchsia-500/15 hover:bg-fuchsia-500/25', border: 'border-fuchsia-500/40', text: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 text-fuchsia-300', accent: 'bg-fuchsia-500' }
        ];
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
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
            day_of_week: Number(this.draft.day_of_week!),
            start_time: this.draft.start_time!,
            end_time: this.draft.end_time!,
            room: this.draft.room || ''
        };
        this.timetableService.addEntry(payload).subscribe({
            next: () => {
                this.successMsg.set('Entry added successfully!');
                this.isAdding.set(false);
                this.draft = { day_of_week: 1, start_time: '08:00', end_time: '08:45', room: '' };
                this.onClassChange();
                this.isSaving.set(false);
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: e => {
                if (e.error?.code === 'CONFLICT' || e.error?.error?.includes('conflict')) {
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

    openCopyModal() {
        this.copySourceClassId.set('');
        this.showCopyModal.set(true);
    }

    copySchedule() {
        const sourceId = this.copySourceClassId();
        const targetId = this.selectedClassId();
        if (!sourceId || !targetId || sourceId === targetId) {
            this.dialog.alert('Please select a valid source class to clone from.', 'Invalid Selection', 'warning');
            return;
        }

        this.isCopying.set(true);
        this.timetableService.getClassTimetable(sourceId).subscribe({
            next: (sourceEntries) => {
                if (sourceEntries.length === 0) {
                    this.isCopying.set(false);
                    this.dialog.alert('The selected source class has no scheduled sessions.', 'Empty Schedule', 'info');
                    return;
                }

                let completed = 0;
                sourceEntries.forEach(e => {
                    const clone: TimetableEntry = {
                        class_id: targetId,
                        subject_id: e.subject_id,
                        teacher_id: e.teacher_id,
                        day_of_week: e.day_of_week,
                        start_time: e.start_time,
                        end_time: e.end_time,
                        room: e.room || ''
                    };
                    this.timetableService.addEntry(clone).subscribe({
                        next: () => {
                            completed++;
                            if (completed === sourceEntries.length) {
                                this.isCopying.set(false);
                                this.showCopyModal.set(false);
                                this.dialog.alert(`Successfully copied ${completed} sessions into this class!`, 'Schedule Copied', 'success');
                                this.onClassChange();
                            }
                        },
                        error: () => {
                            completed++;
                            if (completed === sourceEntries.length) {
                                this.isCopying.set(false);
                                this.showCopyModal.set(false);
                                this.onClassChange();
                            }
                        }
                    });
                });
            },
            error: (err) => {
                this.isCopying.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to fetch source schedule.', 'Error', 'danger');
            }
        });
    }

    printTimetable() {
        if (typeof window !== 'undefined') {
            window.print();
        }
    }

    dayLabel(n: number) { return this.days[n - 1] ?? ''; }
}

