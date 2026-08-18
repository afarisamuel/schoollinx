import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExamService, Exam } from '../../../core/infrastructure/exam/exam.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { AcademicPeriod } from '../../../core/domain/academic-period.model';

@Component({
    selector: 'app-exam-list',
    standalone: true,
    imports: [CommonModule, DatePipe, RouterLink, FormsModule],
    templateUrl: './exam-list.component.html'
})
export class ExamListComponent implements OnInit {
    private examService = inject(ExamService);
    private periodService = inject(AcademicPeriodService);
    
    exams = signal<Exam[]>([]);
    periods = signal<AcademicPeriod[]>([]);
    
    creatingExam = signal(false);
    newExam = signal<Partial<Exam>>({ title: '', description: '', academic_year: '', term: '', status: 'DRAFT' });

    selectedPeriodId = signal('');
    selectedTermIndex = signal(1);

    selectedPeriod = computed(() => this.periods().find(p => p.id === this.selectedPeriodId()));
    availableTerms = computed(() => {
        const p = this.selectedPeriod();
        if (!p) return [];
        return Array.from({ length: p.term_count }, (_, i) => i + 1);
    });

    ngOnInit() {
        this.loadExams();
        this.loadPeriods();
    }

    loadExams() {
        this.examService.getExams().subscribe({
            next: (data) => this.exams.set(data),
            error: (err) => console.error('Failed to load exams', err)
        });
    }

    loadPeriods() {
        this.periodService.getAll().subscribe({
            next: (data) => {
                this.periods.set(data);
                const activePeriod = data.find(p => p.is_active);
                if (activePeriod) {
                    this.selectedPeriodId.set(activePeriod.id);
                    this.selectedTermIndex.set(activePeriod.current_term || 1);
                }
            },
            error: (err) => console.error('Failed to load periods', err)
        });
    }

    createExam() {
        const payload = { ...this.newExam() };
        const p = this.selectedPeriod();
        if (p) {
            payload.academic_year = p.name;
            payload.term = `${p.term_type} ${this.selectedTermIndex()}`;
        }
        
        this.examService.createExam(payload).subscribe({
            next: () => {
                this.creatingExam.set(false);
                this.newExam.set({ title: '', description: '', academic_year: '', term: '', status: 'DRAFT' });
                this.selectedPeriodId.set('');
                this.selectedTermIndex.set(1);
                this.loadExams();
            }
        });
    }
}

