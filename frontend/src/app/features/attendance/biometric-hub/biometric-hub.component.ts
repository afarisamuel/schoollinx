import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService, ScanEvent } from '../../../core/infrastructure/attendance/attendance.service';
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
  private pollSubscription?: Subscription;

  devices = signal<BiometricDevice[]>([]);

  scanEvents   = signal<ScanEvent[]>([]);
  isLoading    = signal<boolean>(true);
  loadError    = signal<string | null>(null);

  // Device registration
  showRegistration = signal<boolean>(false);
  newDevice = { name: '', type: 'FACIAL', ip_address: '', location: '' };

  // Manual scan test
  showScanTest  = signal<boolean>(false);
  scanDeviceId  = '';
  scanToken     = '';
  isScanSending = signal<boolean>(false);
  scanFeedback  = signal<{ ok: boolean; msg: string } | null>(null);

  ngOnInit()    { this.startPolling(); }
  ngOnDestroy() { this.pollSubscription?.unsubscribe(); }

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
          const latestDeviceIds = new Set(events.map(e => e.device_id));
          this.devices.update(devices =>
            devices.map(d => latestDeviceIds.has(d.id) ? { ...d, last_ping: new Date() } : d)
          );
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('Unable to reach scan event endpoint. Ensure devices are online.');
      }
    });
  }

  registerDevice() {
    if (!this.newDevice.name || !this.newDevice.ip_address) return;
    const device: BiometricDevice = {
      id: 'DEV-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      name: this.newDevice.name,
      type: this.newDevice.type as BiometricDevice['type'],
      ip_address: this.newDevice.ip_address,
      status: 'ONLINE',
      last_ping: new Date(),
      location: this.newDevice.location
    };
    this.devices.update(d => [...d, device]);
    this.showRegistration.set(false);
    this.newDevice = { name: '', type: 'FACIAL', ip_address: '', location: '' };
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

  getOnlineCount(): number {
    return this.devices().filter(d => d.status === 'ONLINE').length;
  }
}
