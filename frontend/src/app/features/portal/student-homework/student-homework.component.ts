import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeworkService } from '../../../core/infrastructure/academic/homework.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Homework, HomeworkSubmission } from '../../../core/domain/homework.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-student-homework',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-homework.component.html',
  styleUrl: './student-homework.component.css'
})
export class StudentHomeworkComponent implements OnInit {
  private homeworkService = inject(HomeworkService);
  private authService = inject(AuthService);
  private studentService = inject(StudentService);
  private dialogService = inject(DialogService);

  homeworks: Homework[] = [];
  submissions: HomeworkSubmission[] = [];
  isLoading = true;
  studentId: string | null = null;
  studentClassId: string | null = null;
  
  // Submission modal state
  selectedHomework: Homework | null = null;
  submissionContent: string = '';
  submissionFileUrl: string = '';
  isSubmitting = false;

  ngOnInit() {
    this.loadStudentData();
  }

  loadStudentData() {
    const user = this.authService.currentUserValue;
    if (user && user.id && user.role === 'STUDENT') {
      // Find the student's class (class_id)
      this.studentService.getStudent(user.id).subscribe({
        next: (student) => {
          if (student && student.class_id) {
            this.studentId = student.id || null;
            this.studentClassId = student.class_id;
            this.loadHomeworksAndSubmissions();
          } else {
            this.isLoading = false;
          }
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  loadHomeworksAndSubmissions() {
    if (!this.studentClassId || !this.studentId) return;

    this.homeworkService.getHomeworksByClass(this.studentClassId).subscribe({
      next: (hw) => {
        this.homeworks = hw;
        
        // Fetch submissions for all homeworks sequentially or in parallel
        // For simplicity, we fetch them individually or the backend might already embed them.
        // Let's assume we need to fetch individually since we changed the API
        this.isLoading = false;
        
        this.homeworks.forEach(h => {
           this.homeworkService.getStudentSubmission(h.id!, this.studentId!).subscribe({
              next: (sub) => {
                  if (sub) {
                      this.submissions.push(sub);
                  }
              },
              error: () => {
                  // Ignore 404s (no submission yet)
              }
           });
        });
      },
      error: () => this.isLoading = false
    });
  }

  getSubmissionForHomework(homeworkId: string | undefined): HomeworkSubmission | undefined {
    if (!homeworkId) return undefined;
    return this.submissions.find(s => s.homework_id === homeworkId);
  }

  openSubmitModal(homework: Homework) {
    this.selectedHomework = homework;
    const existing = this.getSubmissionForHomework(homework.id);
    if (existing) {
        this.submissionContent = existing.content;
        this.submissionFileUrl = existing.file_url || '';
    } else {
        this.submissionContent = '';
        this.submissionFileUrl = '';
    }
  }

  closeSubmitModal() {
    this.selectedHomework = null;
  }

  submitHomework() {
    if (!this.selectedHomework?.id || !this.studentId) return;
    
    if (!this.submissionContent.trim() && !this.submissionFileUrl.trim()) {
        this.dialogService.alert('Please provide some content or a file URL for your submission.', 'Error', 'error');
        return;
    }

    this.isSubmitting = true;
    
    // Check if it's late
    const isLate = new Date() > new Date(this.selectedHomework.due_date);
    
    const sub: Partial<HomeworkSubmission> = {
        homework_id: this.selectedHomework.id,
        student_id: this.studentId,
        content: this.submissionContent,
        file_url: this.submissionFileUrl,
        status: isLate ? 'LATE' : 'SUBMITTED'
    };

    this.homeworkService.submitHomework(this.selectedHomework.id, sub).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.submissions.push(result);
        this.closeSubmitModal();
        this.dialogService.alert('Your assignment has been successfully submitted to the teacher.', 'Homework Submitted', 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.dialogService.alert(err.message || 'There was an error submitting your homework. Please try again.', 'Submission Failed', 'error');
      }
    });
  }

  get upcomingHomeworks() {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.homeworks.filter(hw => new Date(hw.due_date) >= today);
  }

  get overdueHomeworks() {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.homeworks.filter(hw => new Date(hw.due_date) < today);
  }
}
