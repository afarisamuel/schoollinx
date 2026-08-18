import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffProfile } from '../../../core/domain/hr/hr.model';

@Component({
  selector: 'app-staff-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './staff-edit.html',
  styleUrls: ['./staff-edit.css']
})
export class StaffEdit implements OnInit {
  private hrService = inject(HrService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isSaving = signal(false);
  isLoading = signal(true);
  staffId = '';

  form = signal<Partial<StaffProfile>>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    base_salary: 0,
    bank_account: '',
    hire_date: '',
  });

  readonly departments = [
    'Administration', 'Science', 'Mathematics', 'Languages', 'Social Studies',
    'Arts & Culture', 'Physical Education', 'ICT', 'Guidance & Counseling', 'Support Staff'
  ];

  ngOnInit(): void {
    this.staffId = this.route.snapshot.paramMap.get('id') || '';
    if (this.staffId) {
      this.hrService.getStaffProfiles().subscribe({
        next: (profiles) => {
          const profile = profiles?.find(p => p.id === this.staffId);
          if (profile) {
            this.form.set({
              ...profile,
              hire_date: profile.hire_date ? new Date(profile.hire_date).toISOString().split('T')[0] : ''
            });
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading staff for edit', err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  saveStaff(event: Event): void {
    event.preventDefault();
    if (!this.staffId) return;
    
    this.isSaving.set(true);

    const payload = { ...this.form() };
    if (payload.hire_date && !payload.hire_date.includes('T')) {
      payload.hire_date = new Date(payload.hire_date).toISOString();
    }

    this.hrService.updateStaffProfile(this.staffId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/hr/staff']);
      },
      error: (err) => {
        console.error('Error updating staff profile', err);
        this.isSaving.set(false);
      }
    });
  }

  updateForm(field: keyof StaffProfile, value: any): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }
}
