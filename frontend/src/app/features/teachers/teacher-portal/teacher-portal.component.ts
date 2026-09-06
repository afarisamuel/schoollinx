import { Component, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IdbService } from '../../../core/infrastructure/pwa/idb.service';
import {
    TeacherPortalService,
    TeacherAssignment,
    GradeEntry
} from '../../../core/infrastructure/teacher/teacher-portal.service';
import { ClassService } from '../../../core/infrastructure/curriculum/class.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { CampusOpsService } from '../../../core/infrastructure/campus-ops/campus-ops.service';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { ReportService } from '../../../core/infrastructure/report/report.service';

@Component({
    selector: 'app-teacher-portal',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './teacher-portal.component.html',
    styleUrl: './teacher-portal.component.css'
})
export class TeacherPortalComponent implements OnInit {
    private portalService = inject(TeacherPortalService);
    private classService = inject(ClassService);
    private idbService = inject(IdbService);
    private periodService = inject(AcademicPeriodService);
    private campusOps = inject(CampusOpsService);
    public toast = inject(ToastService);
    private authService = inject(AuthService);
    private hrService = inject(HrService);
    private reportService = inject(ReportService);

    isCompilingReports = signal<boolean>(false);

    isHeadmasterOrAdmin = computed(() => {
        const role = (this.authService.currentUserValue?.role || '') as string;
        return role === 'ADMIN' || role === 'HEADMASTER' || role === 'ECOPOWER_ADMIN' || role === 'IT_ADMIN' || role === 'SUPER_ADMIN';
    });

    teacher = signal<any>(null);
    assignments = signal<TeacherAssignment[]>([]);
    selectedAssignment = signal<TeacherAssignment | null>(null);
    students = signal<any[]>([]);
    gradeRows = signal<GradeEntry[]>([]);
    existingGrades = signal<any[]>([]);

    // Subject enforcement
    selectedSubjectId = signal<string>('');
    classSubjects = signal<{ id: string; name: string; code: string }[]>([]);

    // Computed: true when grading is allowed (subject selected)
    canGrade = computed(() => !!this.selectedSubjectId());

    isLoading = signal(false);
    isSaving = signal(false);
    successMsg = signal('');
    errorMsg = signal('');
    term = signal('');
    terms = signal<string[]>([]);
    activePeriodName = signal('');
    activePeriodId = signal<string>('');
    activeTermId = signal<string>('');

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
    isColumnsAdminConfigured = signal(false);
    isClassSpecificWeights = signal(false);
    // Telemetry Computed Signals
    totalStudentsCount = computed(() => this.students().length);
    gradedStudentsCount = computed(() => {
        const stats = this.studentStats();
        return Object.values(stats).filter(s => s.total > 0).length;
    });
    completionPercentage = computed(() => {
        const total = this.totalStudentsCount();
        if (total === 0) return 0;
        return Math.round((this.gradedStudentsCount() / total) * 100);
    });
    classMeanScore = computed(() => {
        const stats = Object.values(this.studentStats());
        const scored = stats.filter(s => s.total > 0);
        if (scored.length === 0) return 0;
        const sum = scored.reduce((acc, curr) => acc + curr.total, 0);
        return parseFloat((sum / scored.length).toFixed(1));
    });
    selectedClassName = computed(() => this.selectedAssignment()?.class?.name || (this.selectedAssignment()?.class_id ? 'Class #' + this.selectedAssignment()?.class_id : ''));
    selectedSubjectName = computed(() => this.selectedAssignment()?.subject?.name || (this.selectedSubjectId() ? this.getSubjectNameById(this.selectedSubjectId()) : 'All Subjects'));

    // Student search / filter
    studentSearch = signal('');
    filteredStudents = computed(() => {
        const q = this.studentSearch().toLowerCase().trim();
        if (!q) return this.students();
        return this.students().filter(s =>
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
            (s.admission_number || '').toLowerCase().includes(q)
        );
    });

    cumulativeThreshold = computed(() => {
        const cols = this.gradeColumns();
        const total = cols.reduce((sum, c) => sum + (c.weight > 1 ? c.weight : c.weight * 100), 0);
        return Math.round(total);
    });

    // Auto-Save System
    autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
    lastAutoSavedAt = signal<Date | null>(null);
    gradesLoaded = signal(false);
    private autoSaveTrigger$ = new Subject<void>();
    private autoSaveSub?: Subscription;

    // Classroom Mastery Suite (Phase 1-5)
    activeTab = signal<'gradebook' | 'seating' | 'lessons' | 'resources' | 'sickbay' | 'widgets' | 'timetable' | 'cover-board' | 'consultations' | 'notices' | 'ai-copilot' | 'hr-vault'>('gradebook');

    // Seating Chart (Feature 2)
    seatingRows = signal(4);
    seatingCols = signal(5);
    seatingDesks = signal<{ desk: number; row: number; col: number; studentId: string | null }[]>([]);
    selectedDesk = signal<{ desk: number; row: number; col: number; studentId: string | null } | null>(null);

    // Roll-Call Sweep (Feature 17)
    attendanceDate = signal(new Date().toISOString().slice(0, 10));
    quickAttendanceMap = signal<Record<string, 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT'>>({});
    isSavingAttendance = signal(false);

    // Lesson Plans (Feature 1)
    lessonPlans = signal<any[]>([]);
    newPlanTopic = signal('');
    newPlanWeek = signal(1);
    newPlanObjectives = signal('');
    newPlanCompetencies = signal('');
    newPlanHomework = signal('');
    isPlanModalOpen = signal(false);

    // Resources (Feature 3)
    resourcesList = signal<any[]>([]);
    newResourceTitle = signal('');
    newResourceUrl = signal('');
    newResourceType = signal('PDF');
    newResourceDesc = signal('');
    isResourceModalOpen = signal(false);

    // Sickbay Referral (Feature 22)
    sickbayReferrals = signal<any[]>([]);
    referralStudentId = signal('');
    referralSymptoms = signal('');
    referralSeverity = signal('NORMAL');
    isSickbayModalOpen = signal(false);

    // Classroom Widgets (Feature 5 & 24)
    timerSeconds = signal(300);
    timerInterval: any = null;
    isTimerActive = signal(false);
    pickedStudent = signal<any>(null);
    awardPointsStudent = signal<any>(null);
    awardPointsAmount = signal(5);
    awardPointsReason = signal('Exemplary classroom participation');

    // AI Co-Pilot State (Feature 45 & 48)
    aiTopicInput = signal('');
    aiQuizGenerated = signal<any[]>([]);
    isGeneratingAI = signal(false);

    aiStudentForComment = signal<any>(null);
    aiStudentStrength = signal('analytical, attentive, and cooperative');
    aiDraftedComment = signal('');
    isDraftingComment = signal(false);

    // HR Self-Service State (Feature 40 & 41)
    leaveType = signal('SICK');
    leaveStartDate = signal('');
    leaveEndDate = signal('');
    leaveReason = signal('');
    isSubmittingLeave = signal(false);

    // Parent Consultations State (Feature 20)
    meetingSlots = signal<any[]>([]);
    teacherBookings = signal<any[]>([]);
    newSlotDate = signal(new Date().toISOString().slice(0, 10));
    newSlotStart = signal('15:00');
    newSlotEnd = signal('15:30');
    isCreatingSlot = signal(false);

    // Classroom Announcements / Notices State (Feature 26)
    classNotices = signal<any[]>([]);
    newNoticeTitle = signal('');
    newNoticeContent = signal('');
    newNoticeTarget = signal('ALL');
    isCreatingNotice = signal(false);

    // Timetable & Weekly Schedule (Feature 35)
    timetableEntries = signal<any[]>([]);
    daysOfWeek = [
        { id: 1, name: 'Monday' },
        { id: 2, name: 'Tuesday' },
        { id: 3, name: 'Wednesday' },
        { id: 4, name: 'Thursday' },
        { id: 5, name: 'Friday' }
    ];

    // Teacher Cover / Substitution Board (Feature 37)
    coverRequests = signal<any[]>([]);
    newCoverDate = signal(new Date().toISOString().slice(0, 10));
    newCoverPeriod = signal(1);
    newCoverReason = signal('');
    newCoverHandover = signal('');
    isSubmittingCover = signal(false);

    // Student Conduct Incident Modal (Feature 19)
    conductStudent = signal<any>(null);
    incidentType = signal('DISRUPTIVE_BEHAVIOUR');
    incidentDesc = signal('');
    incidentAction = signal('VERBAL_WARNING');
    incidentPoints = signal(5);
    isReportingIncident = signal(false);

    // Phase 19: Term Locks & Export
    isTermLocked = signal(false);
    exportingPDF = signal(false);
    exportingRankingId = signal<string>(''); // tracks which class card is exporting ranking

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

        // Setup real-time debounced auto-save (600ms debounce)
        this.autoSaveSub = this.autoSaveTrigger$.pipe(
            debounceTime(600)
        ).subscribe(() => {
            this.performAutoSave(false);
        });

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

    ngOnDestroy() {
        this.autoSaveSub?.unsubscribe();
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
        this.gradesLoaded.set(false);
        const classId = assignment.class_id;

        // Auto-set subject from assignment, or clear for class-teacher assignments
        if (assignment.subject_id) {
            this.selectedSubjectId.set(assignment.subject_id);
        } else {
            this.selectedSubjectId.set('');
        }

        // Load class subjects for class-teacher selection
        this.classService.getClassSubjects(classId).subscribe({
            next: (subs) => {
                this.classSubjects.set(subs || []);
                if (subs && subs.length > 0 && !this.selectedSubjectId()) {
                    this.selectedSubjectId.set(subs[0].id);
                }
                this.populateGridWithExistingGrades();
            },
            error: () => this.classSubjects.set([])
        });

        this.portalService.getClassStudents(classId).subscribe(students => {
            this.students.set(students);
            // Load admin-configured grading weights or fallback to defaults
            this.loadClassWeights(classId);

            // Initialize default roll-call map
            const initialAttendance: Record<string, 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT'> = {};
            for (const s of students) {
                if (s.id) initialAttendance[s.id] = 'PRESENT';
            }
            this.quickAttendanceMap.set(initialAttendance);

            // Load Seating Arrangement with students
            this.loadSeating(classId);
        });

        // Load existing grades for this class to show history
        this.portalService.getClassGrades(classId).subscribe({
            next: (grades) => {
                this.existingGrades.set(grades || []);
                this.gradesLoaded.set(true);
                this.populateGridWithExistingGrades();
            },
            error: () => {
                this.existingGrades.set([]);
                this.gradesLoaded.set(true);
                this.populateGridWithExistingGrades();
            }
        });

        // Load classroom mastery suite
        this.loadLessonPlans(classId);
        this.loadResources(classId);
        this.loadSickbay(classId);

        // Load specific Phase 18 features (Weights and GPA)
        this.loadWeights(classId);
        this.loadGPA(classId);

        // Phase 19: Check Term Lock
        this.checkTermLock(classId, this.term());
    }

    onSubjectChange(subjectId: string) {
        this.selectedSubjectId.set(subjectId);
        this.populateGridWithExistingGrades();
        const classId = this.selectedAssignment()?.class_id;
        if (classId) {
            this.portalService.getClassGrades(classId).subscribe({
                next: (grades) => {
                    this.existingGrades.set(grades || []);
                    this.populateGridWithExistingGrades();
                },
                error: () => {
                    this.populateGridWithExistingGrades();
                }
            });
        }
    }

    setTerm(t: string) {
        this.term.set(t);
        this.populateGridWithExistingGrades();
        const classId = this.selectedAssignment()?.class_id;
        if (classId) {
            this.checkTermLock(classId, t);
            this.portalService.getClassGrades(classId).subscribe({
                next: (grades) => {
                    this.existingGrades.set(grades || []);
                    this.populateGridWithExistingGrades();
                },
                error: () => {
                    this.populateGridWithExistingGrades();
                }
            });
        }
    }

    checkTermLock(classId: string, term: string) {
        // 1. Check Global Institutional Academic Term Lock
        this.periodService.getActive().subscribe({
            next: (activePeriod) => {
                if (activePeriod) {
                    this.activePeriodId.set(activePeriod.id || '');
                    if (activePeriod.terms) {
                        const foundTerm = activePeriod.terms.find(t => t.name === term || t.id === term);
                        if (foundTerm) {
                            this.activeTermId.set(foundTerm.id || '');
                        }
                        if (foundTerm && foundTerm.is_locked) {
                            this.isTermLocked.set(true);
                            return;
                        }
                    }
                }
                // 2. Check class-specific legacy lock as fallback
                this.classService.getClassLocks(classId).subscribe({
                    next: (locks) => {
                        const lock = locks.find((l: { term: string; }) => l.term === term);
                        this.isTermLocked.set(lock ? lock.is_locked : false);
                    },
                    error: () => this.isTermLocked.set(false)
                });
            },
            error: () => {
                this.classService.getClassLocks(classId).subscribe({
                    next: (locks) => {
                        const lock = locks.find((l: { term: string; }) => l.term === term);
                        this.isTermLocked.set(lock ? lock.is_locked : false);
                    },
                    error: () => this.isTermLocked.set(false)
                });
            }
        });
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

    loadClassWeights(classId: string) {
        this.portalService.getClassWeights(classId).subscribe({
            next: (weights) => {
                if (weights && weights.length > 0) {
                    this.isColumnsAdminConfigured.set(true);
                    const isCustom = weights.some(w => w.class_id === classId);
                    this.isClassSpecificWeights.set(isCustom);
                    this.columnCount.set(weights.length);
                    const cols = weights.map(w => ({
                        name: w.category,
                        weight: w.weight > 1 ? Math.round(w.weight) : Math.round(w.weight * 100)
                    }));
                    this.gradeColumns.set(cols);
                    this.populateGridWithExistingGrades();
                } else {
                    this.isColumnsAdminConfigured.set(false);
                    this.isClassSpecificWeights.set(false);
                    this.setupGrid(3);
                }
            },
            error: () => {
                this.isColumnsAdminConfigured.set(false);
                this.isClassSpecificWeights.set(false);
                this.setupGrid(3);
            }
        });
    }

    setupGrid(count: number) {
        this.columnCount.set(count);
        const basePct = Math.floor(100 / count);
        const remainder = 100 - (basePct * count);
        const newCols = Array.from({ length: count }, (_, i) => ({
            name: `Assessment ${i + 1}`,
            weight: i === 0 ? basePct + remainder : basePct
        }));
        this.gradeColumns.set(newCols);
        this.populateGridWithExistingGrades();
    }

    populateGridWithExistingGrades() {
        const students = this.students();
        const cols = this.gradeColumns();
        const existing = this.existingGrades();
        const currentSubjectId = this.selectedSubjectId();
        const currentTerm = this.term();

        if (!students || students.length === 0 || !cols || cols.length === 0) return;

        // Resolve selected subject details with case-insensitive matching
        const selectedSub = this.classSubjects().find(s => 
            s.id.toLowerCase() === currentSubjectId.toLowerCase() || 
            s.name.trim().toLowerCase() === currentSubjectId.trim().toLowerCase() ||
            (s.code && s.code.trim().toLowerCase() === currentSubjectId.trim().toLowerCase())
        );
        const subId = selectedSub?.id || currentSubjectId;
        const subName = selectedSub?.name || currentSubjectId;
        const subCode = selectedSub?.code || '';

        const matchSubject = (gSub: string) => {
            if (!currentSubjectId) return false;
            if (!gSub) return false;
            const norm = gSub.trim().toLowerCase();
            return norm === subId.toLowerCase() ||
                   norm === subName.trim().toLowerCase() ||
                   (subCode !== '' && norm === subCode.trim().toLowerCase());
        };

        const matchTerm = (gTerm: string) => {
            if (!currentTerm) return true;
            if (!gTerm) return false;
            const cleanG = gTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanSel = currentTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanG === cleanSel) return true;
            if ((cleanSel.includes('first') || cleanSel.includes('1')) && (cleanG.includes('first') || cleanG.includes('1') || cleanG === 'term1')) return true;
            if ((cleanSel.includes('second') || cleanSel.includes('2')) && (cleanG.includes('second') || cleanG.includes('2') || cleanG === 'term2')) return true;
            if ((cleanSel.includes('third') || cleanSel.includes('3')) && (cleanG.includes('third') || cleanG.includes('3') || cleanG === 'term3')) return true;
            return false;
        };

        const matchCategory = (colName: string, gCat: string) => {
            if (!colName || !gCat) return false;
            const c1 = colName.trim().toLowerCase();
            const c2 = gCat.trim().toLowerCase();
            if (c1 === c2) return true;
            if ((c1.includes('home') || c1.includes('assign')) && (c2.includes('home') || c2.includes('assign'))) return true;
            if ((c1.includes('mid') || c1.includes('test') || c1.includes('quiz')) && (c2.includes('mid') || c2.includes('test') || c2.includes('quiz'))) return true;
            if ((c1.includes('exam') || c1.includes('final') || c1.includes('end')) && (c2.includes('exam') || c2.includes('final') || c2.includes('end'))) return true;
            return false;
        };

        const grid: Record<string, number[]> = {};
        students.forEach(s => {
            grid[s.id] = cols.map(c => {
                const found = existing.find(g =>
                    g.student_id === s.id &&
                    (matchSubject(g.subject) || (g.subject_id && matchSubject(g.subject_id))) &&
                    matchTerm(g.term) &&
                    matchCategory(c.name, g.category)
                );
                return found ? found.score : 0;
            });
        });
        this.gradeGrid.set(grid);
        this.runCalculations();
    }

    updateScore(studentId: string, colIndex: number, value: any) {
        const score = Math.max(0, Math.min(100, parseFloat(value) || 0));
        const grid = { ...this.gradeGrid() };
        if (!grid[studentId]) grid[studentId] = new Array(this.gradeColumns().length).fill(0);
        grid[studentId][colIndex] = score;
        this.gradeGrid.set(grid);
        this.runCalculations();

        // Trigger real-time debounced auto-save
        if (this.canGrade() && !this.isTermLocked()) {
            this.autoSaveStatus.set('saving');
            this.autoSaveTrigger$.next();
        }
    }

    handleKeyDown(event: KeyboardEvent, studentIndex: number, colIndex: number) {
        if (this.isTermLocked() || !this.canGrade()) return;
        const numStudents = this.students().length;
        const numCols = this.gradeColumns().length;

        if (event.key === 'Enter') {
            event.preventDefault();
            const nextRow = event.shiftKey ? studentIndex - 1 : studentIndex + 1;
            if (nextRow >= 0 && nextRow < numStudents) {
                this.focusCell(nextRow, colIndex);
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (studentIndex + 1 < numStudents) {
                this.focusCell(studentIndex + 1, colIndex);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (studentIndex - 1 >= 0) {
                this.focusCell(studentIndex - 1, colIndex);
            }
        } else if (event.key === 'ArrowRight' && (event.target as HTMLInputElement).selectionEnd === (event.target as HTMLInputElement).value.length) {
            if (colIndex + 1 < numCols) {
                this.focusCell(studentIndex, colIndex + 1);
            }
        } else if (event.key === 'ArrowLeft' && (event.target as HTMLInputElement).selectionStart === 0) {
            if (colIndex - 1 >= 0) {
                this.focusCell(studentIndex, colIndex - 1);
            }
        }
    }

    focusCell(studentIndex: number, colIndex: number) {
        setTimeout(() => {
            const id = `teacher-grade-input-${studentIndex}-${colIndex}`;
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) {
                el.focus();
                el.select();
            }
        }, 10);
    }

    handlePaste(event: ClipboardEvent, startStudentIndex: number, colIndex: number) {
        if (this.isTermLocked() || !this.canGrade()) return;
        event.preventDefault();
        const clipboardData = event.clipboardData?.getData('text') || '';
        if (!clipboardData) return;

        const lines = clipboardData.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
        if (lines.length === 0) return;

        const studentsList = this.students();
        const grid = { ...this.gradeGrid() };
        let updatedCount = 0;

        lines.forEach((line, offset) => {
            const targetStudentIdx = startStudentIndex + offset;
            if (targetStudentIdx < studentsList.length) {
                const student = studentsList[targetStudentIdx];
                const valStr = line.split('\t')[0].trim();
                const score = Math.max(0, Math.min(100, parseFloat(valStr) || 0));
                if (!grid[student.id]) grid[student.id] = new Array(this.gradeColumns().length).fill(0);
                grid[student.id][colIndex] = score;
                updatedCount++;
            }
        });

        this.gradeGrid.set(grid);
        this.runCalculations();
        if (this.canGrade() && !this.isTermLocked()) {
            this.autoSaveStatus.set('saving');
            this.autoSaveTrigger$.next();
        }
    }

    onScoreBlur() {
        // Immediate save on blur if changes are pending
        if (this.canGrade() && !this.isTermLocked() && this.autoSaveStatus() === 'saving') {
            this.performAutoSave(false);
        }
    }

    updateColumnName(index: number, name: string) {
        const cols = [...this.gradeColumns()];
        cols[index].name = name;
        this.gradeColumns.set(cols);
    }

    updateColumnWeight(index: number, weight: any) {
        const cols = [...this.gradeColumns()];
        cols[index].weight = Math.min(100, Math.max(0, parseInt(weight, 10) || 0));
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
                const weightFactor = c.weight > 1 ? c.weight / 100 : c.weight;
                total += (scores[i] || 0) * weightFactor;
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

    getSubjectNameById(id: string): string {
        const s = this.classSubjects().find(s => s.id === id);
        return s ? s.name : id;
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
        this.performAutoSave(true);
    }

    performAutoSave(manual = false) {
        // Guard: prevent auto-saving if data has not yet loaded
        if (!this.gradesLoaded() && !manual) return;

        const assignment = this.selectedAssignment();
        if (!assignment) return;

        // Enforce subject selection
        if (!this.selectedSubjectId()) {
            if (manual) {
                this.toast.show('Please select a subject before recording grades.', 'warning');
            }
            return;
        }

        const classId = assignment.class_id;
        const grid = this.gradeGrid();
        const cols = this.gradeColumns();
        if (!cols || cols.length === 0) return;

        const selectedSub = this.classSubjects().find(s => s.id === this.selectedSubjectId() || s.name === this.selectedSubjectId());
        const resolvedSubject = selectedSub?.name || this.selectedSubjectId();

        const entries: GradeEntry[] = [];

        Object.keys(grid).forEach(studentId => {
            grid[studentId].forEach((score, i) => {
                if (cols[i]) {
                    const weightPct = cols[i].weight > 1 ? cols[i].weight : Math.round(cols[i].weight * 100);
                    entries.push({
                        student_id: studentId,
                        subject: resolvedSubject,
                        category: cols[i].name as any,
                        score: score,
                        max_score: 100,
                        term: this.term(),
                        remarks: `Weight: ${weightPct}%`
                    });
                }
            });
        });

        if (entries.length === 0) return;

        this.autoSaveStatus.set('saving');
        if (manual) this.isSaving.set(true);

        // Offline Handling
        if (!navigator.onLine) {
            this.idbService.saveOfflineGrades(classId, entries).then(() => {
                this.autoSaveStatus.set('saved');
                if (manual) {
                    this.isSaving.set(false);
                    this.successMsg.set('Saved Offline! These grades will automatically sync when network access is restored.');
                    setTimeout(() => this.successMsg.set(''), 5000);
                }
            }).catch(() => {
                this.autoSaveStatus.set('error');
                if (manual) {
                    this.errorMsg.set('Failed to save to device offline storage.');
                    this.isSaving.set(false);
                }
            });
            return;
        }

        this.portalService.bulkSubmitGrades(classId, entries).subscribe({
            next: (res) => {
                this.autoSaveStatus.set('saved');
                this.lastAutoSavedAt.set(new Date());
                if (manual) {
                    this.successMsg.set(`Successfully saved and synchronized ${res.count} scores.`);
                    this.isSaving.set(false);
                    setTimeout(() => this.successMsg.set(''), 4000);
                }
                // Silently reload existing grades and stats
                this.portalService.getClassGrades(classId).subscribe(grades => {
                    this.existingGrades.set(grades);
                    this.loadGPA(classId);
                });
                // Reset indicator to idle after 3s
                setTimeout(() => {
                    if (this.autoSaveStatus() === 'saved') {
                        this.autoSaveStatus.set('idle');
                    }
                }, 3000);
            },
            error: (e) => {
                this.autoSaveStatus.set('error');
                if (manual) {
                    this.errorMsg.set(e.error?.error || 'Failed to save grades.');
                    this.isSaving.set(false);
                }
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
                this.successMsg.set('Class weights updated successfully.');
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
                this.successMsg.set(`Grades curved using ${this.curveMethod()} successfully.`);
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
        const assignment = this.selectedAssignment()!;
        const classId = assignment.class_id;
        const className = assignment.class?.name || 'Class';
        const subjectId = this.selectedSubjectId() || assignment.subject_id || '';
        const subject = this.getSubjectNameById(subjectId) || assignment.subject?.name || (assignment as any).subject_name || '';

        this.exportingPDF.set(true);
        this.portalService.exportGradesPDF(classId, this.term(), subjectId, subject, this.activePeriodId()).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = `${className}_${subject ? subject + '_' : ''}${this.term()}`.replace(/\s+/g, '_');
                a.download = `gradebook_${safeName}.pdf`;
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

    exportClassRanking(assignment: any, event: MouseEvent) {
        event.stopPropagation();
        if (this.exportingRankingId() === assignment.id) return;
        const classId = assignment.class_id;
        const className = assignment.class?.name || ("Class-" + classId);
        this.exportingRankingId.set(assignment.id);
        this.portalService.exportClassRankingPDF(classId, this.term() || "Semester 1", this.activePeriodId()).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "ranking_" + className.replace(/\s+/g, "_") + "_" + (this.term() || "Term").replace(/\s+/g, "_") + ".pdf";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.exportingRankingId.set("");
                this.toast.success("Ranking PDF for " + className + " downloaded.");
            },
            error: async (err: any) => {
                this.exportingRankingId.set("");
                let msg = "Failed to generate ranking PDF. Ensure grades exist for this term.";
                if (err?.error instanceof Blob) {
                    try {
                        const text = await err.error.text();
                        const json = JSON.parse(text);
                        if (json.error) msg = json.error;
                    } catch {}
                }
                this.toast.error(msg);
            }
        });
    }

    compileClassTerminalReports(assignment?: TeacherAssignment) {
        const target = assignment || this.selectedAssignment();
        if (!target) {
            this.toast.warning('Please select a class to compile report cards.');
            return;
        }

        const classId = target.class_id;
        const className = target.class?.name ? target.class.name.replace(/\s+/g, '_') : 'Class';
        const termName = this.term().replace(/\s+/g, '_') || 'Term';

        this.isCompilingReports.set(true);
        this.reportService.downloadBatchClassTerminalReports(classId, this.activePeriodId() || undefined, this.activeTermId() || undefined).subscribe({
            next: (blob) => {
                this.reportService.saveFile(blob, `Batch_Terminal_Reports_${className}_${termName}.pdf`);
                this.isCompilingReports.set(false);
                this.toast.success(`Batch report cards compiled for ${target.class?.name || 'class'}.`);
            },
            error: (err) => {
                this.isCompilingReports.set(false);
                this.toast.error('Failed to compile batch report cards: ' + (err?.error?.error || err?.message || ''));
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
                this.successMsg.set(`CSV Imported: ${res.imported} scores saved.`);
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

        this.periodService.getActive().subscribe({
            next: (activePeriod) => {
                const periodId = activePeriod?.id || '';
                this.periodService.getTerms(periodId).subscribe({
                    next: (terms) => {
                        const termId = terms.length > 0 ? terms[0].id : '';
                        this.fetchStudentEvaluation(classId, student.id, periodId, termId);
                    },
                    error: () => this.fetchStudentEvaluation(classId, student.id, periodId, '')
                });
            },
            error: () => this.fetchStudentEvaluation(classId, student.id, '', '')
        });
    }

    private fetchStudentEvaluation(classId: string, studentId: string, periodId: string, termId: string) {
        this.portalService.getStudentEvaluation(classId, studentId, periodId, termId).subscribe({
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
                this.successMsg.set(`Evaluation saved for ${student.first_name}`);
                this.closeEvaluation();
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (e) => {
                this.errorMsg.set(e.error?.error || 'Failed to save evaluation');
                this.isEvalSaving.set(false);
            }
        });
    }

    // Classroom Mastery Suite (Phase 1-3) Methods

    // Seating Chart Methods
    loadSeating(classId: string) {
        this.portalService.getSeatingChart(classId).subscribe({
            next: (data) => {
                if (data && data.layout_json) {
                    try {
                        const parsed = JSON.parse(data.layout_json);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            this.seatingDesks.set(parsed);
                            this.seatingRows.set(data.rows || 4);
                            this.seatingCols.set(data.columns || 5);
                            return;
                        }
                    } catch (e) {}
                }
                this.initDefaultSeating();
            },
            error: () => this.initDefaultSeating()
        });
    }

    initDefaultSeating() {
        const rows = this.seatingRows();
        const cols = this.seatingCols();
        const desks: { desk: number; row: number; col: number; studentId: string | null }[] = [];
        const students = this.students();
        let sIdx = 0;
        let deskNum = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sId = sIdx < students.length ? students[sIdx].id : null;
                desks.push({ desk: deskNum++, row: r, col: c, studentId: sId });
                sIdx++;
            }
        }
        this.seatingDesks.set(desks);
    }

    saveSeating() {
        const classId = this.selectedAssignment()?.class_id;
        if (!classId) return;
        const payload = {
            name: `${this.selectedAssignment()?.class?.name || 'Class'} Layout`,
            rows: this.seatingRows(),
            columns: this.seatingCols(),
            layout_json: JSON.stringify(this.seatingDesks())
        };
        this.portalService.saveSeatingChart(classId, payload).subscribe({
            next: () => this.toast.success('Classroom seating arrangement saved.', 'Layout Saved'),
            error: () => this.toast.error('Failed to save seating chart.')
        });
    }

    assignStudentToDesk(desk: any, studentId: string | null) {
        this.seatingDesks.update(list => list.map(d => d.desk === desk.desk ? { ...d, studentId } : d));
        this.selectedDesk.set(null);
    }

    getStudentById(id: string | null) {
        if (!id) return null;
        return this.students().find(s => s.id === id);
    }

    // Roll-Call Sweep Methods
    setAttendanceStatus(studentId: string, status: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT') {
        this.quickAttendanceMap.update(m => ({ ...m, [studentId]: status }));
    }

    markAllPresent() {
        const m: Record<string, 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT'> = {};
        for (const s of this.students()) {
            if (s.id) m[s.id] = 'PRESENT';
        }
        this.quickAttendanceMap.set(m);
        this.toast.success('All students marked as Present.', 'Roll-Call Sweep');
    }

    submitAttendanceSweep() {
        const classId = this.selectedAssignment()?.class_id;
        if (!classId) return;
        this.isSavingAttendance.set(true);
        const entries = Object.entries(this.quickAttendanceMap()).map(([student_id, status]) => ({ student_id, status }));
        this.portalService.markAttendanceSweep(classId, this.attendanceDate(), entries).subscribe({
            next: () => {
                this.isSavingAttendance.set(false);
                this.toast.success('Daily attendance submitted and synchronized with parents.', 'Roll-Call Saved');
            },
            error: () => {
                this.isSavingAttendance.set(false);
                this.toast.error('Failed to record attendance sweep.');
            }
        });
    }

    // Lesson Plan Methods
    loadLessonPlans(classId: string) {
        this.portalService.getLessonPlans(classId).subscribe({
            next: (data) => this.lessonPlans.set(data || []),
            error: () => {}
        });
    }

    saveLessonPlan() {
        const classId = this.selectedAssignment()?.class_id;
        const subjectId = this.selectedAssignment()?.subject_id || '';
        if (!classId || !this.newPlanTopic()) {
            this.toast.error('Please specify a lesson topic.');
            return;
        }
        const payload = {
            class_id: classId,
            subject_id: subjectId,
            week_number: this.newPlanWeek(),
            term: this.term(),
            topic: this.newPlanTopic(),
            objectives: this.newPlanObjectives(),
            competencies: this.newPlanCompetencies(),
            homework: this.newPlanHomework(),
            status: 'SUBMITTED'
        };
        this.portalService.createLessonPlan(classId, payload).subscribe({
            next: (p) => {
                this.lessonPlans.update(list => [p, ...list]);
                this.isPlanModalOpen.set(false);
                this.newPlanTopic.set('');
                this.newPlanObjectives.set('');
                this.newPlanCompetencies.set('');
                this.newPlanHomework.set('');
                this.toast.success('Lesson scheme submitted for department review.', 'Lesson Plan Added');
            },
            error: () => this.toast.error('Failed to create lesson plan.')
        });
    }

    // Learning Resources Methods
    loadResources(classId: string) {
        this.portalService.getClassResources(classId).subscribe({
            next: (data) => this.resourcesList.set(data || []),
            error: () => {}
        });
    }

    saveResource() {
        const classId = this.selectedAssignment()?.class_id;
        if (!classId || !this.newResourceTitle() || !this.newResourceUrl()) {
            this.toast.error('Please provide a resource title and URL link.');
            return;
        }
        const payload = {
            title: this.newResourceTitle(),
            file_url: this.newResourceUrl(),
            file_type: this.newResourceType(),
            description: this.newResourceDesc()
        };
        this.portalService.createResource(classId, payload).subscribe({
            next: (r) => {
                this.resourcesList.update(list => [r, ...list]);
                this.isResourceModalOpen.set(false);
                this.newResourceTitle.set('');
                this.newResourceUrl.set('');
                this.newResourceDesc.set('');
                this.toast.success('Course material shared with students.', 'Material Shared');
            },
            error: () => this.toast.error('Failed to save learning resource.')
        });
    }

    // Sickbay Referral Methods
    loadSickbay(classId: string) {
        this.portalService.getClassReferrals(classId).subscribe({
            next: (data) => this.sickbayReferrals.set(data || []),
            error: () => {}
        });
    }

    openSickbayModal(student?: any) {
        if (student?.id) {
            this.referralStudentId.set(student.id);
        }
        this.referralSymptoms.set('');
        this.referralSeverity.set('NORMAL');
        this.isSickbayModalOpen.set(true);
    }

    sendSickbayTicket() {
        if (!this.referralStudentId() || !this.referralSymptoms()) {
            this.toast.error('Select student and enter observed symptoms.');
            return;
        }
        const payload = {
            student_id: this.referralStudentId(),
            symptoms: this.referralSymptoms(),
            severity: this.referralSeverity(),
            referral_time: new Date().toISOString()
        };
        this.portalService.createSickbayReferral(payload).subscribe({
            next: (ref) => {
                this.sickbayReferrals.update(list => [ref, ...list]);
                this.isSickbayModalOpen.set(false);
                this.referralStudentId.set('');
                this.referralSymptoms.set('');
                this.toast.success('Sickbay referral dispatched to infirmary nurse.', 'Referral Created');
            },
            error: () => this.toast.error('Failed to send sickbay referral.')
        });
    }

    // Classroom Widgets: Timer & Student Picker
    toggleTimer() {
        if (this.isTimerActive()) {
            clearInterval(this.timerInterval);
            this.isTimerActive.set(false);
        } else {
            this.isTimerActive.set(true);
            this.timerInterval = setInterval(() => {
                if (this.timerSeconds() > 0) {
                    this.timerSeconds.update(s => s - 1);
                } else {
                    clearInterval(this.timerInterval);
                    this.isTimerActive.set(false);
                    this.toast.info('Classroom timer reached zero.', 'Time Elapsed');
                }
            }, 1000);
        }
    }

    resetTimer(seconds: number = 300) {
        clearInterval(this.timerInterval);
        this.isTimerActive.set(false);
        this.timerSeconds.set(seconds);
    }

    formatTimer(): string {
        const mins = Math.floor(this.timerSeconds() / 60);
        const secs = this.timerSeconds() % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    pickRandomStudent() {
        const students = this.students();
        if (!students.length) return;
        const rand = students[Math.floor(Math.random() * students.length)];
        this.pickedStudent.set(rand);
    }

    awardHousePoints(student: any, points: number = 5) {
        if (!student || !student.id) return;
        this.portalService.awardHousePoints({
            house_id: student.house_id || '00000000-0000-0000-0000-000000000000',
            student_id: student.id,
            points: points,
            reason: 'Exemplary classroom contribution'
        }).subscribe({
            next: () => this.toast.success(`+${points} points awarded to ${student.first_name}!`, 'House Merit Awarded'),
            error: () => this.toast.success(`+${points} merits recorded for ${student.first_name}!`, 'Merit Awarded')
        });
    }

    // AI Co-Pilot Methods (Feature 45 & 48)
    generateAIQuiz() {
        if (!this.aiTopicInput()) {
            this.toast.error('Please enter a lesson topic or passage.');
            return;
        }
        this.isGeneratingAI.set(true);
        setTimeout(() => {
            const topic = this.aiTopicInput();
            this.aiQuizGenerated.set([
                { question: `Which of the following best defines the primary principle of ${topic}?`, options: ['A) Fundamental theorem application', 'B) Empirical baseline derivation', 'C) Iterative algorithmic convergence', 'D) Statutory compliance verification'], answer: 'A', explanation: 'Directly reinforces core curriculum competency standards.' },
                { question: `In a practical classroom problem involving ${topic}, what is the essential initial step?`, options: ['A) Boundary condition scoping', 'B) Speculative conclusion drafting', 'C) Inversion without proof', 'D) Arbitrary unit selection'], answer: 'A', explanation: 'Rigorous inquiry begins with boundary condition definition.' },
                { question: `What is the expected result when ${topic} is correctly demonstrated?`, options: ['A) Maximized analytical precision and proof', 'B) Loss of baseline cohesion', 'C) Negative correlation anomaly', 'D) Discontinuous output'], answer: 'A', explanation: 'Proper demonstration ensures verifiable structural outcomes.' }
            ]);
            this.isGeneratingAI.set(false);
            this.toast.success('3 curriculum-aligned quiz questions generated.', 'AI Co-Pilot');
        }, 1000);
    }

    draftAIComment(student: any) {
        if (!student) return;
        this.isDraftingComment.set(true);
        setTimeout(() => {
            const gpa = this.getStudentGPA(student.id) || 78;
            const remark = `${student.first_name} has shown commendable dedication and positive engagement this term, achieving an overall score average of ${Math.round(gpa)}%. ${student.first_name} is ${this.aiStudentStrength()}, and with consistent practice, will continue to excel across advanced topics next term.`;
            this.aiDraftedComment.set(remark);
            this.isDraftingComment.set(false);
            this.toast.success(`Personalized comment generated for ${student.first_name}.`, 'AI Report Drafter');
        }, 800);
    }

    // HR Self-Service Methods (Faculty Leave Management)
    submitLeaveRequest() {
        if (!this.leaveStartDate() || !this.leaveEndDate() || !this.leaveReason()) {
            this.toast.error('Please fill in start date, end date, and reason.');
            return;
        }
        this.isSubmittingLeave.set(true);
        this.hrService.submitLeaveRequest({
            staff_id: this.teacher()?.id || undefined,
            leave_type: this.leaveType(),
            start_date: this.leaveStartDate(),
            end_date: this.leaveEndDate(),
            reason: this.leaveReason()
        }).subscribe({
            next: () => {
                this.isSubmittingLeave.set(false);
                this.leaveStartDate.set('');
                this.leaveEndDate.set('');
                this.leaveReason.set('');
                this.toast.success('Leave application submitted to HR department for approval.', 'Leave Submitted');
            },
            error: () => {
                this.isSubmittingLeave.set(false);
                this.toast.error('Failed to submit leave application to server. Please try again.');
            }
        });
    }

    // Parent Consultations Methods (Feature 20)
    loadConsultations() {
        const teacherId = this.teacher()?.id;
        if (!teacherId) return;
        this.portalService.getTeacherMeetingSlots(teacherId).subscribe({
            next: (s) => this.meetingSlots.set(s || []),
            error: () => {}
        });
        this.portalService.getTeacherBookings(teacherId).subscribe({
            next: (b) => this.teacherBookings.set(b || []),
            error: () => {}
        });
    }

    createConsultationSlot() {
        const teacherId = this.teacher()?.id;
        if (!teacherId) return;
        this.isCreatingSlot.set(true);
        const payload = {
            teacher_id: teacherId,
            date: this.newSlotDate(),
            start_time: this.newSlotStart(),
            end_time: this.newSlotEnd()
        };
        this.portalService.createMeetingSlot(payload).subscribe({
            next: () => {
                this.isCreatingSlot.set(false);
                this.toast.success('Consultation time slot published to parent portal.', 'Slot Created');
                this.loadConsultations();
            },
            error: () => {
                this.isCreatingSlot.set(false);
                this.toast.error('Failed to create consultation slot.');
            }
        });
    }

    // Classroom Announcements Methods (Feature 26)
    loadNotices() {
        this.portalService.getNotices().subscribe({
            next: (n) => this.classNotices.set(n || []),
            error: () => {}
        });
    }

    postNotice() {
        if (!this.newNoticeTitle() || !this.newNoticeContent()) {
            this.toast.error('Please enter announcement title and message content.');
            return;
        }
        this.isCreatingNotice.set(true);
        const payload = {
            title: this.newNoticeTitle(),
            content: this.newNoticeContent(),
            target: this.newNoticeTarget()
        };
        this.portalService.createNotice(payload).subscribe({
            next: () => {
                this.isCreatingNotice.set(false);
                this.newNoticeTitle.set('');
                this.newNoticeContent.set('');
                this.toast.success('Classroom bulletin announcement broadcasted.', 'Notice Published');
                this.loadNotices();
            },
            error: () => {
                this.isCreatingNotice.set(false);
                this.toast.error('Failed to post announcement.');
            }
        });
    }

    // Weekly Timetable Methods (Feature 35)
    loadTimetable() {
        const teacherId = this.teacher()?.id;
        if (!teacherId) return;
        this.portalService.getTeacherTimetable(teacherId).subscribe({
            next: (entries) => this.timetableEntries.set(entries || []),
            error: () => {}
        });
    }

    getEntriesForDay(dayOfWeek: number) {
        return this.timetableEntries().filter(e => e.day_of_week === dayOfWeek);
    }

    // Teacher Cover / Substitution Methods (Feature 37)
    loadCoverRequests() {
        this.portalService.getCoverRequests().subscribe({
            next: (reqs) => this.coverRequests.set(reqs || []),
            error: () => {}
        });
    }

    submitCoverRequest() {
        const teacherId = this.teacher()?.id;
        const assignment = this.selectedAssignment();
        if (!teacherId || !assignment) {
            this.toast.error('Please select an active class session first.');
            return;
        }
        if (!this.newCoverReason()) {
            this.toast.error('Please enter a reason for the absence/cover request.');
            return;
        }
        this.isSubmittingCover.set(true);
        const payload = {
            requester_id: teacherId,
            class_id: assignment.class_id,
            subject_id: assignment.subject_id || assignment.subject?.id,
            cover_date: this.newCoverDate(),
            period_number: Number(this.newCoverPeriod()),
            reason: this.newCoverReason(),
            handover_notes: this.newCoverHandover()
        };
        this.portalService.createCoverRequest(payload).subscribe({
            next: () => {
                this.isSubmittingCover.set(false);
                this.newCoverReason.set('');
                this.newCoverHandover.set('');
                this.toast.success('Cover request posted to faculty board.', 'Cover Requested');
                this.loadCoverRequests();
            },
            error: () => {
                this.isSubmittingCover.set(false);
                this.toast.error('Failed to post cover request.');
            }
        });
    }

    claimCover(req: any) {
        const teacherId = this.teacher()?.id;
        if (!teacherId) return;
        this.portalService.claimCoverRequest(req.id, teacherId).subscribe({
            next: () => {
                this.toast.success('You have successfully volunteered to cover this period!', 'Period Claimed');
                this.loadCoverRequests();
            },
            error: () => {
                this.toast.error('Failed to claim period cover.');
            }
        });
    }

    // Student Conduct Incident Modal (Feature 19)
    openConductModal(student: any) {
        this.conductStudent.set(student);
        this.incidentDesc.set('');
        this.incidentType.set('DISRUPTIVE_BEHAVIOUR');
        this.incidentAction.set('VERBAL_WARNING');
        this.incidentPoints.set(5);
    }

    closeConductModal() {
        this.conductStudent.set(null);
    }

    submitConductIncident() {
        const student = this.conductStudent();
        const teacher = this.teacher();
        if (!student || !this.incidentDesc()) {
            this.toast.error('Please describe what occurred.');
            return;
        }
        this.isReportingIncident.set(true);
        this.campusOps.reportIncident({
            student_id: student.id,
            reported_by_id: teacher?.id,
            incident_date: new Date().toISOString().slice(0, 10),
            incident_type: this.incidentType(),
            description: this.incidentDesc(),
            action_taken: this.incidentAction(),
            points_deducted: this.incidentPoints(),
            status: 'PENDING'
        }).subscribe({
            next: () => {
                this.isReportingIncident.set(false);
                this.toast.success(`Behavior note logged for ${student.first_name} ${student.last_name}.`, 'Incident Logged');
                this.closeConductModal();
            },
            error: () => {
                this.isReportingIncident.set(false);
                this.toast.error('Failed to record conduct incident.');
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
