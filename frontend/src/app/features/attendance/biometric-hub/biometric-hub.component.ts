import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService, ScanEvent } from '../../../core/infrastructure/attendance/attendance.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { Student } from '../../../core/domain/student.model';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

interface BiometricDevice {
  id: string;
  name: string;
  type: 'FINGERPRINT' | 'FACIAL' | 'RFID';
  ip_address: string;
  status: 'ONLINE' | 'OFFLINE';
  last_ping: Date;
  location: string;
}

@Component({
  selector: 'app-biometric-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biometric-hub.component.html',
})
export class BiometricHubComponent implements OnInit, OnDestroy {
  private attendanceService = inject(AttendanceService);
  private studentService = inject(StudentService);
  private pollSubscription?: Subscription;
  private statusCheckSub?: Subscription;
  
  // Threshold: device is OFFLINE if no scan seen within this many ms
  private readonly OFFLINE_THRESHOLD_MS = 60_000; // 60 seconds

  devices = signal<BiometricDevice[]>([]);

  scanEvents   = signal<ScanEvent[]>([]);
  isLoading    = signal<boolean>(true);
  loadError    = signal<string | null>(null);

  // Device registration
  showRegistration = signal<boolean>(false);
  editingDeviceId = signal<string | null>(null);
  newDevice = { id: '', name: '', type: 'FACIAL', ip_address: '', location: '' };

  // Manual scan test
  showScanTest  = signal<boolean>(false);
  scanDeviceId  = '';
  scanToken     = '';
  isScanSending = signal<boolean>(false);
  scanFeedback  = signal<{ ok: boolean; msg: string } | null>(null);

  // Link Student
  showLinkModal = signal<boolean>(false);
  linkRfidToken = signal<string>('');
  linkStudentSearch = signal<string>('');
  linkStudentId = signal<string>('');
  isLinking = signal<boolean>(false);
  linkFeedback = signal<{ ok: boolean; msg: string } | null>(null);
  allStudents = signal<Student[]>([]);

  filteredStudents = computed(() => {
    const rawSearch = this.linkStudentSearch().toLowerCase().trim();
    if (!rawSearch) return this.allStudents();

    const tokens = rawSearch.split(/\s+/).filter(t => t.length > 0);
    return this.allStudents().filter(s => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const reverseName = `${s.last_name || ''} ${s.first_name || ''}`.toLowerCase();
      const enroll = (s.enrollment_num || '').toLowerCase();
      return tokens.every(t => fullName.includes(t) || reverseName.includes(t) || enroll.includes(t));
    });
  });

  ngOnInit()    { 
    this.loadDevices();
    this.startPolling();
    this.startStatusChecker();
    this.loadStudents();
  }
  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
    this.statusCheckSub?.unsubscribe();
  }

  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: (students) => this.allStudents.set(students),
      error: () => console.error('Failed to load students for linking')
    });
  }

  loadDevices() {
    this.attendanceService.getDevices().subscribe({
      next: (devices) => this.devices.set(devices || []),
      error: () => console.error('Failed to load biometric devices')
    });
  }

  startPolling() {
    this.pollSubscription = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.attendanceService.getRecentScanEvents())
    ).subscribe({
      next: (events) => {
        this.scanEvents.set(events || []);
        this.isLoading.set(false);
        this.loadError.set(null);
        if (events?.length > 0) {
          const now = new Date();
          const latestDeviceIds = new Set(events.map(e => e.device_id));
          this.devices.update(devices =>
            devices.map(d => latestDeviceIds.has(d.id)
              ? { ...d, status: 'ONLINE', last_ping: now }
              : d)
          );
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Unable to reach scan event endpoint. Ensure devices are online.');
      }
    });
  }

  /** Periodically checks each device's last_ping and flips status to OFFLINE if stale */
  startStatusChecker() {
    this.statusCheckSub = interval(10_000).subscribe(() => {
      const now = Date.now();
      this.devices.update(devices =>
        devices.map(d => ({
          ...d,
          status: (now - new Date(d.last_ping).getTime()) < this.OFFLINE_THRESHOLD_MS
            ? 'ONLINE'
            : 'OFFLINE'
        } as typeof d))
      );
    });
  }

  openRegisterModal() {
    this.editingDeviceId.set(null);
    this.newDevice = { id: 'DEV-' + Math.random().toString(36).substring(2, 7).toUpperCase(), name: '', type: 'FACIAL', ip_address: '', location: '' };
    this.showRegistration.set(true);
  }

  openEditModal(device: BiometricDevice) {
    this.editingDeviceId.set(device.id);
    this.newDevice = { id: device.id, name: device.name, type: device.type, ip_address: device.ip_address, location: device.location };
    this.showRegistration.set(true);
  }

  registerDevice() {
    if (!this.newDevice.name || !this.newDevice.ip_address) return;
    const devicePayload: Partial<BiometricDevice> = {
      ...this.newDevice,
      type: this.newDevice.type as BiometricDevice['type']
    };

    if (this.editingDeviceId()) {
      this.attendanceService.updateDevice(this.editingDeviceId()!, devicePayload).subscribe({
        next: () => {
          this.loadDevices();
          this.showRegistration.set(false);
        },
        error: (err) => console.error('Failed to update device', err)
      });
    } else {
      this.attendanceService.registerDevice(devicePayload).subscribe({
        next: () => {
          this.loadDevices();
          this.showRegistration.set(false);
        },
        error: (err) => console.error('Failed to register device', err)
      });
    }
  }

  deleteDevice(id: string) {
    if (confirm('Are you sure you want to delete this terminal?')) {
      this.attendanceService.deleteDevice(id).subscribe({
        next: () => this.loadDevices(),
        error: (err) => console.error('Failed to delete device', err)
      });
    }
  }

  submitManualScan() {
    if (!this.scanToken.trim()) return;
    this.isScanSending.set(true);
    this.scanFeedback.set(null);
    this.attendanceService.processHardwareScan(this.scanDeviceId, this.scanToken.trim())
      .subscribe({
        next: () => {
          this.scanFeedback.set({ ok: true, msg: 'Scan received! Attendance is being processed.' });
          this.scanToken = '';
          this.isScanSending.set(false);
          // Force an immediate refresh of the scan events list
          this.attendanceService.getRecentScanEvents().subscribe(events => this.scanEvents.set(events || []));
        },
        error: (e) => {
          this.scanFeedback.set({ ok: false, msg: e.error?.error || 'Scan failed. Check device ID and token.' });
          this.isScanSending.set(false);
        }
      });
  }

  openLinkModal(token: string) {
    this.linkRfidToken.set(token);
    this.linkStudentSearch.set('');
    this.linkStudentId.set('');
    this.linkFeedback.set(null);
    this.showLinkModal.set(true);
  }

  submitLinkStudent() {
    const studentId = this.linkStudentId();
    const token = this.linkRfidToken();
    if (!studentId || !token) return;

    this.isLinking.set(true);
    this.linkFeedback.set(null);
    
    this.studentService.linkStudentRFID(studentId, token).subscribe({
      next: () => {
        this.linkFeedback.set({ ok: true, msg: 'Successfully linked biometric data to student.' });
        this.isLinking.set(false);
        
        // After successful link, we might want to refresh scans
        setTimeout(() => {
          this.showLinkModal.set(false);
          this.attendanceService.getRecentScanEvents().subscribe(events => this.scanEvents.set(events || []));
        }, 1500);
      },
      error: (e) => {
        this.linkFeedback.set({ ok: false, msg: e.error?.error || 'Failed to link data.' });
        this.isLinking.set(false);
      }
    });
  }

  getOnlineCount(): number {
    return this.devices().filter(d => d.status === 'ONLINE').length;
  }
}
