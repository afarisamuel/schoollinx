import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExamService, Exam, ExamSchedule, ExamResult } from '../../../core/infrastructure/exam/exam.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { forkJoin } from 'rxjs';

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

    exam = signal<Exam | null>(null);
    schedules = signal<ExamSchedule[]>([]);
    classes = signal<Class[]>([]);
    
    // State
    loading = signal(true);
    activeTab = signal<'schedules' | 'results'>('schedules');
    
    // Forms
    addingSchedule = signal(false);
    newSchedule = signal<Partial<ExamSchedule>>({ subject: '', date: '', start_time: '', end_time: '', max_score: 100 });
    
    selectedScheduleId = signal<string | null>(null);
    results = signal<ExamResult[]>([]);
    
    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadExam(id);
        }
    }

    loadExam(id: string) {
        forkJoin({
            exam: this.examService.getExam(id),
            schedules: this.examService.getSchedules(id),
            classes: this.classService.getClasses()
        }).subscribe({
            next: (data) => {
                this.exam.set(data.exam);
                this.schedules.set(data.schedules);
                this.classes.set(data.classes);
                this.loading.set(false);
            }
        });
    }

    saveSchedule() {
        const id = this.exam()?.id;
        if (!id) return;
        this.examService.addSchedule(id, this.newSchedule()).subscribe({
            next: () => {
                this.addingSchedule.set(false);
                this.newSchedule.set({ subject: '', date: '', start_time: '', end_time: '', max_score: 100 });
                this.examService.getSchedules(id).subscribe(s => this.schedules.set(s));
            }
        });
    }
    
    selectSchedule(id: string) {
        this.selectedScheduleId.set(id);
        this.activeTab.set('results');
        this.examService.getResults(id).subscribe(r => this.results.set(r));
    }
}
