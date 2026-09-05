import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CBTService, CBTQuiz, CBTQuestion } from '../../../core/infrastructure/cbt/cbt.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-cbt-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './cbt-builder.component.html'
})
export class CbtBuilderComponent implements OnInit {
  private cbtSvc = inject(CBTService);
  private classService = inject(ClassService);
  private subjectService = inject(SubjectService);
  private dialog = inject(DialogService);
  private fb = inject(FormBuilder);

  // Core Data
  quizzes = signal<CBTQuiz[]>([]);
  classes = signal<Class[]>([]);
  subjects = signal<Subject[]>([]);
  selectedQuiz = signal<CBTQuiz | null>(null);

  // Filters & State
  selectedClassId = signal<string>('');
  selectedStatusFilter = signal<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(true);
  isPublishing = signal<boolean>(false);

  // Modals & Simulator
  showQuizForm = signal(false);
  showQuestionForm = signal(false);
  showPreviewModal = signal(false);
  previewCurrentQuestionIndex = signal(0);
  previewSelectedAnswers = signal<Record<number, string>>({});

  // Forms
  quizForm: FormGroup;
  questionForm: FormGroup;

  // Telemetry Metrics
  totalQuizzesCount = computed(() => this.quizzes().length);
  publishedQuizzesCount = computed(() => this.quizzes().filter(q => q.status === 'PUBLISHED').length);
  draftQuizzesCount = computed(() => this.quizzes().filter(q => q.status === 'DRAFT').length);
  
  totalQuestionsCount = computed(() => {
    return this.quizzes().reduce((acc, q) => acc + (q.questions?.length || 0), 0);
  });

  filteredQuizzes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const classId = this.selectedClassId();
    const status = this.selectedStatusFilter();

    return this.quizzes().filter(quiz => {
      if (classId && quiz.class_id !== classId) return false;
      if (status !== 'ALL' && quiz.status !== status) return false;
      if (!q) return true;

      const titleMatch = quiz.title?.toLowerCase().includes(q);
      const descMatch = quiz.description?.toLowerCase().includes(q);
      const subjectName = this.getSubjectName(quiz.subject_id)?.toLowerCase();
      const subjectMatch = subjectName?.includes(q);

      return titleMatch || descMatch || subjectMatch;
    });
  });

  selectedQuizTotalPoints = computed(() => {
    const quiz = this.selectedQuiz();
    if (!quiz || !quiz.questions) return 0;
    return quiz.questions.reduce((acc, q) => acc + (q.points || 0), 0);
  });

  constructor() {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      class_id: ['', Validators.required],
      subject_id: ['', Validators.required],
      time_limit_mins: [30, [Validators.required, Validators.min(0)]]
    });

    this.questionForm = this.fb.group({
      type: ['MULTIPLE_CHOICE', Validators.required],
      content: ['', Validators.required],
      points: [1, [Validators.required, Validators.min(1)]],
      correct_answer: ['1', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ])
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading.set(true);
    this.classService.getClasses().subscribe({
      next: (cls) => {
        this.classes.set(cls || []);
        if (cls && cls.length > 0 && !this.selectedClassId()) {
          this.selectedClassId.set(cls[0].id);
          this.loadQuizzes(cls[0].id);
        } else {
          this.loadQuizzes();
        }
      },
      error: () => this.isLoading.set(false)
    });

    this.subjectService.getSubjects().subscribe({
      next: (subs) => this.subjects.set(subs || [])
    });
  }

  loadQuizzes(classId?: string) {
    this.isLoading.set(true);
    const targetClass = classId || this.selectedClassId();
    if (!targetClass) {
      this.quizzes.set([]);
      this.isLoading.set(false);
      return;
    }

    this.cbtSvc.getClassQuizzes(targetClass).subscribe({
      next: (data) => {
        this.quizzes.set(data || []);
        this.isLoading.set(false);
        // If current selected quiz is not in new list, pick first
        if (this.selectedQuiz()) {
          const found = (data || []).find(q => q.id === this.selectedQuiz()!.id);
          if (found) {
            this.selectQuiz(found);
          } else if (data && data.length > 0) {
            this.selectQuiz(data[0]);
          } else {
            this.selectedQuiz.set(null);
          }
        } else if (data && data.length > 0) {
          this.selectQuiz(data[0]);
        }
      },
      error: () => {
        this.quizzes.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onClassFilterChange(classId: string) {
    this.selectedClassId.set(classId);
    this.selectedQuiz.set(null);
    this.loadQuizzes(classId);
  }

  selectQuiz(quiz: CBTQuiz) {
    if (!quiz.id) return;
    this.cbtSvc.getQuiz(quiz.id).subscribe({
      next: (fullQuiz) => this.selectedQuiz.set(fullQuiz),
      error: () => this.selectedQuiz.set(quiz)
    });
  }

  getClassName(classId?: string): string {
    if (!classId) return 'All Classes';
    const c = this.classes().find(cls => cls.id === classId);
    return c ? c.name : 'Class';
  }

  getSubjectName(subjectId?: string): string {
    if (!subjectId) return 'General Assessment';
    const s = this.subjects().find(sub => sub.id === subjectId);
    return s ? s.name : 'Subject';
  }

  openNewQuizModal() {
    this.quizForm.reset({
      title: '',
      description: '',
      class_id: this.selectedClassId() || (this.classes()[0]?.id || ''),
      subject_id: this.subjects()[0]?.id || '',
      time_limit_mins: 30
    });
    this.showQuizForm.set(true);
  }

  createOption() {
    return this.fb.control('', Validators.required);
  }

  get optionsArray() {
    return this.questionForm.get('options') as FormArray;
  }

  addOption() {
    this.optionsArray.push(this.createOption());
  }

  removeOption(index: number) {
    if (this.optionsArray.length > 2) {
      this.optionsArray.removeAt(index);
    }
  }

  parseOptions(options: any): string[] {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  submitQuiz() {
    if (this.quizForm.invalid) {
      this.quizForm.markAllAsTouched();
      return;
    }

    const val = this.quizForm.value;
    const quiz: CBTQuiz = {
      title: val.title,
      description: val.description,
      class_id: val.class_id,
      subject_id: val.subject_id,
      teacher_id: 'default-teacher',
      time_limit_mins: Number(val.time_limit_mins) || 0,
      status: 'DRAFT'
    };

    this.cbtSvc.createQuiz(quiz).subscribe({
      next: (created) => {
        this.showQuizForm.set(false);
        this.dialog.alert('New CBT assessment drafted successfully.', 'Assessment Created', 'success');
        this.loadQuizzes(val.class_id);
        if (created) this.selectQuiz(created);
      },
      error: (err) => {
        this.dialog.alert(err?.error?.error || 'Failed to create assessment.', 'Creation Error', 'danger');
      }
    });
  }

  openAddQuestionModal() {
    this.questionForm.reset({
      type: 'MULTIPLE_CHOICE',
      content: '',
      points: 1,
      correct_answer: '1'
    });
    while (this.optionsArray.length < 4) {
      this.optionsArray.push(this.createOption());
    }
    while (this.optionsArray.length > 4) {
      this.optionsArray.removeAt(this.optionsArray.length - 1);
    }
    this.showQuestionForm.set(true);
  }

  submitQuestion() {
    if (this.questionForm.invalid || !this.selectedQuiz()?.id) {
      this.questionForm.markAllAsTouched();
      return;
    }

    const val = this.questionForm.value;
    const q: CBTQuestion = {
      quiz_id: this.selectedQuiz()!.id!,
      type: val.type,
      content: val.content,
      points: Number(val.points) || 1,
      order: (this.selectedQuiz()!.questions?.length || 0) + 1,
      correct_answer: String(val.correct_answer),
      options: val.type === 'MULTIPLE_CHOICE' ? JSON.stringify(val.options) : null
    };

    this.cbtSvc.addQuestion(this.selectedQuiz()!.id!, q).subscribe({
      next: () => {
        this.showQuestionForm.set(false);
        this.dialog.alert('Question added to assessment successfully.', 'Question Saved', 'success');
        this.selectQuiz(this.selectedQuiz()!); // Refresh quiz
      },
      error: (err) => {
        this.dialog.alert(err?.error?.error || 'Failed to add question.', 'Save Failed', 'danger');
      }
    });
  }

  togglePublishStatus() {
    const quiz = this.selectedQuiz();
    if (!quiz || !quiz.id) return;

    const newStatus = quiz.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const action = newStatus === 'PUBLISHED' ? 'publish' : 'unpublish';

    this.dialog.confirm(
      `Are you sure you want to ${action} "${quiz.title}"? ${newStatus === 'PUBLISHED' ? 'Students will immediately be able to take this test.' : 'The test will be hidden from students.'}`,
      `${newStatus === 'PUBLISHED' ? 'Publish' : 'Unpublish'} Assessment`,
      'info',
      newStatus === 'PUBLISHED' ? 'Publish Test' : 'Set as Draft'
    ).subscribe(confirmed => {
      if (!confirmed) return;
      this.isPublishing.set(true);
      // Update local quiz
      quiz.status = newStatus;
      this.selectedQuiz.set({ ...quiz });
      this.isPublishing.set(false);
      this.dialog.alert(`Assessment is now ${newStatus.toLowerCase()}.`, 'Status Updated', 'success');
    });
  }

  openSimulatorPreview() {
    if (!this.selectedQuiz()?.questions?.length) {
      this.dialog.alert('Please add at least one question before previewing the test simulator.', 'Empty Assessment', 'info');
      return;
    }
    this.previewCurrentQuestionIndex.set(0);
    this.previewSelectedAnswers.set({});
    this.showPreviewModal.set(true);
  }

  selectPreviewAnswer(questionIndex: number, answer: string) {
    const current = { ...this.previewSelectedAnswers() };
    current[questionIndex] = answer;
    this.previewSelectedAnswers.set(current);
  }

  // Helper for template
  String = String;

  isCorrectOption(optIdx: number, correctAnswer: string | undefined): boolean {
    if (!correctAnswer) return false;
    return String(optIdx + 1) === String(correctAnswer).trim();
  }

  getCurrentPreviewQuestion(): CBTQuestion | null {
    const quiz = this.selectedQuiz();
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return null;
    const idx = this.previewCurrentQuestionIndex();
    return quiz.questions[idx] || null;
  }
}



