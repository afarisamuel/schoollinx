import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { MeetingSlot } from '../../../core/infrastructure/communication/communication.service';

@Component({
    selector: 'app-parent-meetings',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule],
    templateUrl: './parent-meetings.page.html'
})
export class ParentMeetingsPage implements OnInit {
    state = inject(ParentStateService);
    private api = inject(ParentPortalService);
    private toast = inject(ToastService);

    activeTab = signal<'book' | 'meetings'>('book');
    teacherId = signal('');
    studentId = signal('');
    reason = signal('');
    slots = signal<MeetingSlot[]>([]);
    noSlots = signal(false);
    bookingSuccess = signal(false);

    ngOnInit() {
        const students = this.state.profile()?.students || [];
        if (students.length) this.studentId.set(students[0].id || '');
    }

    findSlots() {
        const tid = this.teacherId();
        if (!tid) { this.toast.error('Please enter a Teacher ID.', 'Required'); return; }
        this.noSlots.set(false);
        this.api.getMeetingSlotsByTeacher(tid).subscribe({
            next: (s) => {
                const available = s.filter(x => !x.is_booked);
                this.slots.set(available);
                this.noSlots.set(available.length === 0);
            },
            error: () => { this.slots.set([]); this.noSlots.set(true); }
        });
    }

    bookSlot(slotId: string) {
        const p = this.state.profile();
        this.api.bookMeeting({
            meeting_slot_id: slotId,
            guardian_id: p?.id || '',
            student_id: this.studentId(),
            reason: this.reason()
        }).subscribe({
            next: () => {
                this.bookingSuccess.set(true);
                this.state.reloadBookings();
                this.findSlots();
                setTimeout(() => this.bookingSuccess.set(false), 5000);
            },
            error: (err) => this.toast.error(err?.error?.error || 'Failed to book meeting.', 'Error')
        });
    }
}
