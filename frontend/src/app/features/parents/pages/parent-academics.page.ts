import { Component, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ReportService, CompetencyEvaluationItem } from '../../../core/infrastructure/report/report.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Grade } from '../../../core/domain/grade.model';

@Component({
    selector: 'app-parent-academics',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './parent-academics.page.html'
})
export class ParentAcademicsPage implements OnInit {
    state = inject(ParentStateService);
    private reportService = inject(ReportService);
    private subjectService = inject(SubjectService);

    isDownloading = signal<Record<string, boolean>>({});
    dbSubjects = signal<Subject[]>([]);
    loadingSubjects = signal(true);
    competenciesMap = signal<Record<string, CompetencyEvaluationItem[]>>({});

    // Active Tab & Ward Selection State
    activeTab = signal<'subjects' | 'competencies' | 'homework' | 'transcript' | 'insights'>('subjects');
    selectedStudentId = signal<string>('');

    selectedStudent = computed(() => {
        const students = this.state.profile()?.students || [];
        if (!students.length) return null;
        return students.find(s => s.id === this.selectedStudentId()) || students[0];
    });

    constructor() {
        effect(() => {
            const profile = this.state.profile();
            if (profile?.students && profile.students.length > 0) {
                if (!this.selectedStudentId()) {
                    this.selectedStudentId.set(profile.students[0].id || '');
                }
                profile.students.forEach(s => {
                    const sid = s.id;
                    if (sid && !this.competenciesMap()[sid]) {
                        this.reportService.getCompetencyEvaluations(sid).subscribe({
                            next: (evals) => {
                                this.competenciesMap.update(m => ({ ...m, [sid]: evals || [] }));
                            },
                            error: () => {
                                this.competenciesMap.update(m => ({ ...m, [sid]: [] }));
                            }
                        });
                    }
                });
            }
        });
    }

    ngOnInit() {
        this.loadDatabaseSubjects();
    }

    loadDatabaseSubjects() {
        this.loadingSubjects.set(true);
        this.subjectService.getSubjects().subscribe({
            next: (subs) => {
                this.dbSubjects.set(subs || []);
                this.loadingSubjects.set(false);
            },
            error: () => {
                this.dbSubjects.set([]);
                this.loadingSubjects.set(false);
            }
        });
    }

    getStudentRemarks(student: any, gpa: number): string {
        if (gpa >= 80) {
            return `${student.first_name} exhibits remarkable academic leadership, consistently scoring in the upper percentile across assessments. Independent critical problem-solving and classroom curiosity are exemplary.`;
        }
        if (gpa >= 65) {
            return `${student.first_name} has demonstrated commendable academic diligence this term, exhibiting strong engagement across core subjects. Punctuality and classroom collaboration have been exemplary.`;
        }
        return `${student.first_name} is actively engaged in current term coursework. Continuous classroom assessments and homework deliverables are being recorded by subject tutors.`;
    }

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
