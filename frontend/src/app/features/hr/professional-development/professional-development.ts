import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface StaffProfile {
    id: string;
    first_name: string;
    last_name: string;
    job_title: string;
}

interface ProfDev {
    id: string;
    staff_id: string;
    course_name: string;
    provider: string;
    completion_date: string;
    cost: number;
    status: string;
    created_at: string;
}

@Component({
    selector: 'app-professional-development',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './professional-development.html',
})
export class ProfessionalDevelopment implements OnInit {
    private http = inject(HttpClient);

    staffList = signal<StaffProfile[]>([]);
    records = signal<ProfDev[]>([]);
    loading = signal(true);
    selectedStaffId = signal('');
    showForm = signal(false);

    // Form fields
    formStaffId = '';
    formCourseName = '';
    formProvider = '';
    formCompletionDate = '';
    formCost = 0;
    formStatus = 'IN_PROGRESS';

    ngOnInit() {
        this.loadStaff();
    }

    loadStaff() {
        this.http.get<StaffProfile[]>(`${environment.apiUrl}/hr/staff`).subscribe({
            next: (data) => {
                this.staffList.set(data || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    loadRecords(staffId: string) {
        this.selectedStaffId.set(staffId);
        this.loading.set(true);
        this.http.get<ProfDev[]>(`${environment.apiUrl}/hr/development/${staffId}`).subscribe({
            next: (data) => {
                this.records.set(data || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    submitRecord() {
        const record = {
            staff_id: this.formStaffId,
            course_name: this.formCourseName,
            provider: this.formProvider,
            completion_date: this.formCompletionDate ? new Date(this.formCompletionDate).toISOString() : new Date().toISOString(),
            cost: this.formCost,
            status: this.formStatus
        };

        this.http.post(`${environment.apiUrl}/hr/development`, record).subscribe({
            next: () => {
                this.showForm.set(false);
                this.formCourseName = '';
                this.formProvider = '';
                this.formCompletionDate = '';
                this.formCost = 0;
                this.formStatus = 'IN_PROGRESS';
                if (this.selectedStaffId()) {
                    this.loadRecords(this.selectedStaffId());
                }
            },
            error: (err) => console.error(err)
        });
    }

    getStatusColor(status: string): string {
        if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-400';
        if (status === 'IN_PROGRESS') return 'bg-blue-500/10 text-blue-400';
        return 'bg-rose-500/10 text-rose-400';
    }
}
