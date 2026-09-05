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
import { ThemeService } from '../../../core/infrastructure/theme/theme.service';
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
  public themeService = inject(ThemeService);

  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  classes = signal<{ id: string; name: string }[]>([]);
  students = signal<Student[]>([]);
  selectedClassId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Turnstile Gate Kiosk Theme & Mobile Layout
  kioskTheme = signal<'dark' | 'light'>('dark');
  kioskMobileTab = signal<'SCANNER' | 'TELEMETRY' | 'STREAM' | 'KEYPAD'>('SCANNER');

  setKioskMobileTab(tab: 'SCANNER' | 'TELEMETRY' | 'STREAM' | 'KEYPAD') {
    this.kioskMobileTab.set(tab);
  }

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

  // Turnstile Gate Kiosk & Voice Synthesis
  isKioskMode = signal<boolean>(false);
  isVoiceFeedbackEnabled = signal<boolean>(true);
  isGuardianSmsEnabled = signal<boolean>(true);
  recentSmsDispatches = signal<{ studentName: string; time: string; phone: string }[]>([]);
  kioskOperationMode = signal<'ARRIVAL' | 'DEPARTURE'>('ARRIVAL');
  kioskActiveTab = signal<'SCANNER' | 'KEYPAD' | 'UNSCANNED'>('SCANNER');
  pinKeypad = signal<string>('');
  kioskSearchQuery = signal<string>('');
  isNativeFullscreen = signal<boolean>(false);
  terminalName = signal<string>('GATE-NORTH-01');

  // Live Digital Clock
  currentTime = signal<string>('');
  currentDate = signal<string>('');
  private clockTimer: any = null;

  // Scanned items stream
  scannedLog = signal<ScannedAttendanceItem[]>([]);
  lastScannedStudent = signal<ScannedAttendanceItem | null>(null);
  feedbackState = signal<'IDLE' | 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND'>('IDLE');
  feedbackMessage = signal<string>('');

  async toggleKioskMode() {
    const next = !this.isKioskMode();
    const wasCameraActive = this.isCameraActive();

    if (wasCameraActive) {
      await this.stopCamera();
    }

    this.isKioskMode.set(next);

    if (typeof document !== 'undefined') {
      if (next) {
        document.body.classList.add('kiosk-mode-active');
      } else {
        document.body.classList.remove('kiosk-mode-active');
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          this.isNativeFullscreen.set(false);
        }
      }
    }

    // Give Angular change detection a frame to render the active container
    await new Promise(r => setTimeout(r, 120));

    // Automatically start or restore camera in the active mode
    if (next || wasCameraActive) {
      await this.startCamera();
    }
  }

  toggleKioskTheme() {
    this.kioskTheme.set(this.kioskTheme() === 'dark' ? 'light' : 'dark');
  }

  async flipCamera() {
    const cams = this.availableCameras();
    if (cams.length <= 1) return;
    const currentIndex = cams.findIndex(c => c.id === this.selectedCameraId());
    const nextIndex = (currentIndex + 1) % cams.length;
    await this.switchCamera(cams[nextIndex].id);
  }

  toggleNativeFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isNativeFullscreen.set(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        this.isNativeFullscreen.set(false);
      }).catch(() => {});
    }
  }

  toggleOperationMode() {
    const next = this.kioskOperationMode() === 'ARRIVAL' ? 'DEPARTURE' : 'ARRIVAL';
    this.kioskOperationMode.set(next);
    this.speakAnnouncement(next === 'ARRIVAL' ? 'Switched to Morning Arrival Mode' : 'Switched to Afternoon Departure Mode');
  }

  setKioskTab(tab: 'SCANNER' | 'KEYPAD' | 'UNSCANNED') {
    this.kioskActiveTab.set(tab);
  }

  pressKey(digit: string) {
    if (this.pinKeypad().length < 16) {
      this.pinKeypad.update(v => v + digit);
    }
  }

  deleteKey() {
    this.pinKeypad.update(v => v.slice(0, -1));
  }

  clearKeypad() {
    this.pinKeypad.set('');
  }

  submitKeypad() {
    const pin = this.pinKeypad().trim();
    if (!pin) return;
    this.processScannedCode(pin);
    this.pinKeypad.set('');
  }

  toggleVoiceFeedback() {
    this.isVoiceFeedbackEnabled.set(!this.isVoiceFeedbackEnabled());
  }

  toggleGuardianSms() {
    this.isGuardianSmsEnabled.set(!this.isGuardianSmsEnabled());
  }

  private speakAnnouncement(text: string) {
    if (!this.isVoiceFeedbackEnabled() || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice speech error', e);
    }
  }

  // Selected Class details
  selectedClassName = computed(() => {
    const cls = this.classes().find(c => c.id === this.selectedClassId());
    return cls ? cls.name : 'All Cohorts & Classes';
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

  onTimeCount = computed(() => {
    return this.scannedLog().filter(item => item.status === 'Present').length;
  });

  tardyCount = computed(() => {
    return this.scannedLog().filter(item => item.status === 'Tardy').length;
  });

  dayScholarCount = computed(() => {
    return this.scannedLog().filter(item => (item.student as any).placed_residence_type !== 'Boarding').length;
  });

  boarderCount = computed(() => {
    return this.scannedLog().filter(item => (item.student as any).placed_residence_type === 'Boarding').length;
  });

  // Remaining absent students list
  unscannedStudents = computed(() => {
    const scannedIds = new Set(this.scannedLog().map(item => item.student.id));
    const query = this.kioskSearchQuery().toLowerCase().trim();
    return this.students().filter(s => {
      if (scannedIds.has(s.id)) return false;
      if (!query) return true;
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const idCode = (s.enrollment_num || s.id || '').toLowerCase();
      return fullName.includes(query) || idCode.includes(query);
    });
  });

  ngOnInit(): void {
    this.initAudio();
    this.startClock();
    this.loadClasses();
    this.setupHardwareScannerListener();
    this.discoverCameras();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopClock();
    this.removeHardwareScannerListener();
    if (typeof document !== 'undefined') {
      document.body.classList.remove('kiosk-mode-active');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  private startClock() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      this.currentDate.set(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    update();
    this.clockTimer = setInterval(update, 1000);
  }

  private stopClock() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
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
    this.isCameraActive.set(true);

    try {
      if (this.html5QrCode) {
        await this.stopCamera();
        this.isCameraActive.set(true);
      }

      // Small tick to ensure Angular renders the container before Html5Qrcode initialization
      await new Promise(r => setTimeout(r, 100));

      const containerId = this.isKioskMode() ? 'kiosk-qr-reader-container' : 'qr-reader-container';
      const containerEl = document.getElementById(containerId);
      if (!containerEl) {
        console.warn(`Target scanner container #${containerId} not found in DOM.`);
        this.isCameraInitializing.set(false);
        return;
      }

      this.html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      const cameraId = this.selectedCameraId();
      const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

      const config = {
        fps: 24,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minDim * 0.88),
            height: Math.floor(minDim * 0.6)
          };
        },
        aspectRatio: 1.6
      };

      try {
        await this.html5QrCode.start(
          cameraConfig,
          config,
          (decodedText) => this.handleCameraDecodedText(decodedText),
          () => {}
        );
      } catch (firstErr) {
        console.warn('Exact device start failed, trying facingMode fallback...', firstErr);
        await this.html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => this.handleCameraDecodedText(decodedText),
          () => {}
        );
      }

      this.isCameraInitializing.set(false);
    } catch (err: any) {
      this.isCameraActive.set(false);
      this.isCameraInitializing.set(false);
      this.cameraError.set(err?.message || 'Unable to access device camera. Please allow camera permissions in your browser.');
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

    if (event.key === 'Escape' && this.isKioskMode()) {
      event.preventDefault();
      this.toggleKioskMode();
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
      this.kioskMobileTab.set('SCANNER');
      this.playChime(false);
      this.speakAnnouncement('Unrecognized credential barcode');
      this.feedbackState.set('NOT_FOUND');
      this.feedbackMessage.set(`No candidate matching barcode "${cleanCode}" in this class roster.`);
      setTimeout(() => this.feedbackState.set('IDLE'), 3500);
      return;
    }

    // 3. Check if already scanned today
    const existingIndex = this.scannedLog().findIndex(item => item.student.id === student.id);
    if (existingIndex >= 0) {
      this.kioskMobileTab.set('SCANNER');
      this.playChime(false);
      this.speakAnnouncement(`Duplicate scan. ${student.first_name} is already checked in.`);
      this.feedbackState.set('DUPLICATE');
      this.feedbackMessage.set(`${student.first_name} ${student.last_name} is already checked in.`);
      setTimeout(() => this.feedbackState.set('IDLE'), 3000);
      return;
    }

    // 4. Mark attendance as PRESENT
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newItem: ScannedAttendanceItem = {
      student,
      timestamp: now,
      status: 'Present',
      scanCode: cleanCode
    };

    this.scannedLog.update(list => [newItem, ...list]);
    this.lastScannedStudent.set(newItem);
    this.kioskMobileTab.set('SCANNER');
    this.playChime(true);
    this.speakAnnouncement(`Welcome ${student.first_name} ${student.last_name}, checked in at ${timeStr}`);
    
    if (this.isGuardianSmsEnabled()) {
      const parentPhone = student.guardian_phone || student.phone_number || '+233 24 555 0192';
      this.recentSmsDispatches.update(list => [
        { studentName: `${student.first_name} ${student.last_name}`, time: timeStr, phone: parentPhone },
        ...list.slice(0, 9)
      ]);
    }

    this.feedbackState.set('SUCCESS');
    this.feedbackMessage.set(`Verified! ${student.first_name} ${student.last_name} marked Present.`);

    // Persist via AttendanceService
    const effectiveClassId = this.selectedClassId() || student.class_id || '';
    const isoDate = new Date(this.selectedDate() + 'T00:00:00Z').toISOString();
    const payload: Attendance = {
      student_id: student.id!,
      class_id: effectiveClassId,
      date: isoDate,
      status: 'Present',
      remarks: `Gate Turnstile Kiosk Barcode/QR scan verified at ${timeStr}`
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

    const effectiveClassId = this.selectedClassId() || item.student.class_id || '';
    const isoDate = new Date(this.selectedDate() + 'T00:00:00Z').toISOString();
    this.attendanceService.markAttendance({
      student_id: item.student.id!,
      class_id: effectiveClassId,
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
