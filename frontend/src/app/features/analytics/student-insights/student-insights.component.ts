import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsightsService, AcademicInsight, StudentSuccessScore } from '../../../core/infrastructure/insights/insights.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-student-insights',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './student-insights.component.html',
    styleUrl: './student-insights.component.css'
})
export class StudentInsightsComponent implements OnInit {
    private insightsService = inject(InsightsService);
    private authService = inject(AuthService);

    insights = signal<AcademicInsight[]>([]);
    score = signal<StudentSuccessScore | null>(null);

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        const studentId = this.authService.currentUserValue?.id;
        if (!studentId) return;

        this.insightsService.getStudentInsights(studentId).subscribe(data => {
            this.insights.set(data);
        });

        this.insightsService.getSuccessScore(studentId).subscribe(data => {
            this.score.set(data);
        });
    }
}
