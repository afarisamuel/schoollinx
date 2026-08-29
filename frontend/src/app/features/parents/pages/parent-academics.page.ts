import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { Grade } from '../../../core/domain/grade.model';

@Component({
    selector: 'app-parent-academics',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-academics.page.html'
})
export class ParentAcademicsPage {
    state = inject(ParentStateService);

    today() { return new Date().toISOString().slice(0, 10); }

    dueSoon(dueDate: string): boolean {
        const t = this.today();
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return dueDate >= t && dueDate <= soon;
    }

    gradesBySubject(grades: Grade[]): Record<string, Grade[]> {
        return grades.reduce((acc, g) => {
            const s = g.subject || 'Unknown';
            if (!acc[s]) acc[s] = [];
            acc[s].push(g);
            return acc;
        }, {} as Record<string, Grade[]>);
    }

    subjectAvg(grades: Grade[]): number {
        if (!grades.length) return 0;
        return Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length * 10) / 10;
    }

    gradeLetter(score: number): string {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    gradeLetterClass(score: number): string {
        if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (score >= 65) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (score >= 50) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }

    objectKeys(obj: Record<string, any>): string[] { return Object.keys(obj || {}); }
}
