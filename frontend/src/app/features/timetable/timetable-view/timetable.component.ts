import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../../core/domain/teacher.model';
import { TimetableEntry } from '../../../core/domain/timetable.model';

@Component({
    selector: 'app-timetable',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './timetable.component.html',
    styleUrl: './timetable.component.css'
})
export class TimetableComponent implements OnInit {
    private timetableService = inject(TimetableService);
    private classService = inject(ClassService);
    private subjectService = inject(SubjectService);
    private teacherService = inject(TeacherService);
    private platformId = inject(PLATFORM_ID);

    classes = signal<Class[]>([]);
    subjects = signal<Subject[]>([]);
    teachers = signal<Teacher[]>([]);
    entries = signal<TimetableEntry[]>([]);
    selectedClassId = signal('');
    selectedDay = signal<number>(1); // 1 = Mon, ..., 5 = Fri
    viewMode = signal<'agenda' | 'grid'>('agenda');
    searchQuery = signal('');
    isLoading = signal(false);

    days = [
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' }
    ];

    timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

    selectedClass = computed(() => {
        const id = this.selectedClassId();
        return this.classes().find(c => c.id === id);
    });

    subjectMap = computed(() => {
        const m: Record<string, { name: string; code: string }> = {};
        for (const s of this.subjects()) {
            m[s.id!] = { name: s.name, code: s.code || s.name.slice(0, 4).toUpperCase() };
        }
        return m;
    });

    teacherMap = computed(() => {
        const m: Record<string, { name: string; initials: string }> = {};
        for (const t of this.teachers()) {
            if (t.id) {
                const fullName = `${t.first_name} ${t.last_name}`;
                const initials = `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`.toUpperCase();
                m[t.id] = { name: fullName, initials };
            }
        }
        return m;
    });

    filteredEntries = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const all = this.entries();
        if (!query) return all;

        const subMap = this.subjectMap();
        const teachMap = this.teacherMap();

        return all.filter(e => {
            const sub = subMap[e.subject_id]?.name?.toLowerCase() || '';
            const code = subMap[e.subject_id]?.code?.toLowerCase() || '';
            const teach = teachMap[e.teacher_id]?.name?.toLowerCase() || '';
            const room = (e.room || '').toLowerCase();
            return sub.includes(query) || code.includes(query) || teach.includes(query) || room.includes(query);
        });
    });

    entriesByDay = computed(() => {
        const result: Record<number, TimetableEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        for (const e of this.filteredEntries()) {
            if (result[e.day_of_week]) result[e.day_of_week].push(e);
        }
        for (const day of Object.keys(result)) {
            result[+day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        return result;
    });

    activeDayEntries = computed(() => {
        const day = this.selectedDay();
        return this.entriesByDay()[day] || [];
    });

    timetableStats = computed(() => {
        const totalSessions = this.entries().length;
        const distinctSubjects = new Set(this.entries().map(e => e.subject_id)).size;
        const distinctTeachers = new Set(this.entries().map(e => e.teacher_id)).size;
        return { totalSessions, distinctSubjects, distinctTeachers };
    });

    ngOnInit() {
        // Set default day based on today (Monday-Friday)
        const currentWeekday = new Date().getDay();
        if (currentWeekday >= 1 && currentWeekday <= 5) {
            this.selectedDay.set(currentWeekday);
        } else {
            this.selectedDay.set(1);
        }

        if (isPlatformBrowser(this.platformId)) {
            this.classService.getClasses().subscribe(c => {
                this.classes.set(c || []);
            });
            this.subjectService.getSubjects().subscribe(s => this.subjects.set(s || []));
            this.teacherService.getTeachers().subscribe(t => this.teachers.set(t || []));
        }
    }

    selectClass(classId: string) {
        this.selectedClassId.set(classId);
        this.onClassChange();
    }

    onClassChange() {
        const cid = this.selectedClassId();
        if (!cid) { 
            this.entries.set([]); 
            return; 
        }
        this.isLoading.set(true);
        this.timetableService.getClassTimetable(cid).subscribe({
            next: data => { 
                this.entries.set(data || []); 
                this.isLoading.set(false); 
            },
            error: () => this.isLoading.set(false)
        });
    }

    getEntriesForDayAndTime(dayIndex: number, time: string): TimetableEntry[] {
        return (this.entriesByDay()[dayIndex + 1] || []).filter(e =>
            e.start_time.startsWith(time.split(':')[0].padStart(2, '0'))
        );
    }

    getSubjectTheme(subjectName: string = ''): {
        bg: string;
        border: string;
        text: string;
        badgeBg: string;
        badgeText: string;
        gradient: string;
        icon: string;
    } {
        const lower = subjectName.toLowerCase();
        if (lower.includes('math') || lower.includes('algebra') || lower.includes('calc') || lower.includes('geom')) {
            return {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/30',
                text: 'text-blue-600 dark:text-blue-400',
                badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
                badgeText: 'text-blue-400',
                gradient: 'from-blue-600 to-indigo-600',
                icon: 'fas fa-square-root-variable'
            };
        }
        if (lower.includes('sci') || lower.includes('bio') || lower.includes('chem') || lower.includes('phys')) {
            return {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/30',
                text: 'text-emerald-600 dark:text-emerald-400',
                badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
                badgeText: 'text-emerald-400',
                gradient: 'from-emerald-600 to-teal-600',
                icon: 'fas fa-flask'
            };
        }
        if (lower.includes('eng') || lower.includes('lit') || lower.includes('lang') || lower.includes('read')) {
            return {
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/30',
                text: 'text-purple-600 dark:text-purple-400',
                badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
                badgeText: 'text-purple-400',
                gradient: 'from-purple-600 to-pink-600',
                icon: 'fas fa-book-open'
            };
        }
        if (lower.includes('hist') || lower.includes('soc') || lower.includes('geog') || lower.includes('civic')) {
            return {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/30',
                text: 'text-amber-600 dark:text-amber-400',
                badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
                badgeText: 'text-amber-400',
                gradient: 'from-amber-600 to-orange-600',
                icon: 'fas fa-landmark'
            };
        }
        if (lower.includes('art') || lower.includes('mus') || lower.includes('drama') || lower.includes('creat')) {
            return {
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/30',
                text: 'text-rose-600 dark:text-rose-400',
                badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
                badgeText: 'text-rose-400',
                gradient: 'from-rose-600 to-red-600',
                icon: 'fas fa-palette'
            };
        }
        if (lower.includes('ict') || lower.includes('comp') || lower.includes('tech') || lower.includes('code')) {
            return {
                bg: 'bg-cyan-500/10',
                border: 'border-cyan-500/30',
                text: 'text-cyan-600 dark:text-cyan-400',
                badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
                badgeText: 'text-cyan-400',
                gradient: 'from-cyan-600 to-blue-600',
                icon: 'fas fa-laptop-code'
            };
        }
        if (lower.includes('pe') || lower.includes('sport') || lower.includes('phys ed') || lower.includes('gym')) {
            return {
                bg: 'bg-teal-500/10',
                border: 'border-teal-500/30',
                text: 'text-teal-600 dark:text-teal-400',
                badgeBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30',
                badgeText: 'text-teal-400',
                gradient: 'from-teal-600 to-emerald-600',
                icon: 'fas fa-dumbbell'
            };
        }
        // Default theme
        return {
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/30',
            text: 'text-indigo-600 dark:text-indigo-400',
            badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
            badgeText: 'text-indigo-400',
            gradient: 'from-indigo-600 to-blue-600',
            icon: 'fas fa-graduation-cap'
        };
    }

    calculateDuration(start: string, end: string): string {
        if (!start || !end) return '';
        try {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
            if (totalMinutes <= 0) return '';
            if (totalMinutes >= 60) {
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr`;
            }
            return `${totalMinutes} min`;
        } catch {
            return '';
        }
    }

    printTimetable() {
        if (isPlatformBrowser(this.platformId)) {
            window.print();
        }
    }
}

