import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherPortalService } from '../../../../core/infrastructure/teacher/teacher-portal.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-teacher-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teacher-consultations.component.html'
})
export class TeacherConsultationsComponent implements OnInit {
  private portalService = inject(TeacherPortalService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  teacher = signal<any>(null);
  meetingSlots = signal<any[]>([]);
  meetingBookings = signal<any[]>([]);

  slotDate = signal(new Date().toISOString().slice(0, 10));
  slotStart = signal('14:00');
  slotEnd = signal('16:00');
  slotDuration = signal(15);
  slotLocation = signal('Staff Common Room / Zoom');
  isCreatingSlot = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.portalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacher.set(res.teacher);
        if (res.teacher?.id) {
          this.loadSlotsAndBookings(res.teacher.id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadSlotsAndBookings(teacherId: string) {
    this.portalService.getTeacherMeetingSlots(teacherId).subscribe({
      next: (slots) => this.meetingSlots.set(slots || []),
      error: () => {}
    });

    this.portalService.getTeacherBookings(teacherId).subscribe({
      next: (bookings) => {
        this.meetingBookings.set(bookings || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  createSlot() {
    const teacherId = this.teacher()?.id;
    if (!teacherId) return;

    this.isCreatingSlot.set(true);
    const payload = {
      teacher_id: teacherId,
      date: this.slotDate(),
      start_time: this.slotStart(),
      end_time: this.slotEnd(),
      slot_duration_minutes: Number(this.slotDuration()),
      location: this.slotLocation(),
      max_bookings: 8
    };

    this.portalService.createMeetingSlot(payload).subscribe({
      next: () => {
        this.isCreatingSlot.set(false);
        this.toast.success('Consultation window published for parents.', 'Slots Available');
        this.loadSlotsAndBookings(teacherId);
      },
      error: () => {
        this.isCreatingSlot.set(false);
        this.toast.error('Failed to create consultation window.');
      }
    });
  }
}
