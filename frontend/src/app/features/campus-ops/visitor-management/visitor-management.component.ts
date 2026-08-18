import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, VisitorLog } from '../../../core/infrastructure/campus-ops/campus-ops.service';

@Component({
    selector: 'app-visitor-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './visitor-management.component.html',
    styles: []
})
export class VisitorManagementComponent implements OnInit {
    activeVisitors: VisitorLog[] = [];
    
    newVisitor: Partial<VisitorLog> = {
        name: '',
        phone: '',
        purpose: '',
        badge_number: ''
    };

    constructor(private opsService: CampusOpsService) {}

    ngOnInit(): void {
        this.loadVisitors();
    }

    loadVisitors(): void {
        this.opsService.getActiveVisitors().subscribe(data => {
            this.activeVisitors = data;
        });
    }

    signIn(): void {
        if (!this.newVisitor.name || !this.newVisitor.purpose) return;
        
        // Use a dummy host ID for now
        this.newVisitor.host_id = '00000000-0000-0000-0000-000000000001';
        
        this.opsService.signInVisitor(this.newVisitor).subscribe(() => {
            this.loadVisitors();
            this.newVisitor = { name: '', phone: '', purpose: '', badge_number: '' };
        });
    }

    signOut(id: string): void {
        this.opsService.signOutVisitor(id).subscribe(() => {
            this.loadVisitors();
        });
    }
}
