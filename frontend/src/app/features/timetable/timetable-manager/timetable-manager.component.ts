import { Component, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../../core/domain/teacher.model';
import {
    TimetableEntry,
    TeacherUnavailability,
    TimetableAuditReport,
    TimetableConflict,
    RoomOccupancySlot,
    OptimizationResult,
    ExamInvigilationReport,
    ExamSessionWithInvigilation,
    TeacherAbsence,
    SubstituteLog,
    TimetableSnapshot,
    SubjectCognitiveWeight,
    TimetableTemplate,
    InvigilatorDutyLoadReport
} from '../../../core/domain/timetable.model';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
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
    private tenantProfileService = inject(TenantProfileService);
    private dialog = inject(DialogService);
    private platformId = inject(PLATFORM_ID);

    classes = signal<Class[]>([]);
    subjects = signal<Subject[]>([]);
    teachers = signal<Teacher[]>([]);
    entries = signal<TimetableEntry[]>([]);
    classCounts = signal<Record<string, number>>({});
    tenantProfile = signal<TenantProfile | null>(null);

    selectedClassId = signal<string>('');
    viewMode = signal<'grid' | 'list' | 'master' | 'rooms'>('grid');
    isAdding = signal(false);
    isSaving = signal(false);
    showCopyModal = signal(false);
    copySourceClassId = signal('');
    isCopying = signal(false);

    // Drag-and-Drop State
    draggedEntry = signal<TimetableEntry | null>(null);
    isDragging = signal(false);

    // Master Heatmap & Room Occupancy State
    masterDay = signal(1);
    masterSchedule = signal<TimetableEntry[]>([]);
    roomOccupancy = signal<RoomOccupancySlot[]>([]);
    isLoadingMaster = signal(false);
    isLoadingRooms = signal(false);

    // AI Simulated Annealing Optimizer State
    isOptimizingAI = signal(false);
    optimizationResult = signal<OptimizationResult | null>(null);
    showOptimizationModal = signal(false);

    // Exam Invigilation & Seating State
    showInvigilationModal = signal(false);
    isInvigilating = signal(false);
    invigilationReport = signal<ExamInvigilationReport | null>(null);

    // Calendar Subscription Feed State
    showICSFeedModal = signal(false);
    selectedTeacherForFeed = signal('');
    copiedFeedback = signal(false);

    // Auto-Scheduler State
    showAutoScheduleModal = signal(false);
    autoScheduleScope = signal<'single' | 'all'>('single');
    autoScheduleClearExisting = signal(true);
    isAutoScheduling = signal(false);
    isClearing = signal(false);

    // Live Timetable Conflict Audit State
    auditReport = signal<TimetableAuditReport | null>(null);
    isAuditing = signal(false);
    showAuditModal = signal(false);

    // Teacher Availability / Off-Period Preferences State
    showUnavailabilityModal = signal(false);
    unavailabilities = signal<TeacherUnavailability[]>([]);
    isSavingUnavailability = signal(false);
    draftUnavailability = {
        teacher_id: '',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '12:00',
        reason: 'Part-time off-duty'
    };

    // Digest Dispatch State
    isSendingDigest = signal(false);

    // Relief / Substitute Teacher Finder State
    showReliefModal = signal(false);
    reliefDay = signal(1);
    reliefPeriod = signal<SchedulePeriod | null>(null);
    reliefSlotStartTime = signal('08:00');
    reliefSlotEndTime = signal('08:45');
    reliefSubjectName = signal('');
    availableReliefTeachers = signal<any[]>([]);
    isLoadingRelief = signal(false);
    selectedReliefEntry = signal<TimetableEntry | null>(null);

    // Recommendation #4: Teacher Absences & Substitute Management
    showAbsenceModal = signal(false);
    absences = signal<TeacherAbsence[]>([]);
    substituteLogs = signal<SubstituteLog[]>([]);
    isLoadingAbsences = signal(false);
    isSavingAbsence = signal(false);
    isAutoSubstituting = signal(false);
    draftAbsence = {
        teacher_id: '',
        absent_date: new Date().toISOString().substring(0, 10),
        reason: 'Medical Leave'
    };

    // Recommendation #6: Timetable Snapshots & Version History
    showSnapshotModal = signal(false);
    snapshots = signal<TimetableSnapshot[]>([]);
    isLoadingSnapshots = signal(false);
    isCreatingSnapshot = signal(false);
    draftSnapshotLabel = signal('');

    // Recommendation #7: Subject Cognitive Weights
    showCognitiveModal = signal(false);
    cognitiveWeights = signal<SubjectCognitiveWeight[]>([]);
    isLoadingCognitive = signal(false);

    // Recommendation #8: Timetable Templates
    showTemplateModal = signal(false);
    templates = signal<TimetableTemplate[]>([]);
    isLoadingTemplates = signal(false);
    isSavingTemplate = signal(false);
    draftTemplateName = signal('');

    // Recommendation #10: Invigilator Duty Load Balancing
    invigilatorDutyReport = signal<InvigilatorDutyLoadReport | null>(null);
    isLoadingDutyReport = signal(false);
    isRebalancingInvigilators = signal(false);

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
            teachers: this.teacherService.getTeachers(),
            profile: this.tenantProfileService.getProfile()
        }).subscribe(({ classes, subjects, teachers, profile }) => {
            this.classes.set(classes);
            this.subjects.set(subjects);
            this.teachers.set(teachers);
            this.tenantProfile.set(profile);

            if (classes.length > 0 && !this.selectedClassId()) {
                this.selectClass(classes[0].id!);
            }
            this.runAudit();
            this.loadUnavailabilities();
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
            this.runAudit();
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

    openAutoScheduleModal() {
        this.showAutoScheduleModal.set(true);
    }

    closeAutoScheduleModal() {
        this.showAutoScheduleModal.set(false);
    }

    runAutoSchedule() {
        this.isAutoScheduling.set(true);
        const targetClassId = this.autoScheduleScope() === 'single' ? this.selectedClassId() : undefined;
        
        this.timetableService.autoGenerateTimetable(targetClassId, this.autoScheduleClearExisting()).subscribe({
            next: (res) => {
                this.isAutoScheduling.set(false);
                this.showAutoScheduleModal.set(false);
                this.dialog.alert(
                    `Successfully generated ${res.entries_count} conflict-free instructional sessions across ${res.classes_count} class(es)!`,
                    'Auto-Schedule Complete',
                    'success'
                );
                this.onClassChange();
                this.refreshAllClassCounts();
            },
            error: (err) => {
                this.isAutoScheduling.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to auto-generate timetable schedule.', 'Error', 'danger');
            }
        });
    }

    clearSchedule() {
        const classId = this.selectedClassId();
        const className = this.selectedClass()?.name || 'this class';
        if (!classId) return;

        this.dialog.confirm(
            `Are you sure you want to completely clear the weekly timetable schedule for ${className}? This action cannot be undone.`,
            'Clear Timetable Schedule',
            'warning',
            'Clear Schedule'
        ).subscribe((confirmed) => {
            if (confirmed) {
                this.isClearing.set(true);
                this.timetableService.clearClassTimetable(classId).subscribe({
                    next: () => {
                        this.isClearing.set(false);
                        this.successMsg.set(`Schedule for ${className} cleared.`);
                        this.onClassChange();
                        this.refreshAllClassCounts();
                        setTimeout(() => this.successMsg.set(''), 3000);
                    },
                    error: (err) => {
                        this.isClearing.set(false);
                        this.dialog.alert(err?.error?.error || 'Failed to clear schedule.', 'Error', 'danger');
                    }
                });
            }
        });
    }

    refreshAllClassCounts() {
        this.classes().forEach(c => {
            if (c.id) {
                this.timetableService.getClassTimetable(c.id).subscribe(data => {
                    this.classCounts.update(map => ({ ...map, [c.id!]: data.length }));
                });
            }
        });
    }

    openReliefFinder(day: number, period: SchedulePeriod, entry?: TimetableEntry) {
        this.reliefDay.set(day);
        this.reliefPeriod.set(period);
        this.reliefSlotStartTime.set(period.startTime);
        this.reliefSlotEndTime.set(period.endTime);
        this.selectedReliefEntry.set(entry || null);
        if (entry && entry.subject_id) {
            this.reliefSubjectName.set(this.subjectMap()[entry.subject_id] || '');
        } else {
            this.reliefSubjectName.set('');
        }
        this.showReliefModal.set(true);
        this.loadAvailableReliefTeachers();
    }

    closeReliefFinder() {
        this.showReliefModal.set(false);
        this.selectedReliefEntry.set(null);
    }

    loadAvailableReliefTeachers() {
        this.isLoadingRelief.set(true);
        this.timetableService.getAvailableTeachers(this.reliefDay(), this.reliefSlotStartTime(), this.reliefSlotEndTime()).subscribe({
            next: (teachers) => {
                this.availableReliefTeachers.set(teachers);
                this.isLoadingRelief.set(false);
            },
            error: () => {
                this.availableReliefTeachers.set([]);
                this.isLoadingRelief.set(false);
            }
        });
    }

    assignReliefTeacher(teacher: any) {
        const entry = this.selectedReliefEntry();
        if (!entry || !entry.id) {
            this.draft = {
                day_of_week: this.reliefDay(),
                start_time: this.reliefSlotStartTime(),
                end_time: this.reliefSlotEndTime(),
                teacher_id: teacher.id,
                room: this.selectedClass()?.name || ''
            };
            this.isAdding.set(true);
            this.closeReliefFinder();
            return;
        }

        this.timetableService.removeEntry(entry.id).subscribe({
            next: () => {
                const updated: TimetableEntry = {
                    class_id: entry.class_id,
                    subject_id: entry.subject_id,
                    teacher_id: teacher.id,
                    day_of_week: entry.day_of_week,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    room: entry.room || ''
                };
                this.timetableService.addEntry(updated).subscribe({
                    next: () => {
                        this.successMsg.set(`Assigned ${teacher.first_name} ${teacher.last_name} as substitute teacher!`);
                        this.closeReliefFinder();
                        this.onClassChange();
                        setTimeout(() => this.successMsg.set(''), 3500);
                    },
                    error: (err) => {
                        this.dialog.alert(err?.error?.error || 'Failed to update substitute teacher.', 'Error', 'danger');
                    }
                });
            },
            error: (err) => {
                this.dialog.alert(err?.error?.error || 'Failed to replace teacher.', 'Error', 'danger');
            }
        });
    }

    exportToICal() {
        const cls = this.selectedClass();
        const entries = this.entries();
        if (!cls || entries.length === 0) {
            this.dialog.alert('No scheduled sessions found for this class to export.', 'Empty Timetable', 'info');
            return;
        }

        const byDays: Record<number, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR' };
        
        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SchoolLinx//Institutional Timetable//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${cls.name} Class Schedule`,
            'X-WR-TIMEZONE:Africa/Accra'
        ];

        // Anchor date: next Monday
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));

        entries.forEach((e, idx) => {
            const subjName = this.subjectMap()[e.subject_id] || 'Instructional Period';
            const teacherName = this.teacherMap()[e.teacher_id] || 'Staff';
            const byDay = byDays[e.day_of_week] || 'MO';

            const [startH, startM] = (e.start_time || '08:00').split(':').map(Number);
            const [endH, endM] = (e.end_time || '08:45').split(':').map(Number);

            const sessionDate = new Date(monday);
            sessionDate.setDate(monday.getDate() + (e.day_of_week - 1));

            const pad = (n: number) => n < 10 ? '0' + n : '' + n;
            const dtStart = `${sessionDate.getFullYear()}${pad(sessionDate.getMonth() + 1)}${pad(sessionDate.getDate())}T${pad(startH)}${pad(startM)}00`;
            const dtEnd = `${sessionDate.getFullYear()}${pad(sessionDate.getMonth() + 1)}${pad(sessionDate.getDate())}T${pad(endH)}${pad(endM)}00`;

            ics.push(
                'BEGIN:VEVENT',
                `UID:schoollinx-timetable-${e.id || idx}-${cls.id}@schoollinx.com`,
                `DTSTAMP:${dtStart}Z`,
                `DTSTART;TZID=Africa/Accra:${dtStart}`,
                `DTEND;TZID=Africa/Accra:${dtEnd}`,
                `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
                `SUMMARY:${subjName} (${cls.name})`,
                `DESCRIPTION:Instructor: ${teacherName}\\nClass: ${cls.name}\\nRoom: ${e.room || 'Main Classroom'}`,
                `LOCATION:${e.room || cls.name}`,
                'STATUS:CONFIRMED',
                'END:VEVENT'
            );
        });

        ics.push('END:VCALENDAR');
        const icsBlob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(icsBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Timetable_${cls.name.replace(/\s+/g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    dayLabel(n: number) { return this.days[n - 1] ?? ''; }

    runAudit() {
        this.isAuditing.set(true);
        this.timetableService.auditTimetable().subscribe({
            next: (report) => {
                this.auditReport.set(report);
                this.isAuditing.set(false);
            },
            error: () => {
                this.isAuditing.set(false);
            }
        });
    }

    openAuditModal() {
        this.runAudit();
        this.showAuditModal.set(true);
    }

    closeAuditModal() {
        this.showAuditModal.set(false);
    }

    getEntryConflict(day: number, period: SchedulePeriod): TimetableConflict | undefined {
        const report = this.auditReport();
        if (!report || !report.conflicts) return undefined;
        const cid = this.selectedClassId();
        return report.conflicts.find(c =>
            c.day_of_week === day &&
            c.start_time === period.startTime &&
            (!c.class_id || c.class_id === cid)
        );
    }

    openUnavailabilityModal() {
        this.loadUnavailabilities();
        this.showUnavailabilityModal.set(true);
    }

    closeUnavailabilityModal() {
        this.showUnavailabilityModal.set(false);
    }

    loadUnavailabilities() {
        this.timetableService.getTeacherUnavailabilities().subscribe({
            next: (list) => this.unavailabilities.set(list),
            error: () => this.unavailabilities.set([])
        });
    }

    saveUnavailability() {
        if (!this.draftUnavailability.teacher_id) {
            this.dialog.alert('Please select a teacher.', 'Required Field', 'warning');
            return;
        }
        this.isSavingUnavailability.set(true);
        this.timetableService.addTeacherUnavailability({
            teacher_id: this.draftUnavailability.teacher_id,
            day_of_week: Number(this.draftUnavailability.day_of_week),
            start_time: this.draftUnavailability.start_time || undefined,
            end_time: this.draftUnavailability.end_time || undefined,
            reason: this.draftUnavailability.reason
        }).subscribe({
            next: () => {
                this.isSavingUnavailability.set(false);
                this.loadUnavailabilities();
                this.runAudit();
                this.draftUnavailability = {
                    teacher_id: '',
                    day_of_week: 1,
                    start_time: '08:00',
                    end_time: '12:00',
                    reason: 'Part-time off-duty'
                };
            },
            error: (err) => {
                this.isSavingUnavailability.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to save unavailability constraint.', 'Error', 'danger');
            }
        });
    }

    removeUnavailability(id?: string) {
        if (!id) return;
        this.timetableService.deleteTeacherUnavailability(id).subscribe({
            next: () => {
                this.loadUnavailabilities();
                this.runAudit();
            }
        });
    }

    sendTeacherDigest() {
        const todayDay = new Date().getDay() || 1; // 1 (Mon) to 5 (Fri)
        const adjustedDay = todayDay > 5 ? 1 : todayDay;
        const dayTitle = this.days[adjustedDay - 1];

        this.dialog.confirm(
            `Dispatch today's (${dayTitle}) personalized schedule digest to all academic faculty members via SMS / Notification?`,
            'Dispatch Teacher Daily Digest',
            'info',
            'Send Digest'
        ).subscribe((confirmed) => {
            if (confirmed) {
                this.isSendingDigest.set(true);
                this.timetableService.sendDailyDigest(adjustedDay).subscribe({
                    next: (res) => {
                        this.isSendingDigest.set(false);
                        this.dialog.alert(
                            `Successfully sent today's instructional schedule summary to ${res.dispatched_count} active teacher(s)!`,
                            'Schedule Digest Sent',
                            'success'
                        );
                    },
                    error: (err) => {
                        this.isSendingDigest.set(false);
                        this.dialog.alert(err?.error?.error || 'Failed to dispatch teacher schedule digests.', 'Error', 'danger');
                    }
                });
            }
        });
    }

    quickFixConflict(conflict: TimetableConflict) {
        this.closeAuditModal();
        const period = this.periods.find(p => p.startTime === conflict.start_time) || {
            id: 'slot',
            label: `Slot (${conflict.start_time})`,
            startTime: conflict.start_time,
            endTime: conflict.end_time
        };
        const entry = this.entries().find(e => e.id === conflict.entry_id || (e.day_of_week === conflict.day_of_week && e.start_time === conflict.start_time));
        this.openReliefFinder(conflict.day_of_week, period, entry);
    }

    // ═══════════════════════ DRAG AND DROP HANDLERS ═══════════════════════
    onDragStart(event: DragEvent, entry: TimetableEntry) {
        this.draggedEntry.set(entry);
        this.isDragging.set(true);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', entry.id || '');
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    onDragEnd() {
        this.draggedEntry.set(null);
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent, targetDay: number, targetPeriod: SchedulePeriod) {
        event.preventDefault();
        const dragged = this.draggedEntry();
        this.onDragEnd();
        if (!dragged || !dragged.id || targetPeriod.isBreak) return;
        if (dragged.day_of_week === targetDay && dragged.start_time === targetPeriod.startTime) {
            return;
        }

        this.timetableService.moveOrSwapSlot(
            dragged.id,
            targetDay,
            targetPeriod.startTime,
            targetPeriod.endTime,
            dragged.room
        ).subscribe({
            next: (res) => {
                this.successMsg.set(res.swapped ? 'Timetable slots swapped successfully!' : 'Timetable slot moved successfully!');
                this.onClassChange();
                this.runAudit();
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (err) => {
                this.dialog.alert(err?.error?.error || 'Failed to move timetable slot due to scheduling conflict.', 'Move Conflict', 'warning');
            }
        });
    }

    // ═══════════════════════ MASTER HEATMAP & ROOM OCCUPANCY ═══════════════════════
    loadMasterSchedule(day?: number) {
        if (day !== undefined) this.masterDay.set(day);
        this.isLoadingMaster.set(true);
        this.timetableService.getMasterSchedule(this.masterDay()).subscribe({
            next: (entries) => {
                this.masterSchedule.set(entries);
                this.isLoadingMaster.set(false);
            },
            error: () => this.isLoadingMaster.set(false)
        });
    }

    loadRoomOccupancy(day?: number) {
        if (day !== undefined) this.masterDay.set(day);
        this.isLoadingRooms.set(true);
        this.timetableService.getRoomOccupancy(this.masterDay()).subscribe({
            next: (slots) => {
                this.roomOccupancy.set(slots);
                this.isLoadingRooms.set(false);
            },
            error: () => this.isLoadingRooms.set(false)
        });
    }

    setMasterDay(day: number) {
        this.masterDay.set(day);
        if (this.viewMode() === 'master') {
            this.loadMasterSchedule(day);
        } else if (this.viewMode() === 'rooms') {
            this.loadRoomOccupancy(day);
        }
    }

    switchViewMode(mode: 'grid' | 'list' | 'master' | 'rooms') {
        this.viewMode.set(mode);
        if (mode === 'master') {
            this.loadMasterSchedule(this.masterDay());
        } else if (mode === 'rooms') {
            this.loadRoomOccupancy(this.masterDay());
        }
    }

    getMasterEntry(classId: string, period: SchedulePeriod): TimetableEntry | undefined {
        return this.masterSchedule().find(e => e.class_id === classId && e.start_time === period.startTime);
    }

    getUniqueRooms(): string[] {
        const set = new Set<string>();
        for (const slot of this.roomOccupancy()) {
            if (slot.room) set.add(slot.room);
        }
        return Array.from(set).sort();
    }

    getRoomSlot(room: string, period: SchedulePeriod): RoomOccupancySlot | undefined {
        return this.roomOccupancy().find(s => s.room === room && s.start_time === period.startTime);
    }

    // ═══════════════════════ AI OPTIMIZER ═══════════════════════
    runAIOptimizer(classOnly = false) {
        const classId = classOnly ? this.selectedClassId() : undefined;
        const targetName = classOnly && this.selectedClass() ? this.selectedClass()?.name : 'All School Classes';
        
        this.dialog.confirm(
            `Execute AI Simulated Annealing multi-objective solver to resolve teacher clashes, balance cognitive subject loads, and optimize room utilization for ${targetName}?`,
            'AI Timetable Optimizer',
            'info',
            'Run AI Optimizer'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.isOptimizingAI.set(true);
                this.timetableService.optimizeAI(classId).subscribe({
                    next: (res) => {
                        this.isOptimizingAI.set(false);
                        this.optimizationResult.set(res);
                        this.showOptimizationModal.set(true);
                        this.onClassChange();
                        this.refreshAllClassCounts();
                        this.runAudit();
                    },
                    error: (err) => {
                        this.isOptimizingAI.set(false);
                        this.dialog.alert(err?.error?.error || 'AI Optimization solver failed.', 'Optimizer Error', 'danger');
                    }
                });
            }
        });
    }

    closeOptimizationModal() {
        this.showOptimizationModal.set(false);
    }

    // ═══════════════════════ ICS CALENDAR FEEDS ═══════════════════════
    openICSFeedModal() {
        if (!this.selectedTeacherForFeed() && this.teachers().length > 0) {
            this.selectedTeacherForFeed.set(this.teachers()[0].id || '');
        }
        this.showICSFeedModal.set(true);
    }

    closeICSFeedModal() {
        this.showICSFeedModal.set(false);
    }

    getClassFeedUrl(): string {
        const clsId = this.selectedClassId();
        if (!clsId) return '';
        return this.timetableService.getClassFeedUrl(clsId);
    }

    getTeacherFeedUrl(): string {
        const tId = this.selectedTeacherForFeed();
        if (!tId) return '';
        return this.timetableService.getTeacherFeedUrl(tId);
    }

    copyToClipboard(url: string) {
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            this.copiedFeedback.set(true);
            setTimeout(() => this.copiedFeedback.set(false), 2500);
        });
    }

    // ═══════════════════════ EXAM INVIGILATION ═══════════════════════
    openInvigilationModal() {
        this.showInvigilationModal.set(true);
    }

    closeInvigilationModal() {
        this.showInvigilationModal.set(false);
    }

    runAutoInvigilation() {
        const periodId = this.classes()[0]?.id || '00000000-0000-0000-0000-000000000000';
        this.isInvigilating.set(true);
        this.timetableService.autoAssignExamInvigilators(periodId).subscribe({
            next: (report) => {
                this.invigilationReport.set(report);
                this.isInvigilating.set(false);
                this.loadInvigilatorDutyReport();
            },
            error: (err) => {
                this.isInvigilating.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to auto-assign invigilators.', 'Invigilation Error', 'danger');
            }
        });
    }

    loadInvigilatorDutyReport() {
        const periodId = this.classes()[0]?.id || '00000000-0000-0000-0000-000000000000';
        this.isLoadingDutyReport.set(true);
        this.timetableService.getInvigilatorDutyLoadReport(periodId).subscribe({
            next: (report) => {
                this.invigilatorDutyReport.set(report);
                this.isLoadingDutyReport.set(false);
            },
            error: () => this.isLoadingDutyReport.set(false)
        });
    }

    rebalanceInvigilatorDuties() {
        const periodId = this.classes()[0]?.id || '00000000-0000-0000-0000-000000000000';
        this.isRebalancingInvigilators.set(true);
        this.timetableService.rebalanceInvigilators(periodId, 3).subscribe({
            next: (res) => {
                this.isRebalancingInvigilators.set(false);
                this.dialog.alert(res.message || 'Invigilation duties rebalanced successfully.', 'Duties Rebalanced', 'info');
                this.loadInvigilatorDutyReport();
                this.runAutoInvigilation();
            },
            error: (err) => {
                this.isRebalancingInvigilators.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to rebalance invigilators.', 'Error', 'danger');
            }
        });
    }

    // ═══════════════════════ ABSENCE & SUBSTITUTES (Rec #4) ═══════════════════════
    openAbsenceModal() {
        if (!this.draftAbsence.teacher_id && this.teachers().length > 0) {
            this.draftAbsence.teacher_id = this.teachers()[0].id || '';
        }
        this.showAbsenceModal.set(true);
        this.loadAbsences();
        this.loadSubstituteLogs();
    }

    closeAbsenceModal() {
        this.showAbsenceModal.set(false);
    }

    loadAbsences() {
        this.isLoadingAbsences.set(true);
        this.timetableService.listAbsences().subscribe({
            next: (data) => {
                this.absences.set(data || []);
                this.isLoadingAbsences.set(false);
            },
            error: () => this.isLoadingAbsences.set(false)
        });
    }

    loadSubstituteLogs() {
        this.timetableService.getSubstituteLogs(30).subscribe({
            next: (logs) => this.substituteLogs.set(logs || []),
            error: () => {}
        });
    }

    recordAbsence() {
        if (!this.draftAbsence.teacher_id) {
            this.dialog.alert('Please select an absent teacher.', 'Missing Information', 'danger');
            return;
        }
        this.isSavingAbsence.set(true);
        this.timetableService.recordAbsence(
            this.draftAbsence.teacher_id,
            this.draftAbsence.absent_date,
            this.draftAbsence.reason
        ).subscribe({
            next: (res) => {
                this.isSavingAbsence.set(false);
                const affectedCount = res.affected_slots?.length || 0;
                const subsCount = res.available_substitutes?.length || 0;
                this.dialog.alert(
                    `Absence recorded for ${this.teacherMap()[this.draftAbsence.teacher_id]}. Found ${affectedCount} affected periods and ${subsCount} available candidate substitutes.`,
                    'Absence Logged',
                    'info'
                );
                this.loadAbsences();
                if (res.absence?.id) {
                    this.autoSubstitute(res.absence.id);
                }
            },
            error: (err) => {
                this.isSavingAbsence.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to record absence.', 'Error', 'danger');
            }
        });
    }

    autoSubstitute(absenceId: string) {
        this.isAutoSubstituting.set(true);
        this.timetableService.autoAssignSubstitutes(absenceId).subscribe({
            next: (res) => {
                this.isAutoSubstituting.set(false);
                this.dialog.alert(res.message, 'Substitute Auto-Assigned', 'info');
                this.loadAbsences();
                this.loadSubstituteLogs();
                this.onClassChange();
                this.refreshAllClassCounts();
            },
            error: (err) => {
                this.isAutoSubstituting.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to auto-assign substitute.', 'Error', 'danger');
            }
        });
    }

    // ═══════════════════════ TIMETABLE SNAPSHOTS (Rec #6) ═══════════════════════
    openSnapshotModal() {
        this.showSnapshotModal.set(true);
        this.loadSnapshots();
    }

    closeSnapshotModal() {
        this.showSnapshotModal.set(false);
    }

    loadSnapshots() {
        this.isLoadingSnapshots.set(true);
        this.timetableService.listSnapshots().subscribe({
            next: (snaps) => {
                this.snapshots.set(snaps || []);
                this.isLoadingSnapshots.set(false);
            },
            error: () => this.isLoadingSnapshots.set(false)
        });
    }

    createSnapshot() {
        const label = this.draftSnapshotLabel().trim() || `Snapshot ${new Date().toLocaleString()}`;
        this.isCreatingSnapshot.set(true);
        this.timetableService.createSnapshot(label).subscribe({
            next: (s) => {
                this.isCreatingSnapshot.set(false);
                this.draftSnapshotLabel.set('');
                this.dialog.alert(`Snapshot "${s.label}" created successfully.`, 'Snapshot Saved', 'info');
                this.loadSnapshots();
            },
            error: (err) => {
                this.isCreatingSnapshot.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to save snapshot.', 'Error', 'danger');
            }
        });
    }

    restoreSnapshot(snapshot: TimetableSnapshot) {
        if (!snapshot.id) return;
        this.dialog.confirm(
            `Restore timetable to snapshot "${snapshot.label}" (${new Date(snapshot.created_at || '').toLocaleDateString()})? Current schedules will be safely overwritten with this snapshot.`,
            'Restore Snapshot',
            'warning',
            'Restore Timetable'
        ).subscribe(confirmed => {
            if (confirmed) {
                this.timetableService.restoreSnapshot(snapshot.id!).subscribe({
                    next: (res) => {
                        this.dialog.alert(res.message, 'Snapshot Restored', 'info');
                        this.onClassChange();
                        this.refreshAllClassCounts();
                        this.runAudit();
                        this.closeSnapshotModal();
                    },
                    error: (err) => {
                        this.dialog.alert(err?.error?.error || 'Failed to restore snapshot.', 'Error', 'danger');
                    }
                });
            }
        });
    }

    // ═══════════════════════ COGNITIVE WEIGHTS (Rec #7) ═══════════════════════
    openCognitiveModal() {
        this.showCognitiveModal.set(true);
        this.loadCognitiveWeights();
    }

    closeCognitiveModal() {
        this.showCognitiveModal.set(false);
    }

    loadCognitiveWeights() {
        this.isLoadingCognitive.set(true);
        this.timetableService.getSubjectCognitiveWeights().subscribe({
            next: (weights) => {
                this.cognitiveWeights.set(weights || []);
                this.isLoadingCognitive.set(false);
            },
            error: () => this.isLoadingCognitive.set(false)
        });
    }

    getSubjectWeight(subjectId: string): number {
        const found = this.cognitiveWeights().find(w => w.subject_id === subjectId);
        return found ? found.weight : 3;
    }

    updateSubjectWeight(subjectId: string, weight: number) {
        this.timetableService.setSubjectCognitiveWeight(subjectId, weight).subscribe({
            next: () => {
                this.loadCognitiveWeights();
            },
            error: (err) => {
                this.dialog.alert(err?.error?.error || 'Failed to update weight.', 'Error', 'danger');
            }
        });
    }

    // ═══════════════════════ TEMPLATES (Rec #8) ═══════════════════════
    openTemplateModal() {
        this.showTemplateModal.set(true);
        this.loadTemplates();
    }

    closeTemplateModal() {
        this.showTemplateModal.set(false);
    }

    loadTemplates() {
        this.isLoadingTemplates.set(true);
        this.timetableService.listTemplates().subscribe({
            next: (data) => {
                this.templates.set(data || []);
                this.isLoadingTemplates.set(false);
            },
            error: () => this.isLoadingTemplates.set(false)
        });
    }

    saveCurrentAsTemplate() {
        const name = this.draftTemplateName().trim() || `${this.selectedClass()?.name || 'Standard'} Template (${new Date().toLocaleDateString()})`;
        this.isSavingTemplate.set(true);
        this.timetableService.saveTemplate(name, false).subscribe({
            next: (tmpl) => {
                this.isSavingTemplate.set(false);
                this.draftTemplateName.set('');
                this.dialog.alert(`Template "${tmpl.name}" saved successfully.`, 'Template Created', 'info');
                this.loadTemplates();
            },
            error: (err) => {
                this.isSavingTemplate.set(false);
                this.dialog.alert(err?.error?.error || 'Failed to save template.', 'Error', 'danger');
            }
        });
    }

    applyTemplateToClasses(templateId: string) {
        const targetName = this.selectedClass() ? this.selectedClass()?.name : 'all classes';
        this.dialog.confirm(
            `Apply this template structure to ${targetName}?`,
            'Apply Template',
            'info',
            'Apply Structure'
        ).subscribe(confirmed => {
            if (confirmed) {
                const classIds = this.selectedClassId() ? [this.selectedClassId()] : [];
                this.timetableService.applyTemplate(templateId, classIds).subscribe({
                    next: (res) => {
                        this.dialog.alert(res.message, 'Template Applied', 'info');
                        this.onClassChange();
                        this.refreshAllClassCounts();
                        this.closeTemplateModal();
                    },
                    error: (err) => {
                        this.dialog.alert(err?.error?.error || 'Failed to apply template.', 'Error', 'danger');
                    }
                });
            }
        });
    }
}



