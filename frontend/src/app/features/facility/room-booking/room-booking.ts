import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Room, RoomBooking } from '../../../core/domain/facility.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-room-booking',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './room-booking.html',
  styleUrl: './room-booking.css'
})
export class RoomBookingComponent implements OnInit {
  private facilityService = inject(FacilityService);
  private authService = inject(AuthService);
  private dialog = inject(DialogService);

  rooms = signal<Room[]>([]);
  bookings = signal<RoomBooking[]>([]);
  
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedRoom = signal<string | null>(null);

  showModal = signal(false);
  isSubmitting = signal(false);

  formData: Partial<RoomBooking> = {};

  filteredBookings = computed(() => {
    const roomId = this.selectedRoom();
    if (!roomId) return this.bookings();
    return this.bookings().filter(b => b.room_id === roomId);
  });

  ngOnInit() { 
    this.loadRooms();
  }

  loadRooms() {
    this.facilityService.getRooms().subscribe({
      next: (res) => {
        this.rooms.set(res);
        if (res.length > 0 && !this.selectedRoom()) {
          this.selectedRoom.set(res[0].id);
          this.loadBookings();
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadBookings() {
    const roomId = this.selectedRoom();
    if (!roomId) return;
    this.facilityService.getRoomSchedule(roomId, this.selectedDate()).subscribe({
      next: (res) => this.bookings.set(res),
      error: (err) => console.error(err)
    });
  }

  onDateChange(date: string) {
    this.selectedDate.set(date);
    this.loadBookings();
  }

  onRoomChange(roomId: string) {
    this.selectedRoom.set(roomId);
    this.loadBookings();
  }

  openAdd() {
    if (!this.selectedRoom()) {
      this.dialog.alert('Please select a room first.', 'Select Room', 'info');
      return;
    }
    const user = this.authService.currentUserValue;
    if (!user) {
      this.dialog.alert('You must be logged in to book a room.', 'Error', 'danger');
      return;
    }
    
    this.formData = { 
      room_id: this.selectedRoom()!, 
      booker_id: user.id
    };
    this.showModal.set(true);
  }

  submit() {
    if (!this.formData.start_time || !this.formData.end_time || !this.formData.purpose) {
      this.dialog.alert('All fields are required.', 'Validation', 'warning');
      return;
    }
    
    // Construct proper ISO strings for today's selected date
    const dateStr = this.selectedDate();
    this.formData.start_time = new Date(`${dateStr}T${this.formData.start_time}:00`).toISOString();
    this.formData.end_time = new Date(`${dateStr}T${this.formData.end_time}:00`).toISOString();

    this.isSubmitting.set(true);
    this.facilityService.bookRoom(this.formData.room_id!, this.formData).subscribe({
      next: () => { 
        this.isSubmitting.set(false); 
        this.showModal.set(false); 
        this.loadBookings(); 
      },
      error: (err) => { 
        this.isSubmitting.set(false); 
        this.dialog.alert(err?.error?.error || 'Error booking room', 'Error', 'danger'); 
      }
    });
  }

  cancelBooking(id: string) {
    this.dialog.confirm('Cancel this booking?', 'Cancel', 'danger', 'Yes, Cancel').subscribe(ok => {
      if (ok) {
        this.facilityService.cancelBooking(id).subscribe({
          next: () => this.loadBookings(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Error', 'Error', 'danger')
        });
      }
    });
  }
}
