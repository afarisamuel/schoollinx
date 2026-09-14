import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';
import { Teacher } from '../../../core/domain/teacher.model';
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
    private teacherService = inject(TeacherService);
    private toast = inject(ToastService);

    activeTab = signal<'book' | 'meetings'>('book');
    teacherId = signal('');
    studentId = signal('');
    reason = signal('');
    slots = signal<MeetingSlot[]>([]);
    teachers = signal<Teacher[]>([]);
    isLoadingTeachers = signal(false);
    isLoadingSlots = signal(false);
    noSlots = signal(false);
    bookingSuccess = signal(false);

    ngOnInit() {
        const students = this.state.profile()?.students || [];
        if (students.length) this.studentId.set(students[0].id || '');
        this.loadTeachers();
    }

    loadTeachers() {
        this.isLoadingTeachers.set(true);
        this.teacherService.getTeachers().subscribe({
            next: (list) => {
                this.teachers.set(list || []);
                this.isLoadingTeachers.set(false);
                if (list && list.length > 0 && !this.teacherId()) {
                    this.onTeacherChange(list[0].id || '');
                }
            },
            error: () => this.isLoadingTeachers.set(false)
        });
    }

    onTeacherChange(tid: string) {
        this.teacherId.set(tid);
        if (tid) {
            this.findSlots();
        } else {
            this.slots.set([]);
            this.noSlots.set(false);
        }
    }

    findSlots() {
        const tid = this.teacherId();
        if (!tid) {
            this.slots.set([]);
            this.noSlots.set(false);
            return;
        }
        this.isLoadingSlots.set(true);
        this.noSlots.set(false);
        this.api.getMeetingSlotsByTeacher(tid).subscribe({
            next: (s) => {
                const available = (s || []).filter(x => !x.is_booked);
                this.slots.set(available);
                this.noSlots.set(available.length === 0);
                this.isLoadingSlots.set(false);
            },
            error: () => {
                this.slots.set([]);
                this.noSlots.set(true);
                this.isLoadingSlots.set(false);
            }
        });
    }

    bookSlot(slotId: string) {
        const p = this.state.profile();
        if (!this.reason().trim()) {
            this.toast.error('Please enter a discussion topic or note.', 'Topic Required');
            return;
        }

        this.api.bookMeeting({
            meeting_slot_id: slotId,
            guardian_id: p?.id || '',
            student_id: this.studentId(),
            reason: this.reason()
        }).subscribe({
            next: () => {
                this.bookingSuccess.set(true);
                this.reason.set('');
                this.state.reloadBookings();
                this.findSlots();
                setTimeout(() => this.bookingSuccess.set(false), 5000);
            },
            error: (err) => this.toast.error(err?.error?.error || 'Failed to book meeting.', 'Error')
        });
    }
}
