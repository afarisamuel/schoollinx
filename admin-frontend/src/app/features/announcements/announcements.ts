import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './announcements.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnouncementsComponent implements OnInit {
  private tenantService = inject(TenantService);
  private fb = inject(FormBuilder);

  // Active top tab
  activeTab = signal<'BANNERS' | 'EMAIL_BROADCAST'>('BANNERS');

  // State
  announcements = signal<any[]>([]);
  isLoading = signal(true);
  
  // Email Broadcast State
  emailSubject = signal('');
  emailBody = signal('');
  emailAudience = signal('ALL');
  emailPlan = signal('');
  isSendingEmail = signal(false);

  // Filtering & Sorting State
  searchQuery = signal('');
  priorityFilter = signal('ALL');
  statusFilter = signal('ALL');

  // Modal State
  showAnnouncementModal = signal(false);
  isEditing = signal(false);
  editingId = signal<string | null>(null);
  
  announcementForm: FormGroup;
  isSubmitting = signal(false);

  // Notification State
  successMessage = signal('');
  errorMessage = signal('');

  // Derived filtered & sorted list
  filteredAnnouncements = computed(() => {
    let list = this.announcements();

    // Priority Filter
    if (this.priorityFilter() !== 'ALL') {
      list = list.filter(a => a.priority === this.priorityFilter());
    }

    // Status Filter
    if (this.statusFilter() !== 'ALL') {
      const isActive = this.statusFilter() === 'ACTIVE';
      list = list.filter(a => a.is_active === isActive);
    }

    // Search Filter
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(a => 
        (a.title || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q)
      );
    }

    // Sort Newest First (API already sorts, but we ensure it locally just in case)
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  constructor() {
    this.announcementForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      priority: ['INFO', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAnnouncements();
  }

  loadAnnouncements() {
    this.isLoading.set(true);
    this.tenantService.listAnnouncements().subscribe({
      next: (a) => {
        this.announcements.set(a || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.announcements.set([]);
        this.isLoading.set(false);
      }
    });
  }

  // --- Auto-dismiss Notification Helpers ---
  private timeoutId: any;
  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.successMessage.set(''), 4000);
  }

  private showError(msg: string) {
    this.errorMessage.set(msg);
    this.successMessage.set('');
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.errorMessage.set(''), 4000);
  }

  // --- Modal Management ---
  openCreateModal() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.announcementForm.reset({ priority: 'INFO' });
    this.showAnnouncementModal.set(true);
  }

  openEditModal(ann: any) {
    this.isEditing.set(true);
    this.editingId.set(ann.id);
    this.announcementForm.patchValue({
      title: ann.title,
      content: ann.content,
      priority: ann.priority
    });
    this.showAnnouncementModal.set(true);
  }

  closeModal() {
    this.showAnnouncementModal.set(false);
  }

  // --- CRUD Operations ---
  submitAnnouncement() {
    if (this.announcementForm.invalid) {
      this.announcementForm.markAllAsTouched();
      return;
    }
    
    this.isSubmitting.set(true);
    const payload = this.announcementForm.value;

    if (this.isEditing() && this.editingId()) {
      this.tenantService.updateAnnouncement(this.editingId()!, payload).subscribe({
        next: () => {
          this.showSuccess('Announcement updated successfully');
          this.closeModal();
          this.loadAnnouncements();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showError('Failed to update announcement');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.tenantService.createAnnouncement(payload).subscribe({
        next: () => {
          this.showSuccess('Announcement created successfully');
          this.closeModal();
          this.loadAnnouncements();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.showError('Failed to create announcement');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  toggleAnnouncement(id: string, current: boolean) {
    this.tenantService.toggleAnnouncement(id, !current).subscribe({
      next: () => {
        this.showSuccess(`Announcement ${current ? 'disabled' : 'enabled'} successfully`);
        this.loadAnnouncements();
      },
      error: () => this.showError('Failed to toggle status')
    });
  }

  deleteAnnouncement(id: string) {
    if (confirm('Are you sure you want to delete this announcement permanently?')) {
      this.tenantService.deleteAnnouncement(id).subscribe({
        next: () => {
          this.showSuccess('Announcement deleted successfully');
          this.loadAnnouncements();
        },
        error: () => this.showError('Failed to delete announcement')
      });
    }
  }

  // --- Filter Updates ---
  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
  
  onStatusChange(event: Event) {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  sendEmailBroadcast() {
    const subject = this.emailSubject().trim();
    const body = this.emailBody().trim();
    if (!subject || !body) return;

    this.isSendingEmail.set(true);
    this.tenantService.sendAdminEmailBroadcast({
      subject,
      body,
      target_audience: this.emailAudience(),
      target_plan: this.emailPlan()
    }).subscribe({
      next: (res) => {
        this.isSendingEmail.set(false);
        this.emailSubject.set('');
        this.emailBody.set('');
        this.showSuccess(res?.message || 'Email broadcast dispatched to administrators.');
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.showError(err?.error?.error || 'Failed to dispatch email broadcast.');
      }
    });
  }
}
