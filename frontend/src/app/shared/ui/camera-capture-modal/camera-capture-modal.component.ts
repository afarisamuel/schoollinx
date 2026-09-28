import { Component, ElementRef, ViewChild, signal, input, output, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CapturedPhotoResult {
  file: File;
  dataUrl: string;
}

@Component({
  selector: 'app-camera-capture-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './camera-capture-modal.component.html',
  styleUrls: []
})
export class CameraCaptureModalComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Inputs
  isOpen = input<boolean>(false);
  studentName = input<string>('');

  // Outputs
  photoCaptured = output<CapturedPhotoResult>();
  closed = output<void>();

  // State Signals
  isCameraActive = signal<boolean>(false);
  isInitializing = signal<boolean>(false);
  cameraError = signal<string | null>(null);
  capturedDataUrl = signal<string | null>(null);
  capturedFile = signal<File | null>(null);
  availableCameras = signal<MediaDeviceInfo[]>([]);
  selectedCameraId = signal<string>('');
  countdown = signal<number | null>(null);
  flashActive = signal<boolean>(false);

  private mediaStream: MediaStream | null = null;
  private countdownTimer: any = null;

  constructor() {
    // React to isOpen signal changes
    effect(() => {
      if (this.isOpen()) {
        this.capturedDataUrl.set(null);
        this.capturedFile.set(null);
        this.cameraError.set(null);
        setTimeout(() => this.startCamera(), 100);
      } else {
        this.stopCamera();
      }
    });
  }

  ngOnInit() {
    this.detectCameras();
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  async detectCameras() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      this.availableCameras.set(videoDevices);
      if (videoDevices.length > 0 && !this.selectedCameraId()) {
        this.selectedCameraId.set(videoDevices[0].deviceId);
      }
    } catch {
      // Ignore enumeration errors
    }
  }

  async startCamera(deviceId?: string) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access is not supported in this browser or environment.');
      return;
    }

    this.stopCamera();
    this.isInitializing.set(true);
    this.cameraError.set(null);

    const targetDeviceId = deviceId || this.selectedCameraId();

    const constraints: MediaStreamConstraints = {
      video: targetDeviceId
        ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 1280 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isCameraActive.set(true);
      this.isInitializing.set(false);

      // Refresh camera list once permissions are granted
      await this.detectCameras();

      if (this.videoPlayerRef?.nativeElement) {
        this.videoPlayerRef.nativeElement.srcObject = this.mediaStream;
        await this.videoPlayerRef.nativeElement.play().catch(() => {});
      }
    } catch (err: any) {
      this.isInitializing.set(false);
      this.isCameraActive.set(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraError.set('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraError.set('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.cameraError.set('Camera is currently in use by another application.');
      } else {
        this.cameraError.set(err.message || 'Failed to start camera. Please check your camera connection.');
      }
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }
    if (this.videoPlayerRef?.nativeElement) {
      this.videoPlayerRef.nativeElement.srcObject = null;
    }
    this.isCameraActive.set(false);
    this.isInitializing.set(false);
  }

  async switchCamera(deviceId: string) {
    this.selectedCameraId.set(deviceId);
    await this.startCamera(deviceId);
  }

  async flipCamera() {
    const cameras = this.availableCameras();
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === this.selectedCameraId());
    const nextIndex = (currentIndex + 1) % cameras.length;
    await this.switchCamera(cameras[nextIndex].deviceId);
  }

  startCountdownAndCapture(seconds = 3) {
    if (this.countdown() !== null) return;
    this.countdown.set(seconds);

    this.countdownTimer = setInterval(() => {
      const current = this.countdown();
      if (current === null || current <= 1) {
        clearInterval(this.countdownTimer);
        this.countdown.set(null);
        this.takeSnapshot();
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  takeSnapshot() {
    const video = this.videoPlayerRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;

    // Flash visual feedback
    this.flashActive.set(true);
    setTimeout(() => this.flashActive.set(false), 200);

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Center crop square/portrait ratio (1:1 passport style)
    const size = Math.min(vw, vh);
    const startX = (vw - size) / 2;
    const startY = (vh - size) / 2;

    const outputSize = Math.min(size, 600); // 600x600 high quality, lightweight passport portrait (~35KB)
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw cropped square frame
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, startX, startY, size, size, 0, 0, outputSize, outputSize);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.capturedDataUrl.set(dataUrl);

    // Convert to File
    canvas.toBlob((blob) => {
      if (blob) {
        const filename = `student-photo-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        this.capturedFile.set(file);
      }
    }, 'image/jpeg', 0.85);
  }

  retake() {
    this.capturedDataUrl.set(null);
    this.capturedFile.set(null);
    if (!this.isCameraActive()) {
      this.startCamera();
    }
  }

  confirmPhoto() {
    const file = this.capturedFile();
    const dataUrl = this.capturedDataUrl();
    if (file && dataUrl) {
      this.photoCaptured.emit({ file, dataUrl });
      this.close();
    }
  }

  close() {
    this.stopCamera();
    this.capturedDataUrl.set(null);
    this.capturedFile.set(null);
    this.closed.emit();
  }
}
