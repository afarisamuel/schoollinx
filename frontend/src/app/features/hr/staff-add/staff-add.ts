import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffProfile } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-staff-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff-add.html',
})
export class StaffAdd {
  private hrService = inject(HrService);
  private router = inject(Router);

  isSaving = signal(false);

  form = signal<Partial<StaffProfile>>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    base_salary: 0,
    bank_account: '',
    hire_date: new Date().toISOString().split('T')[0],
  });

  readonly departments = [
    'Administration', 'Science', 'Mathematics', 'Languages', 'Social Studies',
    'Arts & Culture', 'Physical Education', 'ICT', 'Guidance & Counseling', 'Support Staff'
  ];

  saveStaff(event: Event): void {
    event.preventDefault();
    this.isSaving.set(true);
    
    const payload = { ...this.form() };
    if (payload.hire_date && !payload.hire_date.includes('T')) {
      payload.hire_date = new Date(payload.hire_date).toISOString();
    }
    
    this.hrService.createStaffProfile(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/hr/staff']);
      },
      error: (err) => {
        console.error('Error creating staff profile', err);
        this.isSaving.set(false);
      }
    });
  }

  updateForm(field: keyof StaffProfile, value: any): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }
}
