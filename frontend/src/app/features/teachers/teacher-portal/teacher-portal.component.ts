import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdbService } from '../../../core/infrastructure/pwa/idb.service';
import {
    TeacherPortalService,
    TeacherAssignment,
    GradeEntry
} from '../../../core/infrastructure/teacher/teacher-portal.service';
import { ClassService } from '../../../core/infrastructure/curriculum/class.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';

@Component({
    selector: 'app-teacher-portal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './teacher-portal.component.html',
    styleUrl: './teacher-portal.component.css'
})
export class TeacherPortalComponent implements OnInit {
    private portalService = inject(TeacherPortalService);
    private classService = inject(ClassService);
    private idbService = inject(IdbService);
    private periodService = inject(AcademicPeriodService);

    teacher = signal<any>(null);
    assignments = signal<TeacherAssignment[]>([]);
    selectedAssignment = signal<TeacherAssignment | null>(null);
    students = signal<any[]>([]);
    gradeRows = signal<GradeEntry[]>([]);
    existingGrades = signal<any[]>([]);

    isLoading = signal(false);
    isSaving = signal(false);
    successMsg = signal('');
    errorMsg = signal('');
    term = signal('');
    terms = signal<string[]>([]);
    activePeriodName = signal('');

    // Phase 18 State
    categories = ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL'];
    weights = signal<any[]>([]);
    gpaList = signal<any[]>([]);
    isWeightDrawerOpen = signal(false);

    curveDialog = signal(false);
    curveMethod = signal('SQRT');
    curveFactor = signal(0);

    activeHistoryGradeId = signal<string | null>(null);
    historyLogs = signal<any[]>([]);

    // Grid System State
    gradeColumns = signal<{ name: string; weight: number }[]>([]);
    gradeGrid = signal<Record<string, number[]>>({}); // studentId -> scores[]
    studentStats = signal<Record<string, { total: number; rank: number }>>({});
    
    // UI Helpers
    columnCount = signal(3);

    // Phase 19: Term Locks & Export
    isTermLocked = signal(false);
    exportingPDF = signal(false);

    previewFile = signal<File | null>(null);
    csvImporting = signal(false);

    // Evaluation State
    evalDialog = signal(false);
    evalStudent = signal<any>(null);
    evalData = signal<any>({});
    isEvalLoading = signal(false);
    isEvalSaving = signal(false);

    ngOnInit() {
        this.isLoading.set(true);
        this.loadPeriods();
        this.portalService.getMyClasses().subscribe({
            next: (resp) => {
                this.teacher.set(resp.teacher);
                this.assignments.set(resp.assignments);
                this.isLoading.set(false);
            },
            error: () => {
                this.errorMsg.set('Could not load your class assignments. Ensure your teacher profile is linked to your account.');
                this.isLoading.set(false);
            }
        });
    }

    loadPeriods() {
        this.periodService.getAll().subscribe({
            next: (data) => {
                const activePeriod = data.find(p => p.is_active);
                if (activePeriod) {
                    this.activePeriodName.set(activePeriod.name);
                    const generatedTerms = Array.from({ length: activePeriod.term_count }, (_, i) => `${activePeriod.term_type} ${i + 1}`);
                    this.terms.set(generatedTerms);
                    this.term.set(`${activePeriod.term_type} ${activePeriod.current_term || 1}`);
                } else {
                    this.terms.set(['Term 1', 'Term 2', 'Term 3']);
                    this.term.set('Term 1');
                }
            },
            error: (err) => console.error('Failed to load periods', err)
        });
    }

    selectClass(assignment: TeacherAssignment) {
        this.selectedAssignment.set(assignment);
        this.successMsg.set('');
        this.errorMsg.set('');
        const classId = assignment.class_id;

        this.portalService.getClassStudents(classId).subscribe(students => {
            this.students.set(students);
            // Initialize Grid Configuration (3 default columns)
            this.setupGrid(this.columnCount());
        });

        // Load existing grades for this class to show history
        this.portalService.getClassGrades(classId).subscribe(grades => {
            this.existingGrades.set(grades);
        });

        // Load specific Phase 18 features (Weights and GPA)
        this.loadWeights(classId);
        this.loadGPA(classId);

        // Phase 19: Check Term Lock
        this.checkTermLock(classId, this.term());
    }

    checkTermLock(classId: string, term: string) {
        this.classService.getClassLocks(classId).subscribe(locks => {
            const lock = locks.find((l: { term: string; }) => l.term === term);
            this.isTermLocked.set(lock ? lock.is_locked : false);
        });
    }

    setTerm(t: string) {
        this.term.set(t);
        const classId = this.selectedAssignment()?.class_id;
        if (classId) {
            this.checkTermLock(classId, t);
        }
    }

    loadWeights(classId: string) {
        this.portalService.getClassWeights(classId).subscribe(w => {
            if (w.length === 0) {
                // Default fallback weights
                this.weights.set([
                    { category: 'ASSIGNMENT', weight: 0.2 },
                    { category: 'QUIZ', weight: 0.2 },
                    { category: 'MIDTERM', weight: 0.2 },
                    { category: 'FINAL', weight: 0.4 }
                ]);
            } else {
                this.weights.set(w);
            }
        });
    }

    loadGPA(classId: string) {
        this.portalService.getClassGPA(classId).subscribe(gpa => this.gpaList.set(gpa));
    }

    getStudentGPA(studentId: string): number | null {
        const studentGpa = this.gpaList().find(g => g.student_id === studentId);
        return studentGpa ? studentGpa.gpa : null;
    }

    setupGrid(count: number) {
        this.columnCount.set(count);
        const newCols = Array.from({ length: count }, (_, i) => ({
            name: `Assessment ${i + 1}`,
            weight: Number((1 / count).toFixed(2))
        }));
        this.gradeColumns.set(newCols);

        // Initialize grid values
        const grid: Record<string, number[]> = {};
        this.students().forEach(s => {
            grid[s.id] = new Array(count).fill(0);
        });
        this.gradeGrid.set(grid);
        this.runCalculations();
    }

    updateScore(studentId: string, colIndex: number, value: any) {
        const score = parseFloat(value) || 0;
        const grid = { ...this.gradeGrid() };
        if (!grid[studentId]) grid[studentId] = new Array(this.gradeColumns().length).fill(0);
        grid[studentId][colIndex] = score;
        this.gradeGrid.set(grid);
        this.runCalculations();
    }

    updateColumnName(index: number, name: string) {
        const cols = [...this.gradeColumns()];
        cols[index].name = name;
        this.gradeColumns.set(cols);
    }

    updateColumnWeight(index: number, weight: any) {
        const cols = [...this.gradeColumns()];
        cols[index].weight = parseFloat(weight) || 0;
        this.gradeColumns.set(cols);
        this.runCalculations();
    }

    runCalculations() {
        const cols = this.gradeColumns();
        const grid = this.gradeGrid();
        const stats: Record<string, { total: number; rank: number }> = {};
        
        // 1. Calculate Totals
        const studentTotals: { id: string; total: number }[] = [];

        this.students().forEach(s => {
            const scores = grid[s.id] || [];
            let total = 0;
            cols.forEach((c, i) => {
                total += (scores[i] || 0) * c.weight;
            });
            stats[s.id] = { total: parseFloat(total.toFixed(2)), rank: 0 };
            studentTotals.push({ id: s.id, total: stats[s.id].total });
        });

        // 2. Calculate Ranks
        studentTotals.sort((a, b) => b.total - a.total);
        studentTotals.forEach((item, index) => {
            // Handle ties
            if (index > 0 && item.total === studentTotals[index - 1].total) {
                stats[item.id].rank = stats[studentTotals[index - 1].id].rank;
            } else {
                stats[item.id].rank = index + 1;
            }
        });

        this.studentStats.set(stats);
    }

    getStudentName(studentId: string): string {
        const s = this.students().find(st => st.id === studentId);
        return s ? `${s.first_name} ${s.last_name}` : `Student #${studentId}`;
    }

    getExistingScore(studentId: string, category: string): number | null {
        const grade = this.existingGrades().find(
            g => g.student_id === studentId && g.subject === this.selectedAssignment()?.subject_id && g.term === this.term() && g.category === category
        );
        return grade ? grade.score : null;
    }

    getExistingGradeId(studentId: string, category: string): string | null {
        const grade = this.existingGrades().find(
            g => g.student_id === studentId && g.subject === this.selectedAssignment()?.subject_id && g.term === this.term() && g.category === category
        );
        return grade ? grade.id : null;
    }

    submitGrades() {
        const assignment = this.selectedAssignment();
        if (!assignment) return;
        const classId = assignment.class_id;
        
        // Flatten grid into GradeEntry array
        const grid = this.gradeGrid();
        const cols = this.gradeColumns();
        const entries: GradeEntry[] = [];

        Object.keys(grid).forEach(studentId => {
            grid[studentId].forEach((score, i) => {
                entries.push({
                    student_id: studentId,
                    subject: assignment.subject_id,
                    category: cols[i].name as any,
                    score: score,
                    max_score: 100,
                    term: this.term(),
                    remarks: `Weight: ${cols[i].weight * 100}%`
                });
            });
        });

        this.isSaving.set(true);

        // Phase 19: Offline Handling
        if (!navigator.onLine) {
            this.idbService.saveOfflineGrades(classId, entries).then(() => {
                this.isSaving.set(false);
                this.successMsg.set('⚠️ Saved Offline! These grades will automatically sync when network access is restored.');
                setTimeout(() => this.successMsg.set(''), 5000);
            }).catch(() => {
                this.errorMsg.set('Failed to save to device offline storage.');
                this.isSaving.set(false);
            });
            return;
        }

        this.portalService.bulkSubmitGrades(classId, entries).subscribe({
            next: (res) => {
                this.successMsg.set(`✅ Successfully saved and synchronized ${res.count} scores.`);
                this.isSaving.set(false);
                // Reload existing grades and stats
                this.portalService.getClassGrades(classId).subscribe(grades => {
                    this.existingGrades.set(grades);
                    this.loadGPA(classId);
                });
            },
            error: (e) => {
                this.errorMsg.set(e.error?.error || 'Failed to save grades.');
                this.isSaving.set(false);
            }
        });
    }

    saveWeights() {
        const classId = this.selectedAssignment()?.class_id;
        if (!classId) return;

        // Ensure total sum is exactly 1.0
        const total = this.weights().reduce((sum, w) => sum + w.weight, 0);
        if (Math.abs(total - 1.0) > 0.01) {
            this.errorMsg.set('Weights must sum to 1.0 (100%)');
            return;
        }

        this.portalService.updateClassWeights(classId, this.weights()).subscribe({
            next: () => {
                this.successMsg.set('✅ Class weights updated successfully.');
                this.isWeightDrawerOpen.set(false);
                this.loadGPA(classId); // refresh GPA calculation
            },
            error: (e) => this.errorMsg.set(e.error?.error || 'Failed to update weights')
        });
    }

    applyCurve() {
        const classId = this.selectedAssignment()?.class_id;
        if (!classId) return;

        this.portalService.curveGrades(classId, this.term(), this.curveMethod(), this.curveFactor()).subscribe({
            next: () => {
                this.successMsg.set(`✅ Grades curved using ${this.curveMethod()} successfully.`);
                this.curveDialog.set(false);
                this.portalService.getClassGrades(classId).subscribe(grades => this.existingGrades.set(grades));
                this.loadGPA(classId);
            },
            error: (e) => this.errorMsg.set(e.error?.error || 'Failed to curve grades')
        });
    }

    viewHistory(gradeId: string) {
        if (this.activeHistoryGradeId() === gradeId) {
            this.activeHistoryGradeId.set(null); // toggle off
            return;
        }
        this.activeHistoryGradeId.set(gradeId);
        this.portalService.getGradeHistory(gradeId).subscribe(logs => this.historyLogs.set(logs));
    }

    onFileSelected(event: any) {
        this.previewFile.set(event.target.files[0] || null);
    }

    exportGradebook() {
        if (!this.selectedAssignment() || this.exportingPDF()) return;
        const classId = this.selectedAssignment()!.class_id;

        this.exportingPDF.set(true);
        this.portalService.exportGradesPDF(classId, this.term()).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gradebook-${classId}-${this.term().replace(/\s+/g, '-')}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.exportingPDF.set(false);
                this.successMsg.set('Gradebook exported successfully.');
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: () => {
                this.errorMsg.set('Failed to generate PDF. Make sure grades exist for this term.');
                this.exportingPDF.set(false);
                window.scrollTo(0, 0);
            }
        });
    }

    uploadCSV() {
        const classId = this.selectedAssignment()?.class_id;
        const file = this.previewFile();
        if (!classId || !file) return;

        this.csvImporting.set(true);
        this.portalService.importGradesCSV(classId, file).subscribe({
            next: (res) => {
                this.successMsg.set(`✅ CSV Imported: ${res.imported} scores saved.`);
                if (res.failures?.length) {
                    this.errorMsg.set(`Warnings: ${res.failures.join(', ')}`);
                }
                this.csvImporting.set(false);
                this.previewFile.set(null);
                this.portalService.getClassGrades(classId).subscribe(grades => this.existingGrades.set(grades));
                this.loadGPA(classId);
            },
            error: (e: any) => {
                this.errorMsg.set(e.error?.error || 'CSV import failed');
                this.csvImporting.set(false);
            }
        });
    }

    downloadTemplate() {
        const rows = [
            ["student_id", "subject", "category", "score", "max_score", "term", "remarks"],
            ["ID", this.selectedAssignment()?.subject_id || "Math", "ASSIGNMENT", "85", "100", this.term(), "Great job"]
        ];
        let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "grade_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    openEvaluation(student: any) {
        this.evalStudent.set(student);
        this.evalDialog.set(true);
        this.isEvalLoading.set(true);
        
        const classId = this.selectedAssignment()?.class_id;
        if (!classId) return;

        // Note: Period ID logic assumes fake or real ID fetched elsewhere. We mock it for now like in student profile
        const dummyPeriodId = '00000000-0000-0000-0000-000000000000';
        const dummyTermId = '00000000-0000-0000-0000-000000000000';

        this.portalService.getStudentEvaluation(classId, student.id, dummyPeriodId, dummyTermId).subscribe({
            next: (data) => {
                this.evalData.set(data);
                this.isEvalLoading.set(false);
            },
            error: () => {
                this.errorMsg.set('Failed to load evaluation');
                this.isEvalLoading.set(false);
                this.closeEvaluation();
            }
        });
    }

    closeEvaluation() {
        this.evalDialog.set(false);
        this.evalStudent.set(null);
        this.evalData.set({});
    }

    saveEvaluation() {
        const classId = this.selectedAssignment()?.class_id;
        const student = this.evalStudent();
        if (!classId || !student) return;

        this.isEvalSaving.set(true);
        this.portalService.updateStudentEvaluation(classId, student.id, this.evalData()).subscribe({
            next: () => {
                this.isEvalSaving.set(false);
                this.successMsg.set(`✅ Evaluation saved for ${student.first_name}`);
                this.closeEvaluation();
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (e) => {
                this.errorMsg.set(e.error?.error || 'Failed to save evaluation');
                this.isEvalSaving.set(false);
            }
        });
    }

    back() {
        this.selectedAssignment.set(null);
        this.students.set([]);
        this.gradeRows.set([]);
        this.existingGrades.set([]);
        this.gpaList.set([]);
        this.errorMsg.set('');
        this.successMsg.set('');
    }

    // Phase 19: PWA Sync Listener
    @HostListener('window:online')
    onNetworkOnline() {
        this.idbService.getPendingGrades().then(queues => {
            if (queues && queues.length > 0) {
                this.successMsg.set('Network connection restored. Flushing outstanding offline grades to the server...');
                for (const q of queues) {
                    this.portalService.bulkSubmitGrades(q.classId, q.grades).subscribe({
                        next: () => {
                            this.idbService.clearPendingGrades(q.classId);
                            if (this.selectedAssignment()?.class_id === q.classId) {
                                this.portalService.getClassGrades(q.classId).subscribe(grades => this.existingGrades.set(grades));
                                this.loadGPA(q.classId);
                            }
                        },
                        error: () => this.errorMsg.set(`Background sync failed for a previous class (ID #${q.classId}). Check later.`)
                    });
                }
            }
        });
    }
}
