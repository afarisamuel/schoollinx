import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';

@Component({
    selector: 'app-parent-activities',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-activities.page.html'
})
export class ParentActivitiesPage implements OnInit {
    state = inject(ParentStateService);
    private portalService = inject(ParentPortalService);

    houseLeaderboard = signal<any[]>([]);
    studentHouseMap = signal<Record<string, any>>({});

    ngOnInit() {
        this.loadHouseData();
    }

    loadHouseData() {
        this.portalService.getHouseLeaderboard().subscribe({
            next: (houses) => this.houseLeaderboard.set(houses || []),
            error: () => {}
        });

        const students = this.state.profile()?.students || [];
        for (const s of students) {
            if (s.id) {
                this.portalService.getStudentHouse(s.id).subscribe({
                    next: (house) => {
                        if (house) {
                            this.studentHouseMap.update(m => ({ ...m, [s.id!]: house }));
                        }
                    },
                    error: () => {}
                });
            }
        }
    }

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
