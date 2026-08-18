import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { PerformanceReview, StaffProfile } from '../../../core/domain/hr/hr.model';

type ReviewStatus = 'DRAFT' | 'EMPLOYEE_REVIEW' | 'COMPLETED';

@Component({
    selector: 'app-performance-reviews',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './performance-reviews.html',
})
export class PerformanceReviews implements OnInit {
    private http = inject(HttpClient);

    staffList = signal<StaffProfile[]>([]);
    reviews = signal<PerformanceReview[]>([]);
    loading = signal(true);
    selectedStaffId = signal('');
    showForm = signal(false);
    signingOffId = signal<string | null>(null);
    employeeComment = signal('');

    // Form fields
    formStaffId = '';
    formScore = 0;
    formReviewPeriod = '';
    formComments = '';
    formGoals = '';
    formStrengths = '';
    formAreasForImprovement = '';
    formRecommendation = 'RETAIN';

    ngOnInit() {
        this.loadStaff();
    }

    loadStaff() {
        this.http.get<StaffProfile[]>('/api/hr/staff').subscribe({
            next: (data) => {
                this.staffList.set(data || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    loadReviews(staffId: string) {
        this.selectedStaffId.set(staffId);
        this.loading.set(true);
        this.http.get<PerformanceReview[]>(`/api/hr/performance/${staffId}`).subscribe({
            next: (data) => {
                this.reviews.set(data || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    submitReview() {
        const review: Partial<PerformanceReview> = {
            staff_id: this.formStaffId,
            reviewer_id: '00000000-0000-0000-0000-000000000000',
            review_date: new Date().toISOString(),
            review_period: this.formReviewPeriod,
            score: this.formScore,
            comments: this.formComments,
            goals: this.formGoals,
            strengths: this.formStrengths,
            areas_for_improvement: this.formAreasForImprovement,
            recommendation: this.formRecommendation,
            status: 'DRAFT'
        };

        this.http.post<PerformanceReview>('/api/hr/performance', review).subscribe({
            next: () => {
                this.showForm.set(false);
                this.formScore = 0;
                this.formReviewPeriod = '';
                this.formComments = '';
                this.formGoals = '';
                this.formStrengths = '';
                this.formAreasForImprovement = '';
                this.formRecommendation = 'RETAIN';
                if (this.selectedStaffId()) this.loadReviews(this.selectedStaffId());
            },
            error: (err) => console.error(err)
        });
    }

    /** Manager sends to employee for sign-off: DRAFT → EMPLOYEE_REVIEW */
    sendForEmployeeReview(review: PerformanceReview) {
        this.http.put(`/api/hr/performance/${review.id}`, { ...review, status: 'EMPLOYEE_REVIEW' }).subscribe({
            next: () => this.loadReviews(this.selectedStaffId()),
            error: (err) => console.error(err)
        });
    }

    /** Employee signs off: EMPLOYEE_REVIEW → COMPLETED */
    completeReview(review: PerformanceReview) {
        const payload = { ...review, status: 'COMPLETED', employee_comments: this.employeeComment() };
        this.http.put(`/api/hr/performance/${review.id}`, payload).subscribe({
            next: () => {
                this.signingOffId.set(null);
                this.employeeComment.set('');
                this.loadReviews(this.selectedStaffId());
            },
            error: (err) => console.error(err)
        });
    }

    getScoreColor(score: number): string {
        if (score >= 4) return 'text-emerald-400';
        if (score >= 3) return 'text-amber-400';
        return 'text-rose-400';
    }

    getStatusClasses(status: string): string {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'EMPLOYEE_REVIEW': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    }
}
