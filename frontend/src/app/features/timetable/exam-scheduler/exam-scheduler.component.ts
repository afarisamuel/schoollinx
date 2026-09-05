import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { Room } from '../../../core/domain/facility.model';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { ExamSession } from '../../../core/domain/timetable.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-exam-scheduler',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './exam-scheduler.component.html'
})
export class ExamSchedulerComponent implements OnInit {
    private timetableService = inject(TimetableService);
    private classService = inject(ClassService);
    private periodService = inject(AcademicPeriodService);
    private subjectService = inject(SubjectService);
    private facilityService = inject(FacilityService);
    private toast = inject(ToastService);
    private platformId = inject(PLATFORM_ID);

    // Data State
    classes = signal<Class[]>([]);
    periods = signal<AcademicPeriod[]>([]);
    subjects = signal<Subject[]>([]);
    rooms = signal<Room[]>([]);
    examSessions = signal<ExamSession[]>([]);

    // Filter & Scope State
    selectedPeriodId = signal('');
    selectedClassId = signal('ALL');
    searchQuery = signal('');
    selectedSessionTimeFilter = signal<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL');
    viewMode = signal<'timeline' | 'table' | 'rooms'>('timeline');

    // Engine & Async State
    isGenerating = signal(false);
    isLoading = signal(false);
    isSavingSession = signal(false);

    // Modal State
    showAddModal = signal(false);
    newSessionForm = signal<Partial<ExamSession>>({
        class_id: '',
        subject_id: '',
        facility_id: '',
        date: new Date().toISOString(),
        start_time: '09:00',
        end_time: '12:00'
    });
    newSessionDateStr = signal('');

    // Computed Properties
    selectedPeriod = computed(() => this.periods().find(p => p.id === this.selectedPeriodId()));
    selectedClass = computed(() => this.classes().find(c => c.id === this.selectedClassId()));

    // Total counts & metrics
    totalSessionsCount = computed(() => this.examSessions().length);
    morningSessionsCount = computed(() => this.examSessions().filter(s => (s.start_time || '') < '12:00').length);
    afternoonSessionsCount = computed(() => this.examSessions().filter(s => (s.start_time || '') >= '12:00').length);
    uniqueRoomsUsedCount = computed(() => {
        const set = new Set(this.examSessions().map(s => s.facility_id));
        return set.size;
    });

    // Filtered Sessions
    filteredSessions = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const timeFilter = this.selectedSessionTimeFilter();

        return this.examSessions().filter(session => {
            const subj = this.getSubjectDetail(session.subject_id);
            const className = this.getClassName(session.class_id);
            const roomName = this.getRoomName(session.facility_id);

            const matchesQuery = !query ||
                subj.name.toLowerCase().includes(query) ||
                subj.code.toLowerCase().includes(query) ||
                className.toLowerCase().includes(query) ||
                roomName.toLowerCase().includes(query);

            const isMorning = (session.start_time || '') < '12:00';
            const matchesTime = timeFilter === 'ALL' ||
                (timeFilter === 'MORNING' && isMorning) ||
                (timeFilter === 'AFTERNOON' && !isMorning);

            return matchesQuery && matchesTime;
        });
    });

    // Sessions grouped by calendar date
    sessionsGroupedByDate = computed(() => {
        const groups = new Map<string, ExamSession[]>();
        const sessions = [...this.filteredSessions()].sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            if (da !== db) return da - db;
            return (a.start_time || '').localeCompare(b.start_time || '');
        });

        for (const s of sessions) {
            const dateKey = new Date(s.date).toISOString().split('T')[0];
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(s);
        }

        return Array.from(groups.entries()).map(([dateStr, items]) => ({
            date: new Date(dateStr),
            sessions: items
        }));
    });

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.loadInitialData();
        }
    }

    loadInitialData() {
        this.classService.getClasses().subscribe(c => this.classes.set(c || []));
        this.subjectService.getSubjects().subscribe(s => this.subjects.set(s || []));
        this.facilityService.getRooms().subscribe(r => this.rooms.set(r || []));
        
        this.periodService.getAll().subscribe(periods => {
            this.periods.set(periods || []);
            const active = periods?.find(p => p.is_active) || periods?.[0];
            if (active) {
                this.selectedPeriodId.set(active.id);
                this.loadExamSchedule();
            }
        });
    }

    loadExamSchedule() {
        const pid = this.selectedPeriodId();
        const cid = this.selectedClassId();

        if (!pid) {
            this.examSessions.set([]);
            return;
        }

        this.isLoading.set(true);

        if (cid && cid !== 'ALL') {
            this.timetableService.getExamSchedule(cid).subscribe({
                next: (data) => {
                    this.examSessions.set(data || []);
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load class exam schedule', err);
                    this.isLoading.set(false);
                }
            });
        } else {
            this.timetableService.getExamScheduleByPeriod(pid).subscribe({
                next: (data) => {
                    this.examSessions.set(data || []);
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load period exam schedule', err);
                    // Fallback to class-by-class loading if needed
                    this.isLoading.set(false);
                }
            });
        }
    }

    generate() {
        const pid = this.selectedPeriodId();
        if (!pid) {
            this.toast.warning('Please select an Academic Period first');
            return;
        }

        this.isGenerating.set(true);
        this.timetableService.generateExamSchedule(pid).subscribe({
            next: (res) => {
                this.toast.success(res.message || 'Optimized examination timetable compiled successfully!');
                this.isGenerating.set(false);
                this.loadExamSchedule();
            },
            error: (err) => {
                console.error('Generation failed', err);
                this.toast.error(err.error?.error || 'Timetable generation encountered an issue.');
                this.isGenerating.set(false);
            }
        });
    }

    openAddModal() {
        const pid = this.selectedPeriodId();
        const firstClass = this.classes()[0]?.id || '';
        const firstSubject = this.subjects()[0]?.id || '';
        const firstRoom = this.rooms()[0]?.id || '';

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        this.newSessionDateStr.set(dateStr);

        this.newSessionForm.set({
            academic_period_id: pid,
            class_id: this.selectedClassId() !== 'ALL' ? this.selectedClassId() : firstClass,
            subject_id: firstSubject,
            facility_id: firstRoom,
            start_time: '09:00',
            end_time: '12:00'
        });

        this.showAddModal.set(true);
    }

    closeAddModal() {
        this.showAddModal.set(false);
    }

    saveCustomSession() {
        const form = this.newSessionForm();
        const dateStr = this.newSessionDateStr();

        if (!form.class_id) {
            this.toast.warning('Please select a target class');
            return;
        }
        if (!form.subject_id) {
            this.toast.warning('Please select a subject');
            return;
        }
        if (!dateStr) {
            this.toast.warning('Please select an exam date');
            return;
        }

        const payload: Partial<ExamSession> = {
            academic_period_id: this.selectedPeriodId(),
            class_id: form.class_id,
            subject_id: form.subject_id,
            facility_id: form.facility_id || (this.rooms()[0]?.id || ''),
            date: new Date(dateStr).toISOString(),
            start_time: form.start_time || '09:00',
            end_time: form.end_time || '12:00'
        };

        this.isSavingSession.set(true);
        this.timetableService.createExamSession(payload).subscribe({
            next: () => {
                this.toast.success('Exam session added to schedule');
                this.isSavingSession.set(false);
                this.closeAddModal();
                this.loadExamSchedule();
            },
            error: (err) => {
                console.error('Failed to create session', err);
                this.toast.error('Failed to add exam session');
                this.isSavingSession.set(false);
            }
        });
    }

    deleteSession(session: ExamSession, event?: Event) {
        if (event) event.stopPropagation();
        if (!session.id) return;

        const subj = this.getSubjectDetail(session.subject_id);
        const className = this.getClassName(session.class_id);

        if (!confirm(`Remove ${subj.name} exam session for ${className}?`)) {
            return;
        }

        this.timetableService.deleteExamSession(session.id).subscribe({
            next: () => {
                this.toast.success('Session removed from timetable');
                this.loadExamSchedule();
            },
            error: (err) => {
                console.error('Failed to delete session', err);
                this.toast.error('Failed to remove session');
            }
        });
    }

    exportCSV() {
        if (this.examSessions().length === 0) {
            this.toast.warning('No exam sessions available to export');
            return;
        }

        const headers = ['Date', 'Day', 'Start Time', 'End Time', 'Class', 'Subject Code', 'Subject Name', 'Room'];
        const rows = this.filteredSessions().map(s => [
            new Date(s.date).toISOString().split('T')[0],
            new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' }),
            s.start_time,
            s.end_time,
            this.getClassName(s.class_id),
            this.getSubjectDetail(s.subject_id).code,
            this.getSubjectDetail(s.subject_id).name,
            this.getRoomName(s.facility_id)
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Exam_Timetable_${this.selectedPeriod()?.name || 'Schedule'}.csv`);
        link.click();
        URL.revokeObjectURL(url);
        this.toast.success('Timetable CSV exported');
    }

    printTimetable() {
        window.print();
    }

    getSubjectDetail(id: string): { name: string; code: string } {
        const sub = this.subjects().find(s => s.id === id);
        return sub ? { name: sub.name, code: sub.code } : { name: 'Subject Evaluation', code: 'SUB' };
    }

    getClassName(id: string): string {
        const c = this.classes().find(cls => cls.id === id);
        return c ? c.name : 'Cohort ' + (id?.substring(0, 4) || '');
    }

    getRoomName(id: string): string {
        const r = this.rooms().find(room => room.id === id);
        return r ? r.name : 'Main Exam Hall';
    }
}
