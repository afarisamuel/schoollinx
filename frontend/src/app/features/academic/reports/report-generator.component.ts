import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportCardService, ReportCardTemplate, ReportCard } from '../../../core/infrastructure/report/report-card.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-generator.component.html'
})
export class ReportGeneratorComponent implements OnInit {
  templates = signal<ReportCardTemplate[]>([]);
  students = signal<Student[]>([]);
  
  selectedTemplateId = signal<string>('');
  selectedStudentId = signal<string>('');
  
  // Hardcoded for demo
  academicPeriodId = '55555555-5555-5555-5555-555555555555';
  
  isGenerating = signal(false);
  generatedReport = signal<ReportCard | null>(null);

  constructor(
    private reportSvc: ReportCardService,
    private studentSvc: StudentService
  ) {}

  ngOnInit() {
    this.loadTemplates();
    this.loadStudents();
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
      academic_period_id: this.academicPeriodId,
      template_id: this.selectedTemplateId(),
      rendered_data: { 
        remarks: "Excellent performance this term.",
        attendance_percentage: 95
      } // Dummy data
    };

    this.reportSvc.generateReport(req).subscribe({
      next: (res) => {
        this.generatedReport.set(res);
        this.isGenerating.set(false);
      },
      error: () => {
        this.isGenerating.set(false);
        alert('Failed to generate report');
      }
    });
  }

  publishReport() {
    const report = this.generatedReport();
    if (!report) return;
    
    // In reality, this URL would come from a PDF generator service or S3 upload
    const dummyPdfUrl = `https://cdn.example.com/reports/${report.id}.pdf`;
    
    this.reportSvc.publishReport(report.id!, dummyPdfUrl).subscribe(() => {
      alert('Report published successfully! Parents can now view it.');
      this.generatedReport.set(null);
    });
  }
}
