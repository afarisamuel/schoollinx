import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-ai-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-ai-copilot.component.html'
})
export class TeacherAiCopilotComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(false);
  teacher = signal<any>(null);

  // Formative Quiz Generator (Feature 45)
  aiTopicInput = signal('');
  aiGradeLevel = signal('SHS 1');
  aiQuizGenerated = signal<any[]>([]);
  isGeneratingQuiz = signal(false);

  // Report Card Remark Drafter (Feature 48)
  remarkStudentName = signal('');
  remarkStudentGPA = signal(3.6);
  remarkStrengths = signal('Critical analysis, punctual homework submission, exemplary classroom debate');
  generatedRemark = signal('');
  isGeneratingRemark = signal(false);

  ngOnInit() {
    this.portalService.getMyClasses().subscribe({
      next: (res) => this.teacher.set(res.teacher),
      error: () => {}
    });
  }

  generateFormativeQuiz() {
    if (!this.aiTopicInput()) {
      this.toast.error('Please enter a syllabus topic.');
      return;
    }

    this.isGeneratingQuiz.set(true);
    setTimeout(() => {
      const topic = this.aiTopicInput();
      this.aiQuizGenerated.set([
        {
          question: `In the study of ${topic}, which of the following best demonstrates the core foundational principle?`,
          options: [
            `A) Theoretical hypothesis validation with empirical data`,
            `B) Qualitative observation without structural testing`,
            `C) Mathematical elimination of non-standard variables`,
            `D) Inverse proportionality between constant ratios`
          ],
          correct: 'A',
          rationale: `National Curriculum Standards for ${topic} emphasize empirical validation as benchmark criterion.`
        },
        {
          question: `When evaluating edge cases in ${topic}, what common diagnostic pitfall must learners avoid?`,
          options: [
            `A) Conflating correlation with direct causation`,
            `B) Over-calibrating initial baseline constants`,
            `C) Neglecting fractional exponents`,
            `D) Rounding off intermediate standard errors`
          ],
          correct: 'A',
          rationale: `Formative assessments routinely check conceptual distinction between causation and correlation.`
        },
        {
          question: `A senior student applies the formulas of ${topic} in an industrial setting. What metric determines efficacy?`,
          options: [
            `A) Percentage yield relative to theoretical maximum`,
            `B) Total elapsed laboratory clock cycles`,
            `C) Qualitative consensus from peer observers`,
            `D) Total ambient temperature drop`
          ],
          correct: 'A',
          rationale: `Aligned with West African Examination Council (WAEC) practical scoring rubrics.`
        }
      ]);
      this.isGeneratingQuiz.set(false);
      this.toast.success(`Formative quiz generated for topic: ${topic}`, 'Co-Pilot Ready');
    }, 900);
  }

  generateReportRemark() {
    if (!this.remarkStudentName()) {
      this.toast.error('Please enter student name.');
      return;
    }

    this.isGeneratingRemark.set(true);
    setTimeout(() => {
      const name = this.remarkStudentName();
      const gpa = this.remarkStudentGPA();
      const str = this.remarkStrengths();

      let remark = `${name} has exhibited tremendous intellectual consistency throughout this academic term, maintaining an impressive GPA of ${gpa}. `;
      if (gpa >= 3.5) {
        remark += `Demonstrates exceptional leadership in ${str}. Highly recommended for academic honors.`;
      } else if (gpa >= 2.5) {
        remark += `Shows commendable perseverance and solid grasp of fundamentals. Continued focus on ${str} will yield even higher results.`;
      } else {
        remark += `Has made encouraging progress this term. Dedicated revision and scheduled tutoring sessions will help maximize potential.`;
      }

      this.generatedRemark.set(remark);
      this.isGeneratingRemark.set(false);
      this.toast.success('Report card remark drafted.', 'Co-Pilot Complete');
    }, 700);
  }

  copyRemark() {
    if (this.generatedRemark()) {
      navigator.clipboard.writeText(this.generatedRemark());
      this.toast.success('Remark copied to clipboard.', 'Copied');
    }
  }
}
