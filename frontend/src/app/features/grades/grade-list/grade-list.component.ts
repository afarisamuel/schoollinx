import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Grade, GradeCategory } from '../../../core/domain/grade.model';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Student } from '../../../core/domain/student.model';

@Component({
    selector: 'app-grade-list',
    standalone: true,
    imports: [RouterLink, CommonModule, FormsModule],
    templateUrl: './grade-list.component.html',
    styleUrl: './grade-list.component.css',
})
export class GradeListComponent implements OnInit {
    grades = signal<Grade[]>([]);
    student = signal<Student | null>(null);
    studentId: string | null = null;
    isLoading = signal(true);

    // Filters
    selectedTerm = signal('');
    selectedCategory = signal('');

    private gradeService = inject(GradeService);
    private studentService = inject(StudentService);
    private route = inject(ActivatedRoute);
    private dialog = inject(DialogService);

    // Computed derived state
    allTerms = computed(() => [...new Set(this.grades().map(g => g.term))].sort());
    allSubjects = computed(() => [...new Set(this.grades().map(g => g.subject).filter(Boolean))]);
    categories: GradeCategory[] = ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL'];

    filteredGrades = computed(() => {
        let g = this.grades();
        if (this.selectedTerm()) g = g.filter(x => x.term === this.selectedTerm());
        if (this.selectedCategory()) g = g.filter(x => x.category === this.selectedCategory());
        return g;
    });

    stats = computed(() => {
        const g = this.filteredGrades();
        if (!g.length) return { avg: 0, best: 0, worst: 0, total: 0, passing: 0 };
        const scores = g.map(x => (x.score / (x.max_score || 100)) * 100);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
            avg: Math.round(avg * 10) / 10,
            best: Math.max(...scores),
            worst: Math.min(...scores),
            total: g.length,
            passing: scores.filter(s => s >= 50).length,
        };
    });

    subjectBreakdown = computed(() => {
        const g = this.filteredGrades();
        const map = new Map<string, { total: number; count: number }>();
        for (const grade of g) {
            const subject = grade.subject || 'Unknown';
            const pct = (grade.score / (grade.max_score || 100)) * 100;
            const existing = map.get(subject) || { total: 0, count: 0 };
            map.set(subject, { total: existing.total + pct, count: existing.count + 1 });
        }
        return Array.from(map.entries())
            .map(([name, { total, count }]) => ({ name, avg: Math.round((total / count) * 10) / 10 }))
            .sort((a, b) => b.avg - a.avg);
    });

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('studentId');
            if (id) {
                this.studentId = id;
                this.loadGrades(id);
                this.studentService.getStudent(id).subscribe(s => this.student.set(s));
            }
        });
    }

    loadGrades(studentId: string) {
        this.isLoading.set(true);
        this.gradeService.getGradesForStudent(studentId).subscribe({
            next: data => { this.grades.set(data); this.isLoading.set(false); },
            error: () => { this.grades.set([]); this.isLoading.set(false); }
        });
    }

    deleteGrade(id: string) {
        this.dialog.confirm('Are you sure you want to delete this grade record?', 'Delete Grade', 'danger', 'Delete').subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.gradeService.deleteGrade(id).subscribe(() => {
                    if (this.studentId) this.loadGrades(this.studentId);
                });
            }
        });
    }

    getScorePct(grade: Grade): number {
        return Math.min(100, Math.round((grade.score / (grade.max_score || 100)) * 100));
    }

    getGradeLabel(pct: number): string {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B';
        if (pct >= 60) return 'C';
        if (pct >= 50) return 'D';
        return 'F';
    }

    getCategoryIcon(cat: GradeCategory): string {
        const icons: Record<GradeCategory, string> = {
            ASSIGNMENT: '📝',
            QUIZ: '⚡',
            MIDTERM: '📊',
            FINAL: '🎓',
        };
        return icons[cat] ?? '📄';
    }

    getScoreClass(pct: number): string {
        if (pct >= 90) return 'excellent';
        if (pct >= 75) return 'good';
        if (pct >= 50) return 'average';
        return 'poor';
    }

    studentName = computed(() => {
        const s = this.student();
        return s ? `${s.first_name} ${s.last_name}` : 'Student';
    });
}
