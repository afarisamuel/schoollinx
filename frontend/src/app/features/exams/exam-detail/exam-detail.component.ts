import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExamService, Exam, ExamSchedule, ExamResult, ExamConflict } from '../../../core/infrastructure/exam/exam.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { forkJoin } from 'rxjs';

interface StudentScoreRow {
    student: Student;
    score: number | null;
    remarks: string;
}

@Component({
    selector: 'app-exam-detail',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule, RouterLink],
    templateUrl: './exam-detail.component.html'
})
export class ExamDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private examService = inject(ExamService);
    private classService = inject(ClassService);
    private studentService = inject(StudentService);
    private toast = inject(ToastService);

    exam = signal<Exam | null>(null);
    schedules = signal<ExamSchedule[]>([]);
    classes = signal<Class[]>([]);
    conflicts = signal<ExamConflict[]>([]);
    
    // State
    loading = signal(true);
    activeTab = signal<'schedules' | 'results' | 'conflicts'>('schedules');
    isSavingResults = signal(false);
    
    // Forms
    addingSchedule = signal(false);
    newSchedule = signal<Partial<ExamSchedule>>({ 
        subject: '', 
        class_id: '',
        room: '',
        date: '', 
        start_time: '09:00', 
        end_time: '11:00', 
        max_score: 100 
    });
    
    // Results Entry
    selectedScheduleId = signal<string | null>(null);
    selectedSchedule = computed(() => this.schedules().find(s => s.id === this.selectedScheduleId()));
    studentScores = signal<StudentScoreRow[]>([]);
    loadingStudents = signal(false);

    // Computed Stats for selected schedule
    scheduleStats = computed(() => {
        const rows = this.studentScores().filter(r => r.score !== null && !isNaN(r.score as number));
        if (rows.length === 0) return { count: 0, avg: 0, highest: 0, lowest: 0, passRate: 0 };

        const scores = rows.map(r => Number(r.score));
        const maxScore = this.selectedSchedule()?.max_score || 100;
        const passMark = maxScore * 0.5;

        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / scores.length) * 10) / 10;
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);
        const passCount = scores.filter(s => s >= passMark).length;
        const passRate = Math.round((passCount / scores.length) * 100);

        return { count: scores.length, avg, highest, lowest, passRate };
    });

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadExam(id);
        }
    }

    loadExam(id: string) {
        this.loading.set(true);
        forkJoin({
            exam: this.examService.getExam(id),
            schedules: this.examService.getSchedules(id),
            classes: this.classService.getClasses(),
            conflictsReport: this.examService.checkConflicts(id)
        }).subscribe({
            next: (data) => {
                this.exam.set(data.exam);
                this.schedules.set(data.schedules || []);
                this.classes.set(data.classes || []);
                this.conflicts.set(data.conflictsReport?.conflicts || []);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load exam details', err);
                this.toast.error('Failed to load examination details');
                this.loading.set(false);
            }
        });
    }

    saveSchedule() {
        const id = this.exam()?.id;
        const form = this.newSchedule();

        if (!id) return;
        if (!form.subject?.trim()) {
            this.toast.warning('Please enter a subject name');
            return;
        }
        if (!form.class_id) {
            this.toast.warning('Please select a target class');
            return;
        }
        if (!form.date) {
            this.toast.warning('Please pick an exam date');
            return;
        }

        this.examService.addSchedule(id, form).subscribe({
            next: () => {
                this.toast.success(`Schedule for ${form.subject} added`);
                this.addingSchedule.set(false);
                this.newSchedule.set({ 
                    subject: '', 
                    class_id: '',
                    room: '',
                    date: '', 
                    start_time: '09:00', 
                    end_time: '11:00', 
                    max_score: 100 
                });
                // Reload schedules & conflict check
                this.refreshSchedules(id);
            },
            error: (err) => {
                console.error('Failed to save schedule', err);
                this.toast.error('Failed to add exam schedule');
            }
        });
    }

    deleteSchedule(schedule: ExamSchedule, event?: Event) {
        if (event) event.stopPropagation();
        const examId = this.exam()?.id;
        if (!examId || !schedule.id) return;

        if (!confirm(`Are you sure you want to remove ${schedule.subject} from this exam cycle?`)) {
            return;
        }

        this.examService.deleteSchedule(examId, schedule.id).subscribe({
            next: () => {
                this.toast.success(`Schedule removed`);
                if (this.selectedScheduleId() === schedule.id) {
                    this.selectedScheduleId.set(null);
                    this.studentScores.set([]);
                }
                this.refreshSchedules(examId);
            },
            error: (err) => {
                console.error('Failed to delete schedule', err);
                this.toast.error('Failed to remove schedule');
            }
        });
    }

    refreshSchedules(examId: string) {
        this.examService.getSchedules(examId).subscribe(s => this.schedules.set(s || []));
        this.examService.checkConflicts(examId).subscribe(cr => this.conflicts.set(cr?.conflicts || []));
    }
    
    selectSchedule(id: string) {
        this.selectedScheduleId.set(id);
        this.activeTab.set('results');
        
        const schedule = this.schedules().find(s => s.id === id);
        if (!schedule || !schedule.class_id) return;

        this.loadingStudents.set(true);
        forkJoin({
            students: this.studentService.getStudentsByClass(schedule.class_id),
            results: this.examService.getResults(id)
        }).subscribe({
            next: ({ students, results }) => {
                const existingResultsMap = new Map<string, ExamResult>();
                (results || []).forEach(r => existingResultsMap.set(r.student_id, r));

                const rows: StudentScoreRow[] = (students || []).map(student => {
                    const studentId = student.id || '';
                    const saved = studentId ? existingResultsMap.get(studentId) : undefined;
                    return {
                        student,
                        score: saved ? saved.score : null,
                        remarks: saved ? saved.remarks : ''
                    };
                });

                this.studentScores.set(rows);
                this.loadingStudents.set(false);
            },
            error: (err) => {
                console.error('Failed to load roster or results', err);
                this.toast.error('Failed to load class roster for scores');
                this.loadingStudents.set(false);
            }
        });
    }

    saveAllResults() {
        const scheduleId = this.selectedScheduleId();
        if (!scheduleId) return;

        const maxScore = this.selectedSchedule()?.max_score || 100;
        const rows = this.studentScores();

        // Validate scores
        for (const row of rows) {
            if (row.score !== null && (row.score < 0 || row.score > maxScore)) {
                this.toast.warning(`Score for ${row.student.first_name} ${row.student.last_name} must be between 0 and ${maxScore}`);
                return;
            }
        }

        const payload: ExamResult[] = rows
            .filter(r => r.score !== null && !isNaN(r.score as number) && !!r.student.id)
            .map(r => ({
                id: '',
                exam_schedule_id: scheduleId,
                student_id: r.student.id as string,
                score: Number(r.score),
                remarks: r.remarks || ''
            }));

        this.isSavingResults.set(true);
        this.examService.submitResults(scheduleId, payload).subscribe({
            next: () => {
                this.toast.success(`Successfully saved scores for ${payload.length} students`);
                this.isSavingResults.set(false);
            },
            error: (err) => {
                console.error('Failed to submit results', err);
                this.toast.error('Failed to save student scores');
                this.isSavingResults.set(false);
            }
        });
    }

    getClassName(classId: string): string {
        const c = this.classes().find(cls => cls.id === classId);
        return c ? c.name : 'Unassigned Class';
    }
}
