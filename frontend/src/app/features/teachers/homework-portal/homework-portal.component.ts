import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeworkService } from '../../../core/infrastructure/academic/homework.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { SubjectService, Subject } from '../../../core/infrastructure/curriculum/subject.service';
import { Homework, HomeworkSubmission } from '../../../core/domain/homework.model';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-homework-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  showForm = false;
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;

  showSubmissions = false;
  selectedHomework: Homework | null = null;
  submissions: HomeworkSubmission[] = [];
  isLoadingSubmissions = false;

  formData: Partial<Homework> = {
    title: '',
    description: '',
    due_date: '',
    class_id: '',
    subject: ''
  };

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
      },
      error: () => {
        this.dialog.alert('Failed to grade submission.', 'Error', 'error').subscribe();
      }
    });
  }
}
