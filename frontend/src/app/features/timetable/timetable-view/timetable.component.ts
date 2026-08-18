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
    isLoading = signal(false);

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

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

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.classService.getClasses().subscribe(c => this.classes.set(c));
            this.subjectService.getSubjects().subscribe(s => this.subjects.set(s));
            this.teacherService.getTeachers().subscribe(t => this.teachers.set(t));
        }
    }

    onClassChange() {
        const cid = this.selectedClassId();
        if (!cid) { this.entries.set([]); return; }
        this.isLoading.set(true);
        this.timetableService.getClassTimetable(cid).subscribe({
            next: data => { this.entries.set(data); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
    }

    getEntriesForDayAndTime(dayIndex: number, time: string): TimetableEntry[] {
        return (this.entriesByDay()[dayIndex + 1] || []).filter(e =>
            e.start_time.startsWith(time.split(':')[0].padStart(2, '0'))
        );
    }
}
