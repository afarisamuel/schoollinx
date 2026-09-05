import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, VisitorLog } from '../../../core/infrastructure/campus-ops/campus-ops.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-visitor-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './visitor-management.component.html',
    styles: []
})
export class VisitorManagementComponent implements OnInit {
    private opsService = inject(CampusOpsService);
    private authService = inject(AuthService);

    activeVisitors: VisitorLog[] = [];
    
    newVisitor: Partial<VisitorLog> = {
        name: '',
        phone: '',
        purpose: '',
        badge_number: ''
    };

    ngOnInit(): void {
        this.loadVisitors();
    }

    loadVisitors(): void {
        this.opsService.getActiveVisitors().subscribe(data => {
            this.activeVisitors = data || [];
        });
    }

    signIn(): void {
        if (!this.newVisitor.name || !this.newVisitor.purpose) return;
        
        const currentUser = this.authService.currentUserValue;
        this.newVisitor.host_id = currentUser?.id || undefined;
        
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
