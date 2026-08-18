import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendationService, LearningPath } from '../../../core/infrastructure/recommendation/recommendation.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-learning-path',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './learning-path.component.html',
    styleUrl: './learning-path.component.css'
})
export class LearningPathComponent implements OnInit {
    private recommendationService = inject(RecommendationService);
    private authService = inject(AuthService);
    private dialog = inject(DialogService);

    learningPath = signal<LearningPath | null>(null);
    isLoading = signal(true);
    isGenerating = signal(false);

    ngOnInit() {
        this.loadInsights();
    }

    loadInsights() {
        const studentId = this.authService.currentUserValue?.id;
        if (!studentId) return;

        this.isLoading.set(true);
        this.recommendationService.getLearningPath(studentId).subscribe({
            next: (path) => {
                // Only set if we actually have recommendations, otherwise keep null to show the "Generate" empty state
                if (path && path.recommendations && path.recommendations.length > 0) {
                    this.learningPath.set(path);
                } else {
                    this.learningPath.set(null);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load learning path', err);
                this.learningPath.set(null);
                this.isLoading.set(false);
            }
        });
    }

    refreshInsights() {
        const studentId = this.authService.currentUserValue?.id;
        if (!studentId) return;

        this.isGenerating.set(true);
        // Explicitly trigger the backend heuristic calculation for this specific student
        this.recommendationService.generateForStudent(studentId).subscribe({
            next: () => {
                // Wait briefly for transaction to clear, then reload the newly generated path
                setTimeout(() => {
                    this.loadInsights();
                    this.isGenerating.set(false);
                }, 1000);
            },
            error: (err) => {
                console.error('Failed to generate insights', err);
                this.isGenerating.set(false);
                this.dialog.alert('Failed to generate insights. Please try again later.', 'Generation Error', 'danger').subscribe();
            }
        });
    }
}
