import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../../core/infrastructure/timetable/timetable.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { Room } from '../../../core/domain/facility.model';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';
import { ExamSession } from '../../../core/domain/timetable.model';

@Component({
    selector: 'app-exam-scheduler',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './exam-scheduler.component.html',
    styleUrl: './exam-scheduler.component.css'
})
export class ExamSchedulerComponent implements OnInit {
    private timetableService = inject(TimetableService);
    private classService = inject(ClassService);
    private periodService = inject(AcademicPeriodService);
    private subjectService = inject(SubjectService);
    private facilityService = inject(FacilityService);
    private platformId = inject(PLATFORM_ID);

    classes = signal<Class[]>([]);
    periods = signal<AcademicPeriod[]>([]);
    subjects = signal<Subject[]>([]);
    rooms = signal<Room[]>([]);
    examSessions = signal<ExamSession[]>([]);

    selectedClassId = signal('');
    selectedPeriodId = signal('');
    isGenerating = signal(false);
    isLoading = signal(false);
    successMsg = signal('');
    errorMsg = signal('');

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.classService.getClasses().subscribe(c => this.classes.set(c));
            this.periodService.getAll().subscribe(p => this.periods.set(p));
            this.subjectService.getSubjects().subscribe(s => this.subjects.set(s));
            this.facilityService.getRooms().subscribe(r => this.rooms.set(r));
        }
    }

    loadExamSchedule() {
        const cid = this.selectedClassId();
        if (!cid) {
            this.examSessions.set([]);
            return;
        }
        this.isLoading.set(true);
        this.timetableService.getExamSchedule(cid).subscribe({
            next: data => { this.examSessions.set(data); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
    }

    generate() {
        const pid = this.selectedPeriodId();
        if (!pid) { this.errorMsg.set('Select an academic period first.'); return; }
        this.isGenerating.set(true);
        this.errorMsg.set('');
        this.successMsg.set('');
        this.timetableService.generateExamSchedule(pid).subscribe({
            next: res => {
                this.successMsg.set(res.message || 'Exam schedule generated!');
                this.isGenerating.set(false);
                this.loadExamSchedule();
                setTimeout(() => this.successMsg.set(''), 4000);
            },
            error: e => {
                this.errorMsg.set(e.error?.error || 'Generation failed.');
                this.isGenerating.set(false);
            }
        });
    }

    getSubjectDetail(id: string): { name: string, code: string } {
        const sub = this.subjects().find(s => s.id === id);
        return sub ? { name: sub.name, code: sub.code } : { name: 'Unknown Subject', code: 'N/A' };
    }

    getRoomName(id: string): string {
        const r = this.rooms().find(room => room.id === id);
        return r ? r.name : 'Unknown Room';
    }
}

