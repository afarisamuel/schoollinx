import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService } from '../../../core/infrastructure/curriculum/class.service';
import { TeacherPortalService } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { Student } from '../../../core/domain/student.model';
import { AttendanceStatus, Attendance } from '../../../core/domain/attendance.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface ScannedAttendanceItem {
  student: Student;
  timestamp: Date;
  status: AttendanceStatus;
  scanCode: string;
}

export interface CameraDeviceInfo {
  id: string;
  label: string;
}

@Component({
  selector: 'app-barcode-attendance-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './barcode-attendance-scanner.component.html',
  styleUrl: './barcode-attendance-scanner.component.css'
})
export class BarcodeAttendanceScannerComponent implements OnInit, OnDestroy {
  private attendanceService = inject(AttendanceService);
  private studentService = inject(StudentService);
  private classService = inject(ClassService);
  private teacherPortalService = inject(TeacherPortalService);
  private dialog = inject(DialogService);

  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  classes = signal<{ id: string; name: string }[]>([]);
  students = signal<Student[]>([]);
  selectedClassId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Camera State
  isCameraActive = signal<boolean>(false);
  isCameraInitializing = signal<boolean>(false);
  availableCameras = signal<CameraDeviceInfo[]>([]);
  selectedCameraId = signal<string>('');
  cameraError = signal<string>('');
  private html5QrCode: Html5Qrcode | null = null;
  private lastScannedCode: string = '';
  private lastScanTimestamp: number = 0;

  // Manual & Hardware Scanner buffer
  manualInputCode = signal<string>('');
  private keyBuffer: string = '';
  private lastKeyTime: number = 0;
  private audioCtx: AudioContext | null = null;

  // Scanned items stream
  scannedLog = signal<ScannedAttendanceItem[]>([]);
  lastScannedStudent = signal<ScannedAttendanceItem | null>(null);
  feedbackState = signal<'IDLE' | 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND'>('IDLE');
  feedbackMessage = signal<string>('');

  // Selected Class details
  selectedClassName = computed(() => {
    const cls = this.classes().find(c => c.id === this.selectedClassId());
    return cls ? cls.name : 'All Enrolled Classes';
  });

  // KPI calculations
  totalStudents = computed(() => this.students().length);
  checkedInCount = computed(() => this.scannedLog().length);
  remainingCount = computed(() => Math.max(0, this.totalStudents() - this.checkedInCount()));
  attendanceRate = computed(() => {
    const total = this.totalStudents();
    if (total === 0) return 0;
    return Math.round((this.checkedInCount() / total) * 100);
  });

  // Remaining absent students list
  unscannedStudents = computed(() => {
    const scannedIds = new Set(this.scannedLog().map(item => item.student.id));
    return this.students().filter(s => !scannedIds.has(s.id));
  });

  ngOnInit(): void {
    this.initAudio();
    this.loadClasses();
    this.setupHardwareScannerListener();
    this.discoverCameras();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.removeHardwareScannerListener();
  }

  private initAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  private playChime(success: boolean) {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // High pleasant double-beep (880Hz -> 1760Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // Low double-buzz (440Hz -> 220Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio playback fails gracefully if blocked
    }
  }

  // ==========================================
  // CAMERA DISCOVERY & MANAGEMENT
  // ==========================================
  async discoverCameras() {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        this.availableCameras.set(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.substring(0, 4)}` })));
        
        // Prefer rear/environment camera on mobile devices
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('rear'));
        this.selectedCameraId.set(backCamera ? backCamera.id : devices[0].id);
      }
    } catch (e) {
      console.warn('Camera discovery pass:', e);
    }
  }

  async startCamera() {
    this.cameraError.set('');
    this.isCameraInitializing.set(true);

    try {
      if (this.html5QrCode) {
        await this.stopCamera();
      }

      this.html5QrCode = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      const cameraId = this.selectedCameraId();
      const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

      await this.html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.777778
        },
        (decodedText) => {
          this.handleCameraDecodedText(decodedText);
        },
        () => {
          // Frame error pass
        }
      );

      this.isCameraActive.set(true);
      this.isCameraInitializing.set(false);
    } catch (err: any) {
      this.isCameraActive.set(false);
      this.isCameraInitializing.set(false);
      this.cameraError.set(err?.message || 'Unable to access device camera. Please check camera permissions in your browser.');
    }
  }

  async stopCamera() {
    if (this.html5QrCode) {
      try {
        if (this.html5QrCode.isScanning) {
          await this.html5QrCode.stop();
        }
        await this.html5QrCode.clear();
      } catch (e) {
        console.warn('Error stopping camera', e);
      }
      this.html5QrCode = null;
    }
    this.isCameraActive.set(false);
  }

  async switchCamera(newCameraId: string) {
    this.selectedCameraId.set(newCameraId);
    if (this.isCameraActive()) {
      await this.startCamera();
    }
  }

  private handleCameraDecodedText(decodedText: string) {
    const now = Date.now();
    // Prevent continuous re-scanning of the same card if held in front of the lens (2.5s cooldown)
    if (decodedText === this.lastScannedCode && (now - this.lastScanTimestamp < 2500)) {
      return;
    }

    this.lastScannedCode = decodedText;
    this.lastScanTimestamp = now;
    this.processScannedCode(decodedText);
  }

  // ==========================================
  // HARDWARE SCANNER GLOBAL LISTENER
  // ==========================================
  private handleKeyDown = (event: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== this.barcodeInput?.nativeElement) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - this.lastKeyTime > 200) {
      this.keyBuffer = '';
    }
    this.lastKeyTime = currentTime;

    if (event.key === 'Enter') {
      if (this.keyBuffer.trim().length > 0) {
        event.preventDefault();
        this.processScannedCode(this.keyBuffer.trim());
        this.keyBuffer = '';
      }
    } else if (event.key.length === 1) {
      this.keyBuffer += event.key;
    }
  };

  private setupHardwareScannerListener() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private removeHardwareScannerListener() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  // ==========================================
  // DATA LOADING
  // ==========================================
  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (res) => {
        const classMap = new Map<string, { id: string; name: string }>();
        (res || []).forEach(c => {
          if (c.id && c.name) classMap.set(c.id, { id: c.id, name: c.name });
        });

        this.teacherPortalService.getMyClasses().subscribe({
          next: (portalRes) => {
            (portalRes.assignments || []).forEach(a => {
              const cid = a.class?.id || a.class_id;
              const cname = a.class?.name || (a as any).class_name;
              if (cid && cname) classMap.set(cid, { id: cid, name: cname });
            });
            this.finishClasses(classMap);
          },
          error: () => this.finishClasses(classMap)
        });
      },
      error: () => {
        this.teacherPortalService.getMyClasses().subscribe({
          next: (portalRes) => {
            const classMap = new Map<string, { id: string; name: string }>();
            (portalRes.assignments || []).forEach(a => {
              const cid = a.class?.id || a.class_id;
              const cname = a.class?.name || (a as any).class_name;
              if (cid && cname) classMap.set(cid, { id: cid, name: cname });
            });
            this.finishClasses(classMap);
          },
          error: () => {}
        });
      }
    });
  }

  private finishClasses(map: Map<string, { id: string; name: string }>) {
    const list = Array.from(map.values());
    this.classes.set(list);
    if (list.length > 0) {
      this.selectedClassId.set(list[0].id);
      this.loadStudentsForClass();
    }
  }

  onClassChange(classId: string) {
    this.selectedClassId.set(classId);
    this.loadStudentsForClass();
  }

  loadStudentsForClass() {
    const cid = this.selectedClassId();
    if (!cid) return;

    this.studentService.getStudentsByClass(cid).subscribe({
      next: (students) => {
        if (students && students.length > 0) {
          this.students.set(students);
          this.loadExistingAttendance(cid);
        } else {
          this.teacherPortalService.getClassStudents(cid).subscribe({
            next: (portal) => {
              this.students.set(portal || []);
              this.loadExistingAttendance(cid);
            },
            error: () => this.students.set([])
          });
        }
      },
      error: () => {
        this.teacherPortalService.getClassStudents(cid).subscribe({
          next: (portal) => {
            this.students.set(portal || []);
            this.loadExistingAttendance(cid);
          },
          error: () => this.students.set([])
        });
      }
    });
  }

  private loadExistingAttendance(classId: string) {
    const date = this.selectedDate();
    this.attendanceService.getClassAttendance(classId, date).subscribe({
      next: (records) => {
        const studentMap = new Map(this.students().map(s => [s.id, s]));
        const log: ScannedAttendanceItem[] = [];

        (records || []).forEach(r => {
          if (r.status === 'Present' || r.status === 'Tardy') {
            const student = studentMap.get(r.student_id);
            if (student) {
              log.push({
                student,
                timestamp: new Date(r.date || new Date()),
                status: r.status,
                scanCode: student.enrollment_num || student.id || ''
              });
            }
          }
        });
        this.scannedLog.set(log);
      },
      error: () => {}
    });
  }

  // ==========================================
  // CORE SCAN PROCESSOR
  // ==========================================
  processManualInput() {
    const code = this.manualInputCode().trim();
    if (!code) return;
    this.processScannedCode(code);
    this.manualInputCode.set('');
  }

  processScannedCode(rawCode: string) {
    let cleanCode = rawCode.trim();
    let studentIdToFind = cleanCode;

    // 1. Check if rawCode is JSON (from QR Code payload)
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.id) studentIdToFind = parsed.id;
        else if (parsed.code) studentIdToFind = parsed.code;
      } catch (e) {
        // Use raw string
      }
    }

    // 2. Lookup student by ID, enrollment number, or name match
    const student = this.students().find(s => 
      (s.id && s.id.toLowerCase() === studentIdToFind.toLowerCase()) ||
      (s.id && `stu-${s.id.substring(0,8)}`.toLowerCase() === studentIdToFind.toLowerCase()) ||
      (s.enrollment_num && s.enrollment_num.toLowerCase() === studentIdToFind.toLowerCase()) ||
      (cleanCode.length >= 4 && `${s.first_name} ${s.last_name}`.toLowerCase().includes(cleanCode.toLowerCase()))
    );

    if (!student) {
      this.playChime(false);
      this.feedbackState.set('NOT_FOUND');
      this.feedbackMessage.set(`No candidate matching barcode "${cleanCode}" in this class roster.`);
      setTimeout(() => this.feedbackState.set('IDLE'), 3500);
      return;
    }

    // 3. Check if already scanned today
    const existingIndex = this.scannedLog().findIndex(item => item.student.id === student.id);
    if (existingIndex >= 0) {
      this.playChime(false);
      this.feedbackState.set('DUPLICATE');
      this.feedbackMessage.set(`${student.first_name} ${student.last_name} is already checked in.`);
      setTimeout(() => this.feedbackState.set('IDLE'), 3000);
      return;
    }

    // 4. Mark attendance as PRESENT
    const now = new Date();
    const newItem: ScannedAttendanceItem = {
      student,
      timestamp: now,
      status: 'Present',
      scanCode: cleanCode
    };

    this.scannedLog.update(list => [newItem, ...list]);
    this.lastScannedStudent.set(newItem);
    this.playChime(true);
    this.feedbackState.set('SUCCESS');
    this.feedbackMessage.set(`Verified! ${student.first_name} ${student.last_name} marked Present.`);

    // Persist via AttendanceService
    const isoDate = new Date(this.selectedDate() + 'T00:00:00Z').toISOString();
    const payload: Attendance = {
      student_id: student.id!,
      class_id: this.selectedClassId(),
      date: isoDate,
      status: 'Present',
      remarks: `Device Camera Barcode/QR scan verified at ${now.toLocaleTimeString()}`
    };

    this.attendanceService.markAttendance(payload).subscribe({
      next: () => {},
      error: (err) => console.warn('Attendance sync queued', err)
    });

    setTimeout(() => {
      if (this.feedbackState() === 'SUCCESS') {
        this.feedbackState.set('IDLE');
      }
    }, 4000);
  }

  // Action helpers
  toggleStatus(item: ScannedAttendanceItem, newStatus: AttendanceStatus) {
    item.status = newStatus;
    this.scannedLog.update(list => [...list]);

    const isoDate = new Date(this.selectedDate() + 'T00:00:00Z').toISOString();
    this.attendanceService.markAttendance({
      student_id: item.student.id!,
      class_id: this.selectedClassId(),
      date: isoDate,
      status: newStatus
    }).subscribe();
  }

  removeScan(item: ScannedAttendanceItem) {
    this.scannedLog.update(list => list.filter(i => i.student.id !== item.student.id));
    if (this.lastScannedStudent()?.student.id === item.student.id) {
      this.lastScannedStudent.set(null);
    }
  }

  quickScanStudent(student: Student) {
    this.processScannedCode(student.id || student.enrollment_num || `${student.first_name} ${student.last_name}`);
  }
}
