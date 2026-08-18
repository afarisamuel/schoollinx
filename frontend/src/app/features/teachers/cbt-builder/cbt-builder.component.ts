import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CBTService, CBTQuiz, CBTQuestion } from '../../../core/infrastructure/cbt/cbt.service';

@Component({
  selector: 'app-cbt-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cbt-builder.component.html'
})
export class CbtBuilderComponent implements OnInit {
  quizzes = signal<CBTQuiz[]>([]);
  selectedQuiz = signal<CBTQuiz | null>(null);
  
  quizForm: FormGroup;
  questionForm: FormGroup;
  showQuizForm = signal(false);
  showQuestionForm = signal(false);

  // Hardcoded for UI demo
  classId = '11111111-1111-1111-1111-111111111111';
  subjectId = '22222222-2222-2222-2222-222222222222';
  teacherId = '33333333-3333-3333-3333-333333333333';

  constructor(private cbtSvc: CBTService, private fb: FormBuilder) {
    this.quizForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      time_limit_mins: [0, Validators.required]
    });

    this.questionForm = this.fb.group({
      type: ['MULTIPLE_CHOICE', Validators.required],
      content: ['', Validators.required],
      points: [1, Validators.required],
      correct_answer: ['', Validators.required],
      options: this.fb.array([this.createOption(), this.createOption()])
    });
  }

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.cbtSvc.getClassQuizzes(this.classId).subscribe(data => this.quizzes.set(data || []));
  }

  selectQuiz(quiz: CBTQuiz) {
    this.cbtSvc.getQuiz(quiz.id!).subscribe(fullQuiz => this.selectedQuiz.set(fullQuiz));
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

  submitQuiz() {
    if (this.quizForm.invalid) return;
    const quiz: CBTQuiz = {
      ...this.quizForm.value,
      class_id: this.classId,
      subject_id: this.subjectId,
      teacher_id: this.teacherId,
      status: 'DRAFT'
    };
    this.cbtSvc.createQuiz(quiz).subscribe(() => {
      this.showQuizForm.set(false);
      this.quizForm.reset({ time_limit_mins: 0 });
      this.loadQuizzes();
    });
  }

  submitQuestion() {
    if (this.questionForm.invalid || !this.selectedQuiz()) return;
    const val = this.questionForm.value;
    const q: CBTQuestion = {
      quiz_id: this.selectedQuiz()!.id!,
      type: val.type,
      content: val.content,
      points: val.points,
      order: (this.selectedQuiz()!.questions?.length || 0) + 1,
      correct_answer: val.correct_answer,
      options: val.type === 'MULTIPLE_CHOICE' ? JSON.stringify(val.options) : null
    };
    
    this.cbtSvc.addQuestion(this.selectedQuiz()!.id!, q).subscribe(() => {
      this.showQuestionForm.set(false);
      this.questionForm.reset({ type: 'MULTIPLE_CHOICE', points: 1 });
      while(this.optionsArray.length > 2) this.optionsArray.removeAt(this.optionsArray.length - 1);
      this.selectQuiz(this.selectedQuiz()!); // Refresh
    });
  }
}
