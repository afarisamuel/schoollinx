import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GradeService } from '../../../core/infrastructure/grade/grade.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Grade } from '../../../core/domain/grade.model';
import { Student } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';

@Component({
  selector: 'app-report-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-card.component.html',
  styleUrl: './report-card.component.css'
})
export class ReportCardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private gradeService = inject(GradeService);
  private studentService = inject(StudentService);
  private tenantProfileService = inject(TenantProfileService);
  private dialog = inject(DialogService);

  studentId: string = '';
  student: Student | null = null;
  tenantProfile: TenantProfile | null = null;
  grades: Grade[] = [];
  
  terms: string[] = ['Term 1', 'Term 2', 'Term 3'];
  selectedTerm: string = 'Term 1';
  currentYear: number = new Date().getFullYear();

  isLoading = false;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.studentId = params.get('studentId') || '';
      if (this.studentId) {
        this.loadStudentData();
      }
    });
  }

  loadStudentData() {
    this.isLoading = true;
    this.studentService.getStudent(this.studentId).subscribe(student => {
      this.student = student;
      this.loadGrades();
    });
    this.tenantProfileService.getProfile().subscribe(profile => {
      this.tenantProfile = profile;
    });
  }

  loadGrades() {
    this.gradeService.getGradesForStudent(this.studentId).subscribe(grades => {
      this.grades = grades;
      this.isLoading = false;
    });
  }

  setTerm(term: string) {
    this.selectedTerm = term;
  }

  get termGrades() {
    return this.grades.filter(g => g.term === this.selectedTerm);
  }

  get gpa() {
    const termGrades = this.termGrades;
    if (termGrades.length === 0) return 0;

    let totalPercentage = 0;
    termGrades.forEach(g => {
      const max = g.max_score || 100;
      totalPercentage += (g.score / max) * 100;
    });

    return (totalPercentage / termGrades.length).toFixed(2);
  }

  printReportCard() {
    window.print();
  }
}
