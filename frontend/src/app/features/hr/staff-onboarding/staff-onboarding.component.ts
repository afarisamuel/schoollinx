import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface OnboardingChecklist {
    id: string;
    staff_id: string;
    contract_signed: boolean;
    id_provided: boolean;
    bank_details_verified: boolean;
    equipment_assigned: boolean;
    orientation_completed: boolean;
    status: 'PENDING' | 'COMPLETED';
}

const ITEMS: Array<{ key: keyof OnboardingChecklist; label: string; description: string }> = [
    { key: 'contract_signed', label: 'Contract Signed', description: 'Employment contract reviewed and signed by the new hire.' },
    { key: 'id_provided', label: 'ID Provided', description: 'National ID or passport copy submitted and verified.' },
    { key: 'bank_details_verified', label: 'Bank Details Verified', description: 'Bank account details confirmed for payroll setup.' },
    { key: 'equipment_assigned', label: 'Equipment Assigned', description: 'Laptop, access cards, and other equipment issued.' },
    { key: 'orientation_completed', label: 'Orientation Completed', description: 'Onboarding session and school tour completed.' },
];

@Component({
    selector: 'app-staff-onboarding',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './staff-onboarding.component.html',
    styleUrl: './staff-onboarding.component.css'
})
export class StaffOnboardingComponent implements OnInit {
    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);

    staffId = signal<string>('');
    checklist = signal<OnboardingChecklist | null>(null);
    isLoading = signal(true);
    isSaving = signal(false);
    items = ITEMS;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('staffId') || '';
        this.staffId.set(id);
        this.loadChecklist(id);
    }

    loadChecklist(staffId: string) {
        this.isLoading.set(true);
        this.http.get<OnboardingChecklist>(`/api/hr/onboarding/${staffId}`).subscribe({
            next: (data) => { this.checklist.set(data); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
    }

    toggle(key: keyof OnboardingChecklist) {
        this.checklist.update(c => c ? { ...c, [key]: !c[key] } : c);
    }

    save() {
        const c = this.checklist();
        if (!c) return;
        this.isSaving.set(true);
        this.http.put(`/api/hr/onboarding/${this.staffId()}`, c).subscribe({
            next: () => { this.isSaving.set(false); this.loadChecklist(this.staffId()); },
            error: () => this.isSaving.set(false)
        });
    }

    getValue(key: keyof OnboardingChecklist): boolean {
        const c = this.checklist();
        return c ? (c[key] as boolean) : false;
    }

    get completedCount(): number {
        const c = this.checklist();
        if (!c) return 0;
        return this.items.filter(i => c[i.key] as boolean).length;
    }

    get progressPct(): number {
        return Math.round((this.completedCount / this.items.length) * 100);
    }
}
