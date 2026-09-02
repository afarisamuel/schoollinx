import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { Guardian, Student, FamilyLedgerSummary } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';

@Component({
  selector: 'app-guardian-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, StudentSearchDropdownComponent],
  templateUrl: './guardian-detail.component.html'
})
export class GuardianDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private guardianService = inject(GuardianService);
  private dialog = inject(DialogService);
  private fb = inject(FormBuilder);

  guardianId = signal<string>('');
  guardian = signal<Guardian | null>(null);
  familyLedger = signal<FamilyLedgerSummary | null>(null);
  isLoading = signal<boolean>(true);

  // Link Student Modal
  showLinkModal = signal<boolean>(false);
  selectedStudentToLink = signal<Student | null>(null);
  isLinking = signal<boolean>(false);

  // Edit Modal
  showEditModal = signal<boolean>(false);
  isUpdating = signal<boolean>(false);

  editForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    phone_number: ['', [Validators.required]],
    email: ['', [Validators.email]],
    relationship: ['Parent', [Validators.required]],
    address: [''],
    gender: ['Male'],
    is_primary: [true],
    can_pickup: [true]
  });

  relationships = ['Parent', 'Father', 'Mother', 'Legal Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Sponsor', 'Other'];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.guardianId.set(id);
        this.loadGuardian();
        this.loadFamilyLedger();
      }
    });
  }

  loadGuardian() {
    this.isLoading.set(true);
    this.guardianService.getById(this.guardianId()).subscribe({
      next: (data) => {
        this.guardian.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.dialog.alert('Failed to load guardian details: ' + (err.error?.error || err.message), 'Error', 'error');
      }
    });
  }

  loadFamilyLedger() {
    this.guardianService.getFamilyLedger(this.guardianId()).subscribe({
      next: (ledger) => {
        this.familyLedger.set(ledger);
      },
      error: () => {}
    });
  }

  openLinkModal() {
    this.selectedStudentToLink.set(null);
    this.showLinkModal.set(true);
  }

  closeLinkModal() {
    this.showLinkModal.set(false);
  }

  onStudentSelected(student: Student) {
    this.selectedStudentToLink.set(student);
  }

  submitLinkStudent() {
    const student = this.selectedStudentToLink();
    if (!student || !student.id) {
      this.dialog.alert('Please search and select a student to link.', 'Select Student', 'warning');
      return;
    }

    // Check if student is already linked
    const existing = this.guardian()?.students || [];
    if (existing.some(s => s.id === student.id)) {
      this.dialog.alert('This student is already linked to this guardian.', 'Already Linked', 'info');
      return;
    }

    this.isLinking.set(true);
    this.guardianService.linkStudent(this.guardianId(), student.id).subscribe({
      next: () => {
        this.isLinking.set(false);
        this.closeLinkModal();
        this.dialog.alert(`${student.first_name} ${student.last_name} has been linked to this guardian successfully!`, 'Linked', 'success');
        this.loadGuardian();
      },
      error: (err) => {
        this.isLinking.set(false);
        this.dialog.alert(err.error?.error || 'Failed to link student.', 'Error', 'error');
      }
    });
  }

  unlinkStudent(student: Student) {
    if (!student.id) return;
    const studentName = `${student.first_name} ${student.last_name}`;

    this.dialog.confirm(
      `Unlink ward "${studentName}" from this guardian? The student's records will not be deleted, only the guardian link.`,
      'Unlink Student',
      'warning',
      'Unlink'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.guardianService.unlinkStudent(this.guardianId(), student.id!).subscribe({
          next: () => {
            this.dialog.alert(`${studentName} unlinked successfully.`, 'Unlinked', 'info');
            this.loadGuardian();
          },
          error: (err) => {
            this.dialog.alert(err.error?.error || 'Failed to unlink student.', 'Error', 'error');
          }
        });
      }
    });
  }

  openEditModal() {
    const g = this.guardian();
    if (!g) return;

    this.editForm.patchValue({
      first_name: g.first_name,
      last_name: g.last_name,
      phone_number: g.phone_number,
      email: g.email || '',
      relationship: g.relationship || 'Parent',
      address: g.address || '',
      gender: g.gender || 'Male',
      is_primary: g.is_primary ?? true,
      can_pickup: g.can_pickup ?? true
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEditGuardian() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isUpdating.set(true);
    const formVal = this.editForm.value;
    const payload: Partial<Guardian> = {
      first_name: formVal.first_name!.trim(),
      last_name: formVal.last_name!.trim(),
      phone_number: formVal.phone_number!.trim(),
      email: formVal.email?.trim() || undefined,
      relationship: formVal.relationship!,
      address: formVal.address?.trim() || undefined,
      gender: formVal.gender || 'Male',
      is_primary: formVal.is_primary ?? true,
      can_pickup: formVal.can_pickup ?? true
    };

    this.guardianService.updateGuardian(this.guardianId(), payload).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.dialog.alert('Guardian profile updated successfully.', 'Updated', 'success');
        this.loadGuardian();
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.dialog.alert(err.error?.error || 'Failed to update guardian.', 'Error', 'error');
      }
    });
  }

  resetPassword() {
    const g = this.guardian();
    if (!g || !g.id) return;

    const name = `${g.first_name} ${g.last_name}`;
    this.dialog.confirm(
      `Reset the portal password for ${name}? A new temporary password will be generated and emailed to them.`,
      'Reset Portal Password',
      'warning',
      'Generate New Password'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.guardianService.resetPassword(g.id!).subscribe({
          next: (res) => {
            this.dialog.alert(
              `Password reset successfully!<br><br><strong>Temporary Password:</strong> <code class="bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-mono font-bold">${res.password}</code><br><br>A notification has been sent to ${g.email || g.phone_number}.`,
              'Password Reset Complete',
              'success'
            );
          },
          error: (err) => {
            this.dialog.alert(err.error?.error || 'Failed to reset password.', 'Error', 'error');
          }
        });
      }
    });
  }

  deleteGuardian() {
    const g = this.guardian();
    if (!g || !g.id) return;

    const name = `${g.first_name} ${g.last_name}`;
    const count = g.students?.length || 0;
    const warning = count > 0 ? `This guardian is currently linked to ${count} student(s).` : '';

    this.dialog.confirm(
      `Are you sure you want to permanently delete guardian "${name}"? ${warning}`,
      'Delete Guardian',
      'danger',
      'Delete'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.guardianService.deleteGuardian(g.id!).subscribe({
          next: () => {
            this.dialog.alert(`Guardian "${name}" deleted.`, 'Deleted', 'info');
            this.router.navigate(['/guardians']);
          },
          error: (err) => {
            this.dialog.alert(err.error?.error || 'Failed to delete guardian.', 'Error', 'error');
          }
        });
      }
    });
  }
}
