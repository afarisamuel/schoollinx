import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeworkService } from '../../../core/infrastructure/academic/homework.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Homework, HomeworkSubmission } from '../../../core/domain/homework.model';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-homework-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './homework-portal.component.html',
  styleUrl: './homework-portal.component.css'
})
export class HomeworkPortalComponent implements OnInit {
  private homeworkService = inject(HomeworkService);
  private classService = inject(ClassService);
  private subjectService = inject(SubjectService);
  private authService = inject(AuthService);
  private dialog = inject(DialogService);

  homeworks: Homework[] = [];
  classes: Class[] = [];
  subjects: Subject[] = [];

  // Search & Filter State
  searchQuery = '';
  selectedClassFilter = 'ALL';
  selectedSubjectFilter = 'ALL';
  dueFilter: 'ALL' | 'ACTIVE' | 'OVERDUE' = 'ALL';
  viewMode: 'grid' | 'table' = 'grid';

  showForm = false;
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;

  showSubmissions = false;
  selectedHomework: Homework | null = null;
  submissions: HomeworkSubmission[] = [];
  isLoadingSubmissions = false;

  // Phase 2: SpeedGrader Suite
  speedGraderActive = false;
  activeSubmission: HomeworkSubmission | null = null;
  blindGradingMode = false;

  // Criteria Rubric State
  rubricScores = {
    content: 35,
    methodology: 35,
    presentation: 20
  };

  commentBank = [
    'Exemplary conceptual understanding and clear logical steps.',
    'Good attempt, but review your calculation steps carefully.',
    'Well structured analysis with persuasive conclusions.',
    'Please show all rough working and formulas used.',
    'Submitted punctually with outstanding neatness.'
  ];

  formData: Partial<Homework> = {
    title: '',
    description: '',
    due_date: '',
    class_id: '',
    subject: ''
  };

  get filteredHomeworks(): Homework[] {
    const query = this.searchQuery.toLowerCase().trim();
    const classId = this.selectedClassFilter;
    const subject = this.selectedSubjectFilter;
    const due = this.dueFilter;
    const now = new Date();

    return this.homeworks.filter(hw => {
      const matchesQuery = !query ||
        hw.title?.toLowerCase().includes(query) ||
        hw.subject?.toLowerCase().includes(query) ||
        hw.description?.toLowerCase().includes(query) ||
        this.getClassName(hw.class_id).toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (classId !== 'ALL' && hw.class_id !== classId) return false;
      if (subject !== 'ALL' && hw.subject !== subject) return false;

      if (due === 'ACTIVE') {
        const dueDate = new Date(hw.due_date);
        if (dueDate < now) return false;
      } else if (due === 'OVERDUE') {
        const dueDate = new Date(hw.due_date);
        if (dueDate >= now) return false;
      }

      return true;
    });
  }

  get distinctClassesCount(): number {
    return new Set(this.homeworks.map(h => h.class_id)).size;
  }

  get distinctSubjectsCount(): number {
    return new Set(this.homeworks.map(h => h.subject)).size;
  }

  isPastDue(dueDateStr: string): boolean {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date();
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.classService.getClasses().subscribe(classes => this.classes = classes);
    this.subjectService.getSubjects().subscribe(subjects => this.subjects = subjects);
    this.loadHomeworks();
  }

  loadHomeworks() {
    this.isLoading = true;
    const user = this.authService.currentUserValue;
    if (user && user.id) {
      // Fetch homeworks created by this teacher
      this.homeworkService.getHomeworksByTeacher(user.id).subscribe({
        next: (data) => {
          this.homeworks = data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
        this.isLoading = false;
    }
  }

  openForm(homework?: Homework) {
    if (homework) {
      this.editingId = homework.id!;
      this.formData = { ...homework };
      // Handle formatting date for input type="date"
      if (this.formData.due_date) {
        this.formData.due_date = new Date(this.formData.due_date).toISOString().split('T')[0];
      }
    } else {
      this.editingId = null;
      this.formData = {
        title: '',
        description: '',
        due_date: '',
        class_id: '',
        subject: ''
      };
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
  }

  saveHomework() {
    if (!this.formData.title || !this.formData.class_id || !this.formData.subject || !this.formData.due_date) {
      this.dialog.alert('Please fill in all required fields.', 'Validation Error', 'error').subscribe();
      return;
    }

    this.isSaving = true;
    
    // Convert date string back to ISO format properly
    const submissionData = { ...this.formData };
    if (submissionData.due_date) {
        submissionData.due_date = new Date(submissionData.due_date).toISOString();
    }
    
    // Set teacher_id from auth user
    const user = this.authService.currentUserValue;
    if (user && user.id) {
        submissionData.teacher_id = user.id;
    }

    if (this.editingId) {
      this.homeworkService.updateHomework(this.editingId, submissionData).subscribe({
        next: () => {
          this.dialog.alert('Homework updated successfully.', 'Success', 'success').subscribe();
          this.isSaving = false;
          this.closeForm();
          this.loadHomeworks();
        },
        error: () => {
          this.isSaving = false;
          this.dialog.alert('Failed to update homework.', 'Error', 'error').subscribe();
        }
      });
    } else {
      this.homeworkService.createHomework(submissionData).subscribe({
        next: () => {
          this.dialog.alert('Homework created successfully.', 'Success', 'success').subscribe();
          this.isSaving = false;
          this.closeForm();
          this.loadHomeworks();
        },
        error: () => {
          this.isSaving = false;
          this.dialog.alert('Failed to create homework.', 'Error', 'error').subscribe();
        }
      });
    }
  }

  deleteHomework(id: string) {
    this.dialog.confirm('Are you sure you want to delete this assignment?', 'Delete Homework').subscribe(confirmed => {
      if (confirmed) {
        this.homeworkService.deleteHomework(id).subscribe({
          next: () => {
            this.dialog.alert('Homework deleted.', 'Success', 'success').subscribe();
            this.loadHomeworks();
          },
          error: () => {
            this.dialog.alert('Failed to delete homework.', 'Error', 'error').subscribe();
          }
        });
      }
    });
  }

  getClassName(classId: string): string {
    const cls = this.classes.find(c => c.id === classId);
    return cls ? cls.name : classId;
  }

  openSubmissions(hw: Homework) {
    this.selectedHomework = hw;
    this.showSubmissions = true;
    this.isLoadingSubmissions = true;
    this.homeworkService.getHomeworkSubmissions(hw.id!).subscribe({
      next: (subs) => {
        this.submissions = subs;
        this.isLoadingSubmissions = false;
      },
      error: () => {
        this.isLoadingSubmissions = false;
        this.dialog.alert('Failed to load submissions.', 'Error', 'error').subscribe();
      }
    });
  }

  closeSubmissions() {
    this.showSubmissions = false;
    this.selectedHomework = null;
    this.submissions = [];
  }

  gradeSubmission(sub: HomeworkSubmission, score: string, feedback: string) {
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore)) {
      this.dialog.alert('Please enter a valid numeric score.', 'Validation Error', 'error').subscribe();
      return;
    }
    
    this.homeworkService.gradeSubmission(sub.id!, parsedScore, feedback).subscribe({
      next: () => {
        this.dialog.alert('Submission graded successfully.', 'Success', 'success').subscribe();
        sub.status = 'GRADED';
        sub.score = parsedScore;
        sub.feedback = feedback;
        if (this.speedGraderActive) {
          this.closeSpeedGrader();
        }
      },
      error: () => {
        this.dialog.alert('Failed to grade submission.', 'Error', 'error').subscribe();
      }
    });
  }

  // SpeedGrader Methods
  openSpeedGrader(sub: HomeworkSubmission) {
    this.activeSubmission = sub;
    this.speedGraderActive = true;
    this.rubricScores = {
      content: Math.min(40, Math.round((sub.score || 80) * 0.4)),
      methodology: Math.min(40, Math.round((sub.score || 80) * 0.4)),
      presentation: Math.min(20, Math.round((sub.score || 80) * 0.2))
    };
  }

  closeSpeedGrader() {
    this.speedGraderActive = false;
    this.activeSubmission = null;
  }

  getRubricTotal(): number {
    return this.rubricScores.content + this.rubricScores.methodology + this.rubricScores.presentation;
  }

  toggleBlindGrading() {
    this.blindGradingMode = !this.blindGradingMode;
  }

  getMaskedStudentId(id: string): string {
    if (!this.blindGradingMode) return id;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return `Candidate #${Math.abs(hash).toString(16).toUpperCase().substring(0, 6)}`;
  }
}
