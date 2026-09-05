import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffProfile } from '../../../core/domain/hr/hr.model';
import { StaffDetailsModalComponent } from '../staff-details-modal/staff-details-modal';

@Component({
  selector: 'app-staff-directory',
  standalone: true,
  imports: [CommonModule, RouterLink, StaffDetailsModalComponent],
  templateUrl: './staff-directory.html',
  styleUrls: ['./staff-directory.css']
})
export class StaffDirectory implements OnInit {
  private hrService = inject(HrService);
  
  staffList = signal<StaffProfile[]>([]);
  selectedStaffForDetails = signal<StaffProfile | null>(null);
  
  searchTerm = signal<string>('');
  selectedDepartment = signal<string>('');

  departments = computed(() => {
    const deps = new Set(this.staffList().map(s => s.department).filter(Boolean));
    return Array.from(deps);
  });

  totalStaffCount = computed(() => this.staffList().length);

  academicCount = computed(() => {
    const academicKeywords = ['teach', 'faculty', 'science', 'math', 'language', 'social', 'art', 'educat', 'lectur', 'tutor'];
    return this.staffList().filter(s => {
      const combined = `${s.department || ''} ${s.job_title || ''}`.toLowerCase();
      return academicKeywords.some(k => combined.includes(k));
    }).length;
  });

  adminSupportCount = computed(() => {
    return Math.max(0, this.totalStaffCount() - this.academicCount());
  });

  filteredStaff = computed(() => {
    let result = [...this.staffList()];
    
    const dept = this.selectedDepartment();
    if (dept) {
      result = result.filter(s => s.department === dept);
    }

    const term = this.searchTerm();
    if (term) {
      result = result.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
        (s.email?.toLowerCase().includes(term)) ||
        (s.job_title?.toLowerCase().includes(term)) ||
        (s.department?.toLowerCase().includes(term)) ||
        (s.phone_number?.includes(term))
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.loadStaff();
  }

  // --- UI State ---
  isLoading = false;
  isDeleteModalOpen = false;
  staffToDelete: StaffProfile | null = null;
  isDeleting = false;

  openDetails(staff: StaffProfile) {
    this.selectedStaffForDetails.set(staff);
  }

  loadStaff(): void {
    this.isLoading = true;
    this.hrService.getStaffProfiles().subscribe({
      next: (res) => {
        this.staffList.set(res || []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading staff', err);
        this.isLoading = false;
      }
    });
  }

  // --- Deletion Flow ---
  openDeleteModal(staff: StaffProfile): void {
    this.staffToDelete = staff;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.staffToDelete = null;
  }

  confirmDelete(): void {
    if (!this.staffToDelete) return;
    this.isDeleting = true;
    this.hrService.deleteStaffProfile(this.staffToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadStaff();
      },
      error: (err) => {
        console.error('Error deleting staff', err);
        this.isDeleting = false;
        this.closeDeleteModal();
      }
    });
  }

  exportToCSV(): void {
    const staff = this.staffList();
    if (staff.length === 0) return;
    
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Department', 'Hire Date'];
    const csvData = staff.map(s => [
      s.id,
      s.first_name,
      s.last_name,
      s.email,
      s.phone_number,
      s.job_title,
      s.department,
      s.hire_date
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'staff_directory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value.toLowerCase().trim());
  }

  onDepartmentChange(event: Event): void {
    this.selectedDepartment.set((event.target as HTMLSelectElement).value);
  }

  getInitials(staff: StaffProfile): string {
    return `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || ''}`.toUpperCase() || '?';
  }
}
