import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, DisciplinaryIncident } from '../../../core/infrastructure/campus-ops/campus-ops.service';

@Component({
    selector: 'app-disciplinary',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './disciplinary.component.html',
    styles: []
})
export class DisciplinaryComponent implements OnInit {
    incidents: DisciplinaryIncident[] = [];
    
    // In a real app, this is selected via a search/dropdown component
    currentStudentId = '00000000-0000-0000-0000-000000000002';

    newIncident: Partial<DisciplinaryIncident> = {
        student_id: this.currentStudentId,
        incident_type: 'Tardiness',
        description: '',
        action_taken: '',
        points_deducted: 0
    };

    incidentTypes = ['Tardiness', 'Disruptive Behavior', 'Bullying', 'Vandalism', 'Academic Dishonesty', 'Other'];

    constructor(private opsService: CampusOpsService) {}

    ngOnInit(): void {
        this.loadIncidents();
    }

    loadIncidents(): void {
        this.opsService.getStudentIncidents(this.currentStudentId).subscribe(data => {
            this.incidents = data;
        });
    }

    reportIncident(): void {
        if (!this.newIncident.incident_type || !this.newIncident.description) return;
        
        // Mock logged in user
        this.newIncident.reported_by_id = '00000000-0000-0000-0000-000000000001';
        
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
