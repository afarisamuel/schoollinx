import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { GuardianService } from '../../../core/infrastructure/guardian/guardian.service';
import { Guardian, Student, AbsenceRequest } from '../../../core/domain/student.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-guardian-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './guardian-list.component.html'
})
export class GuardianListComponent implements OnInit {
  private guardianService = inject(GuardianService);
  private dialog = inject(DialogService);
  private fb = inject(FormBuilder);

  guardians = signal<Guardian[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  selectedRelationship = signal<string>('all');

  // Add Guardian Modal
  showAddModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedInitialStudent = signal<Student | null>(null);

  // Bulk Import Modal
  showImportModal = signal<boolean>(false);
  isImporting = signal<boolean>(false);
  selectedImportFile = signal<File | null>(null);

  // Absence Review Modal
  showAbsenceModal = signal<boolean>(false);
  allAbsenceRequests = signal<AbsenceRequest[]>([]);
  isLoadingAbsences = signal<boolean>(false);

  // Campaign
  isSendingInvites = signal<boolean>(false);

  // Newly generated credentials modal
  newCredentials = signal<{ guardian: Guardian; temp_password?: string; username: string } | null>(null);
  copied = signal<boolean>(false);

  guardianForm = this.fb.group({
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

  // KPIs
  totalGuardians = computed(() => this.guardians().length);
  activePortals = computed(() => this.guardians().filter(g => !!g.user_id).length);
  totalLinkedWards = computed(() => 
    this.guardians().reduce((acc, g) => acc + (g.students?.length || 0), 0)
  );

  relationships = ['Parent', 'Father', 'Mother', 'Legal Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Sponsor', 'Other'];

  filteredGuardians = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const rel = this.selectedRelationship();
    let list = this.guardians();

    if (rel !== 'all') {
      list = list.filter(g => g.relationship?.toLowerCase() === rel.toLowerCase());
    }

    if (query) {
      list = list.filter(g =>
        (g.first_name + ' ' + g.last_name).toLowerCase().includes(query) ||
        g.email?.toLowerCase().includes(query) ||
        g.phone_number?.includes(query) ||
        g.students?.some(s => (s.first_name + ' ' + s.last_name).toLowerCase().includes(query) || s.enrollment_num?.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit() {
    this.loadGuardians();
  }

  loadGuardians() {
    this.isLoading.set(true);
    this.guardianService.getAll().subscribe({
      next: (data) => {
        this.guardians.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.dialog.alert('Failed to load guardians: ' + (err.error?.error || err.message), 'Error', 'error');
        this.isLoading.set(false);
      }
    });
  }

  openAddModal() {
    this.guardianForm.reset({
      first_name: '',
      last_name: '',
      phone_number: '',
      email: '',
      relationship: 'Parent',
      address: '',
      gender: 'Male'
    });
    this.selectedInitialStudent.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  onStudentSelected(student: Student) {
    this.selectedInitialStudent.set(student);
  }

  clearInitialStudent() {
    this.selectedInitialStudent.set(null);
  }

  submitAddGuardian() {
    if (this.guardianForm.invalid) {
      this.guardianForm.markAllAsTouched();
      return;
    }

    const formVal = this.guardianForm.value;
    if (!formVal.phone_number && !formVal.email) {
      this.dialog.alert('Please provide at least a Phone Number or Email address to provision the Parent Portal account.', 'Contact Required', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    const payload: Partial<Guardian> = {
      first_name: formVal.first_name!.trim(),
      last_name: formVal.last_name!.trim(),
      phone_number: formVal.phone_number!.trim(),
      email: formVal.email?.trim() || undefined,
      relationship: formVal.relationship!,
      address: formVal.address?.trim() || undefined,
      gender: formVal.gender || 'Male'
    };

    this.guardianService.createGuardian(payload).subscribe({
      next: (res) => {
        const createdGuardian = res.guardian;
        const tempPassword = res.temp_password;

        // If an initial student was selected, link them immediately
        const initialStudent = this.selectedInitialStudent();
        if (initialStudent && createdGuardian.id && initialStudent.id) {
          this.guardianService.linkStudent(createdGuardian.id, initialStudent.id).subscribe({
            next: () => {
              this.loadGuardians();
            },
            error: (linkErr) => {
              console.error('Failed to link student:', linkErr);
              this.loadGuardians();
            }
          });
        } else {
          this.loadGuardians();
        }

        this.isSubmitting.set(false);
        this.closeAddModal();

        // Show credentials popup
        const username = createdGuardian.email || createdGuardian.phone_number;
        this.newCredentials.set({
          guardian: createdGuardian,
          temp_password: tempPassword,
          username: username
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.dialog.alert(err.error?.error || 'Failed to create guardian.', 'Error', 'error');
      }
    });
  }

  copyCredentials() {
    const creds = this.newCredentials();
    if (!creds) return;

    const text = `School Linx Parent Portal Credentials:\nUsername/Login: ${creds.username}\nTemporary Password: ${creds.temp_password}\nPortal Link: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 3000);
    });
  }

  closeCredentialsModal() {
    this.newCredentials.set(null);
  }

  resetPassword(guardian: Guardian) {
    if (!guardian.id) return;
    const name = `${guardian.first_name} ${guardian.last_name}`;
    this.dialog.confirm(
      `Reset the portal password for ${name}? A new temporary password will be generated and emailed to them.`,
      'Reset Portal Password',
      'warning',
      'Generate New Password'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.guardianService.resetPassword(guardian.id!).subscribe({
          next: (res) => {
            this.dialog.alert(
              `Password reset successfully!<br><br><strong>Temporary Password:</strong> <code class="bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-mono font-bold">${res.password}</code><br><br>Notification has been sent to ${guardian.email || guardian.phone_number}.`,
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

  deleteGuardian(guardian: Guardian) {
    if (!guardian.id) return;
    const name = `${guardian.first_name} ${guardian.last_name}`;
    const studentCount = guardian.students?.length || 0;
    const warning = studentCount > 0 
      ? `This will also unlink ${studentCount} student(s) from this guardian.` 
      : '';

    this.dialog.confirm(
      `Are you sure you want to delete guardian "${name}"? ${warning}`,
      'Delete Guardian',
      'danger',
      'Delete'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.guardianService.deleteGuardian(guardian.id!).subscribe({
          next: () => {
            this.dialog.alert(`Guardian "${name}" removed successfully.`, 'Deleted', 'info');
            this.loadGuardians();
          },
          error: (err) => {
            this.dialog.alert(err.error?.error || 'Failed to delete guardian.', 'Error', 'error');
          }
        });
      }
    });
  }

  // === Bulk Import ===
  openImportModal() {
    this.selectedImportFile.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedImportFile.set(file);
    }
  }

  downloadTemplate() {
    this.guardianService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'guardians_import_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.dialog.alert('Failed to download template file.', 'Error', 'error');
      }
    });
  }

  submitImport() {
    const file = this.selectedImportFile();
    if (!file) {
      this.dialog.alert('Please select a CSV file to upload.', 'File Required', 'warning');
      return;
    }

    this.isImporting.set(true);
    this.guardianService.importGuardians(file).subscribe({
      next: (res) => {
        this.isImporting.set(false);
        this.closeImportModal();
        this.dialog.alert(
          `Import finished successfully!<br><br><strong>Imported Guardians:</strong> ${res.imported}<br><strong>Skipped:</strong> ${res.skipped}`,
          'Bulk Ingestion Complete',
          'success'
        );
        this.loadGuardians();
      },
      error: (err) => {
        this.isImporting.set(false);
        this.dialog.alert(err.error?.error || 'Bulk import failed.', 'Error', 'error');
      }
    });
  }

  // === Portal Onboarding Campaign ===
  sendPortalInvites() {
    this.dialog.confirm(
      'This will generate secure credentials and send portal onboarding emails/notifications to all guardians. Are you sure you want to run this campaign?',
      'Broadcast Portal Invitations',
      'info',
      'Send Invitations'
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.isSendingInvites.set(true);
        this.guardianService.sendPortalInvites().subscribe({
          next: (res) => {
            this.isSendingInvites.set(false);
            this.dialog.alert(res.message || 'Onboarding invitations sent successfully.', 'Campaign Complete', 'success');
          },
          error: (err) => {
            this.isSendingInvites.set(false);
            this.dialog.alert(err.error?.error || 'Failed to dispatch onboarding invites.', 'Error', 'error');
          }
        });
      }
    });
  }

  // === Absence Review Modal ===
  openAbsenceModal() {
    this.showAbsenceModal.set(true);
    this.loadAllAbsenceRequests();
  }

  closeAbsenceModal() {
    this.showAbsenceModal.set(false);
  }

  loadAllAbsenceRequests() {
    this.isLoadingAbsences.set(true);
    this.guardianService.getAllAbsenceRequests().subscribe({
      next: (reqs) => {
        this.allAbsenceRequests.set(reqs || []);
        this.isLoadingAbsences.set(false);
      },
      error: () => {
        this.isLoadingAbsences.set(false);
      }
    });
  }

  reviewAbsence(id: string, status: 'APPROVED' | 'REJECTED') {
    const action = status === 'APPROVED' ? 'approve' : 'decline';
    this.guardianService.reviewAbsenceRequest(id, status).subscribe({
      next: () => {
        this.dialog.alert(`Absence request has been ${action}d.`, 'Success', 'success');
        this.loadAllAbsenceRequests();
      },
      error: (err) => {
        this.dialog.alert(err.error?.error || `Failed to ${action} request.`, 'Error', 'error');
      }
    });
  }
}
