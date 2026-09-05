import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, DisciplinaryIncident } from '../../../core/infrastructure/campus-ops/campus-ops.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Student } from '../../../core/domain/student.model';

@Component({
    selector: 'app-disciplinary',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './disciplinary.component.html',
    styles: []
})
export class DisciplinaryComponent implements OnInit {
    private opsService = inject(CampusOpsService);
    private studentService = inject(StudentService);
    private authService = inject(AuthService);

    incidents: DisciplinaryIncident[] = [];
    students: Student[] = [];
    currentStudentId = '';

    newIncident: Partial<DisciplinaryIncident> = {
        student_id: '',
        incident_type: 'Tardiness',
        description: '',
        action_taken: '',
        points_deducted: 0
    };

    incidentTypes = ['Tardiness', 'Disruptive Behavior', 'Bullying', 'Vandalism', 'Academic Dishonesty', 'Other'];

    ngOnInit(): void {
        this.loadStudents();
    }

    loadStudents(): void {
        this.studentService.getStudents().subscribe(students => {
            this.students = students || [];
            if (this.students.length > 0) {
                this.currentStudentId = this.students[0].id || '';
                this.newIncident.student_id = this.currentStudentId;
                this.loadIncidents();
            }
        });
    }

    onStudentChange(studentId: string): void {
        this.currentStudentId = studentId;
        this.newIncident.student_id = studentId;
        this.loadIncidents();
    }

    loadIncidents(): void {
        if (!this.currentStudentId) return;
        this.opsService.getStudentIncidents(this.currentStudentId).subscribe(data => {
            this.incidents = data || [];
        });
    }

    reportIncident(): void {
        if (!this.newIncident.incident_type || !this.newIncident.description || !this.currentStudentId) return;
        
        const currentUser = this.authService.currentUserValue;
        this.newIncident.reported_by_id = currentUser?.id || undefined;
        this.newIncident.student_id = this.currentStudentId;
        
        this.opsService.reportIncident(this.newIncident).subscribe(() => {
            this.loadIncidents();
            this.newIncident = { 
                student_id: this.currentStudentId, 
                incident_type: 'Tardiness', 
                description: '', 
                action_taken: '', 
                points_deducted: 0 
            };
        });
    }

    resolveIncident(id: string): void {
        this.opsService.resolveIncident(id).subscribe(() => {
            this.loadIncidents();
        });
    }
}
