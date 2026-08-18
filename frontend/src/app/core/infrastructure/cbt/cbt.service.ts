import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CBTQuiz {
  id?: string;
  tenant_id?: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  time_limit_mins: number;
  start_time?: string;
  end_time?: string;
  questions?: CBTQuestion[];
}

export interface CBTQuestion {
  id?: string;
  quiz_id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  content: string;
  points: number;
  order: number;
  options?: any;
  correct_answer: string;
}

export interface CBTAttempt {
  id?: string;
  quiz_id: string;
  student_id: string;
  status?: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  score?: number;
  max_score: number;
  started_at?: string;
  completed_at?: string;
}

export interface CBTAnswer {
  id?: string;
  attempt_id: string;
  question_id: string;
  answer_data: string;
  is_correct?: boolean;
  points_earned?: number;
}

@Injectable({ providedIn: 'root' })
export class CBTService {
  private baseUrl = `${environment.apiUrl}/cbt`;

  constructor(private http: HttpClient) {}

  createQuiz(quiz: CBTQuiz): Observable<CBTQuiz> {
    return this.http.post<CBTQuiz>(`${this.baseUrl}/quizzes`, quiz);
  }

  getQuiz(id: string): Observable<CBTQuiz> {
    return this.http.get<CBTQuiz>(`${this.baseUrl}/quizzes/${id}`);
  }

  getClassQuizzes(classId: string): Observable<CBTQuiz[]> {
    return this.http.get<CBTQuiz[]>(`${this.baseUrl}/classes/${classId}/quizzes`);
  }

  addQuestion(quizId: string, question: CBTQuestion): Observable<CBTQuestion> {
    return this.http.post<CBTQuestion>(`${this.baseUrl}/quizzes/${quizId}/questions`, question);
  }

  startAttempt(attempt: CBTAttempt): Observable<CBTAttempt> {
    return this.http.post<CBTAttempt>(`${this.baseUrl}/attempts`, attempt);
  }

  submitAnswer(attemptId: string, answer: CBTAnswer): Observable<CBTAnswer> {
    return this.http.post<CBTAnswer>(`${this.baseUrl}/attempts/${attemptId}/answers`, answer);
  }

  completeAttempt(attemptId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/attempts/${attemptId}/complete`, {});
  }
}
