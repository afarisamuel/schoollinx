import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CBTService, CBTQuiz, CBTQuestion, CBTAttempt, CBTAnswer } from '../../../core/infrastructure/cbt/cbt.service';

@Component({
  selector: 'app-cbt-attempt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cbt-attempt.component.html'
})
export class CbtAttemptComponent implements OnInit {
  quiz = signal<CBTQuiz | null>(null);
  attempt = signal<CBTAttempt | null>(null);
  
  questions = signal<CBTQuestion[]>([]);
  currentQuestionIndex = signal(0);
  
  answers = signal<Map<string, string>>(new Map()); // question_id -> answer_data
  
  quizId: string = '';
  // Hardcoded for demo
  studentId = '44444444-4444-4444-4444-444444444444';

  timeRemaining = signal<number | null>(null);
  timerInterval: any;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private cbtSvc: CBTService
  ) {}

  ngOnInit() {
    this.quizId = this.route.snapshot.paramMap.get('id') || '';
    if (this.quizId) {
      this.loadQuiz();
    }
  }

  loadQuiz() {
    this.cbtSvc.getQuiz(this.quizId).subscribe(q => {
      this.quiz.set(q);
      this.questions.set(q.questions || []);
    });
  }

  startAttempt() {
    if (!this.quiz()) return;
    const att: CBTAttempt = {
      quiz_id: this.quizId,
      student_id: this.studentId,
      max_score: this.questions().reduce((sum, q) => sum + q.points, 0)
    };
    this.cbtSvc.startAttempt(att).subscribe(res => {
      this.attempt.set(res);
      this.startTimer();
    });
  }

  startTimer() {
    const timeLimit = this.quiz()?.time_limit_mins;
    if (timeLimit && timeLimit > 0) {
      this.timeRemaining.set(timeLimit * 60);
      this.timerInterval = setInterval(() => {
        const current = this.timeRemaining()!;
        if (current <= 1) {
          this.submitQuiz();
        } else {
          this.timeRemaining.set(current - 1);
        }
      }, 1000);
    }
  }

  get currentQuestion(): CBTQuestion | undefined {
    return this.questions()[this.currentQuestionIndex()];
  }

  get options(): any[] {
    const q = this.currentQuestion;
    if (q?.type === 'MULTIPLE_CHOICE' && q.options) {
      return JSON.parse(q.options as string);
    }
    return [];
  }

  setAnswer(val: string) {
    const q = this.currentQuestion;
    if (q) {
      const newAnswers = new Map(this.answers());
      newAnswers.set(q.id!, val);
      this.answers.set(newAnswers);
    }
  }

  get currentAnswer(): string {
    const q = this.currentQuestion;
    return q ? this.answers().get(q.id!) || '' : '';
  }

  nextQuestion() {
    if (this.currentQuestionIndex() < this.questions().length - 1) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
    }
  }

  submitQuiz() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    // In a real app, we would send each answer or a batch of answers.
    // Here we'll simulate submitting all answers sequentially, then completing.
    const answersToSend = Array.from(this.answers().entries()).map(([qId, data]) => ({
      attempt_id: this.attempt()!.id!,
      question_id: qId,
      answer_data: data
    }));

    let count = 0;
    if (answersToSend.length === 0) {
        this.finishSubmit();
        return;
    }

    answersToSend.forEach(ans => {
      this.cbtSvc.submitAnswer(this.attempt()!.id!, ans).subscribe(() => {
        count++;
        if (count === answersToSend.length) {
          this.finishSubmit();
        }
      });
    });
  }
  
  private finishSubmit() {
    this.cbtSvc.completeAttempt(this.attempt()!.id!).subscribe(() => {
      alert('Quiz submitted successfully!');
      this.router.navigate(['/portal']);
    });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
