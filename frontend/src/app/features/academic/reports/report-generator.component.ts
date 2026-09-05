import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportCardService, ReportCardTemplate, ReportCard } from '../../../core/infrastructure/report/report-card.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { AcademicPeriodService } from '../../../core/infrastructure/academic-period/academic-period.service';
import { Student } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-generator.component.html'
})
export class ReportGeneratorComponent implements OnInit {
  private reportSvc = inject(ReportCardService);
  private studentSvc = inject(StudentService);
  private apService = inject(AcademicPeriodService);
  private toast = inject(ToastService);

  templates = signal<ReportCardTemplate[]>([]);
  students = signal<Student[]>([]);
  
  selectedTemplateId = signal<string>('');
  selectedStudentId = signal<string>('');
  academicPeriodId = signal<string>('');
  
  isGenerating = signal(false);
  generatedReport = signal<ReportCard | null>(null);

  ngOnInit() {
    this.loadTemplates();
    this.loadStudents();
    this.loadActivePeriod();
  }

  loadActivePeriod() {
    this.apService.getActive().subscribe({
      next: (period) => {
        if (period?.id) {
          this.academicPeriodId.set(period.id);
        }
      },
      error: () => {}
    });
  }

  loadTemplates() {
    this.reportSvc.getTemplates().subscribe(data => this.templates.set(data || []));
  }
  
  loadStudents() {
    this.studentSvc.getStudents().subscribe(data => this.students.set(data || []));
  }

  generateReport() {
    if (!this.selectedTemplateId() || !this.selectedStudentId()) return;
    
    this.isGenerating.set(true);
    
    const req: ReportCard = {
      student_id: this.selectedStudentId(),
      academic_period_id: this.academicPeriodId(),
      template_id: this.selectedTemplateId()
    };

    this.reportSvc.generateReport(req).subscribe({
      next: (res) => {
        this.generatedReport.set(res);
        this.isGenerating.set(false);
      },
      error: () => {
        this.isGenerating.set(false);
        this.toast.error('Failed to generate report card from server.');
      }
    });
  }

  publishReport() {
    const report = this.generatedReport();
    if (!report?.id) return;
    
    const pdfUrl = `/api/reports/${report.id}/pdf`;
    
    this.reportSvc.publishReport(report.id, pdfUrl).subscribe({
      next: () => {
        this.toast.success('Report published successfully! Parents can now view it.', 'Report Published');
        this.generatedReport.set(null);
      },
      error: () => {
        this.toast.error('Failed to publish report card.');
      }
    });
  }
}
