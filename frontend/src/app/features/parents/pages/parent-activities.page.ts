import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-activities',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-activities.page.html'
})
export class ParentActivitiesPage {
    state = inject(ParentStateService);

    getAchievements(attPct: number, gpa: number, absences: number, hwCount: number) {
        const badges = [];
        if (attPct >= 95) badges.push({ icon: '🏆', label: 'Perfect Attendance' });
        if (attPct >= 80) badges.push({ icon: '⭐', label: 'Good Attendance' });
        if (gpa >= 80) badges.push({ icon: '🎓', label: 'Academic Excellence' });
        if (gpa >= 70) badges.push({ icon: '📚', label: 'Strong Performer' });
        if (hwCount > 0) badges.push({ icon: '✅', label: 'Active Learner' });
        if (absences === 0) badges.push({ icon: '🌟', label: 'Zero Absences' });
        return badges;
    }

    gradeLetter(score: number): string {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    streak(pct: number): number {
        if (pct >= 95) return 30;
        if (pct >= 90) return 20;
        if (pct >= 80) return 10;
        return 0;
    }
}
