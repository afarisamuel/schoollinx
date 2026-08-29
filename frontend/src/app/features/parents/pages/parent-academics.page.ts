import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ReportService } from '../../../core/infrastructure/report/report.service';
import { Grade } from '../../../core/domain/grade.model';

@Component({
    selector: 'app-parent-academics',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './parent-academics.page.html'
})
export class ParentAcademicsPage {
    state = inject(ParentStateService);
    private reportService = inject(ReportService);

    isDownloading = signal<Record<string, boolean>>({});

    // Competency Framework (NaCCA / CBA)
    defaultCompetencies = [
        { name: 'Critical Thinking & Problem Solving', domain: 'Cognitive Excellence', score: 5, level: 'Exemplary', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Collaboration & Teamwork', domain: 'Social Leadership', score: 4, level: 'Proficient', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Digital & Research Literacy', domain: 'Modern Tools', score: 4, level: 'Proficient', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { name: 'Communication & Expression', domain: 'Language & Art', score: 5, level: 'Exemplary', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { name: 'Personal Development & Ethics', domain: 'Character', score: 4, level: 'Proficient', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' }
    ];

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

    getTranscriptHash(studentId?: string): string {
        if (!studentId) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        // Deterministic hash based on ID
        const clean = studentId.replace(/-/g, '');
        return `${clean}a7f920bc4839de2156ef89`.slice(0, 64);
    }

    downloadTranscript(studentId: string, studentName: string) {
        if (!studentId) return;
        this.isDownloading.update(m => ({ ...m, [studentId]: true }));

        this.reportService.downloadTranscript(studentId).subscribe({
            next: (blob) => {
                this.reportService.saveFile(blob, `${studentName.replace(/\s+/g, '_')}_Official_Transcript.pdf`);
                this.isDownloading.update(m => ({ ...m, [studentId]: false }));
            },
            error: () => {
                this.isDownloading.update(m => ({ ...m, [studentId]: false }));
            }
        });
    }
}
