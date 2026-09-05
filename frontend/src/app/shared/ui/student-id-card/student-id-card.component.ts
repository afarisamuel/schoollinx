import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ElementRef, signal, computed, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Student } from '../../../core/domain/student.model';
import { BarcodeGenerator, BarcodeBar } from '../../../core/utils/barcode.util';
import { QRCodeComponent } from 'angularx-qrcode';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';

export type IdCardTheme = 'teal' | 'blue' | 'purple' | 'ruby' | 'amber' | 'cyan' | 'rose' | 'forest' | 'dark' | 'onyx' | 'custom';
export type IdCardTemplate = 'wave' | 'academic' | 'corporate' | 'cyber' | 'vertical';

export interface TemplateOption {
  id: IdCardTemplate;
  name: string;
  icon: string;
  desc: string;
}

export interface ThemeConfig {
  id: IdCardTheme;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  waveColor: string;
}

export const ID_CARD_THEMES: ThemeConfig[] = [
  {
    id: 'teal',
    name: 'Emerald Teal',
    primary: '#0d695b',
    secondary: '#138b75',
    accent: '#2dd4bf',
    gradient: 'linear-gradient(135deg, #084c42 0%, #0d695b 50%, #149d85 100%)',
    waveColor: '#0a594c'
  },
  {
    id: 'blue',
    name: 'Ocean Cobalt',
    primary: '#1e3a8a',
    secondary: '#2563eb',
    accent: '#60a5fa',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
    waveColor: '#1e3a8a'
  },
  {
    id: 'purple',
    name: 'Imperial Violet',
    primary: '#581c87',
    secondary: '#7e22ce',
    accent: '#c084fc',
    gradient: 'linear-gradient(135deg, #3b0764 0%, #581c87 50%, #9333ea 100%)',
    waveColor: '#581c87'
  },
  {
    id: 'ruby',
    name: 'Crimson Ruby',
    primary: '#881337',
    secondary: '#be123c',
    accent: '#f43f5e',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #e11d48 100%)',
    waveColor: '#881337'
  },
  {
    id: 'amber',
    name: 'Midnight Amber',
    primary: '#78350f',
    secondary: '#b45309',
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, #1c1917 0%, #451a03 50%, #b45309 100%)',
    waveColor: '#78350f'
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    primary: '#0e7490',
    secondary: '#0891b2',
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, #083344 0%, #0e7490 50%, #06b6d4 100%)',
    waveColor: '#0e7490'
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    primary: '#9f1239',
    secondary: '#e11d48',
    accent: '#fda4af',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #9f1239 50%, #fb7185 100%)',
    waveColor: '#9f1239'
  },
  {
    id: 'forest',
    name: 'Forest Pine',
    primary: '#14532d',
    secondary: '#15803d',
    accent: '#4ade80',
    gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #16a34a 100%)',
    waveColor: '#14532d'
  },
  {
    id: 'dark',
    name: 'Obsidian Slate',
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#94a3b8',
    gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #334155 100%)',
    waveColor: '#0f172a'
  },
  {
    id: 'onyx',
    name: 'Midnight Onyx',
    primary: '#18181b',
    secondary: '#27272a',
    accent: '#e4e4e7',
    gradient: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #3f3f46 100%)',
    waveColor: '#18181b'
  }
];

export const ID_CARD_TEMPLATES: TemplateOption[] = [
  { id: 'wave', name: 'Fluid Wave', icon: 'fas fa-water', desc: 'Modern wave ribbons with circular portrait' },
  { id: 'academic', name: 'Academic Shield', icon: 'fas fa-graduation-cap', desc: 'Prestigious crest with gold accents' },
  { id: 'corporate', name: 'Executive Dual-Tone', icon: 'fas fa-id-badge', desc: 'Modern solid side accent strip' },
  { id: 'cyber', name: 'Angular Poly', icon: 'fas fa-shapes', desc: 'Futuristic geometric angled ribbons' },
  { id: 'vertical', name: 'Lanyard Vertical', icon: 'fas fa-arrows-up-down', desc: 'Portrait badge with punch slot' }
];

@Component({
  selector: 'app-student-id-card',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './student-id-card.component.html',
  styleUrl: './student-id-card.component.css'
})
export class StudentIdCardComponent implements OnInit, AfterViewInit, OnDestroy {
  private tenantService = inject(TenantProfileService);
  private hostEl = inject(ElementRef);

  // Responsive Scaling Signals
  scaleRatio = signal<number>(1);
  private resizeObserver: ResizeObserver | null = null;

  // Signal Inputs (Fully Reactive to Parent Form Changes)
  student = input<Student | null>(null);
  studentName = input<string>('');
  studentIdCode = input<string>('');
  studentDob = input<string>('');
  studentAddress = input<string>('');
  studentPhotoUrl = input<string | null>(null);
  studentGender = input<string>('');
  studentClass = input<string>('');
  studentLevel = input<string>('');
  studentBloodGroup = input<string>('');

  schoolName = input<string>('');
  schoolLogo = input<string>('');
  
  allowColorCustomization = input<boolean>(true);
  showQrCode = input<boolean>(true);
  showBarcode = input<boolean>(true);
  showControls = input<boolean>(true);

  // Optional External Controls (from IdCardStudio)
  theme = input<IdCardTheme | undefined>(undefined);
  template = input<IdCardTemplate | undefined>(undefined);
  isFlipped = input<boolean | undefined>(undefined);

  // Interactive Configuration Signals
  selectedTheme = signal<IdCardTheme>('teal');
  selectedTemplate = signal<IdCardTemplate>('wave');
  customPrimaryColor = signal<string>('#0d695b');
  customSecondaryColor = signal<string>('#138b75');
  isBackSide = signal<boolean>(false);

  // Effective Values
  activeTheme = computed(() => this.theme() || this.selectedTheme());
  activeTemplate = computed(() => this.template() || this.selectedTemplate());
  activeIsBackSide = computed(() => this.isFlipped() !== undefined ? (this.isFlipped() || false) : this.isBackSide());

  // Canonical Pixel Dimensions
  targetWidth = computed(() => this.activeTemplate() === 'vertical' ? 340 : 540);
  targetHeight = computed(() => this.activeTemplate() === 'vertical' ? 540 : 340);
  wrapperHeight = computed(() => `${Math.round(this.targetHeight() * this.scaleRatio())}px`);

  themes = ID_CARD_THEMES;
  templates = ID_CARD_TEMPLATES;
  tenantProfile = signal<TenantProfile | null>(null);

  constructor() {
    effect(() => {
      // Re-trigger scale calculation when template changes
      this.activeTemplate();
      this.calculateScale();
    });
    effect(() => {
      this.resolvedPhoto();
      this.photoError.set(false);
    });
  }

  // Fully Reactive Computed Properties
  resolvedName = computed(() => {
    const directName = this.studentName()?.trim();
    if (directName) return directName.toUpperCase();
    const st = this.student();
    if (st) {
      const parts = [st.first_name, st.other_name, st.last_name].filter(Boolean);
      if (parts.length > 0) return parts.join(' ').toUpperCase();
    }
    return 'CANDIDATE NAME';
  });

  resolvedId = computed(() => {
    const directId = this.studentIdCode()?.trim();
    if (directId) return directId;
    const st = this.student();
    if (st?.enrollment_num) return st.enrollment_num;
    if (st?.id) return `STU-${st.id.substring(0, 8).toUpperCase()}`;
    return 'STU-2026-0042';
  });

  photoError = signal<boolean>(false);

  onPhotoError(): void {
    this.photoError.set(true);
  }

  resolvedDob = computed(() => {
    const raw = this.studentDob() || this.student()?.dob;
    if (!raw) return '05 March 2013';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  });

  resolvedAddress = computed(() => {
    return this.studentAddress() || this.student()?.address || '123 Campus Avenue, Accra';
  });

  resolvedPhoto = computed(() => {
    return this.studentPhotoUrl() || this.student()?.photo_url || null;
  });

  resolvedSchoolName = computed(() => {
    return this.schoolName() || this.tenantProfile()?.name || 'SchoolLinx International Academy';
  });

  resolvedSchoolLogo = computed(() => {
    return this.schoolLogo() || this.tenantProfile()?.logo_url || null;
  });

  resolvedClass = computed(() => {
    return this.studentClass() || this.student()?.class_name || 'Primary 5-A';
  });

  resolvedLevel = computed(() => {
    return this.studentLevel() || (this.student()?.level ? `Level ${this.student()?.level}` : 'Basic Level');
  });

  resolvedBloodGroup = computed(() => {
    return this.studentBloodGroup() || this.student()?.blood_group || 'O+';
  });

  resolvedInitials = computed(() => {
    const name = this.resolvedName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'ST';
  });

  // Current Theme Config
  currentThemeConfig = computed(() => {
    const themeId = this.activeTheme();
    if (themeId === 'custom') {
      return {
        id: 'custom' as IdCardTheme,
        name: 'Custom Palette',
        primary: this.customPrimaryColor(),
        secondary: this.customSecondaryColor(),
        accent: '#38bdf8',
        gradient: `linear-gradient(135deg, ${this.customPrimaryColor()} 0%, ${this.customSecondaryColor()} 100%)`,
        waveColor: this.customPrimaryColor()
      };
    }
    const found = ID_CARD_THEMES.find(t => t.id === themeId);
    return found || ID_CARD_THEMES[0];
  });

  // Barcode data (Code 128)
  barcodeData = computed(() => {
    const text = this.resolvedId();
    return BarcodeGenerator.generateCode128(text, 1.8);
  });

  // QR Code Payload (Encodes attendance verification payload)
  qrPayload = computed(() => {
    return JSON.stringify({
      id: this.student()?.id || this.resolvedId(),
      code: this.resolvedId(),
      name: this.resolvedName(),
      type: 'STUDENT_ATTENDANCE'
    });
  });

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('schoollinx_id_card_theme');
    if (savedTheme && (ID_CARD_THEMES.some(t => t.id === savedTheme) || savedTheme === 'custom')) {
      this.selectedTheme.set(savedTheme as IdCardTheme);
    }

    const savedTpl = localStorage.getItem('schoollinx_id_card_template');
    if (savedTpl && ID_CARD_TEMPLATES.some(t => t.id === savedTpl)) {
      this.selectedTemplate.set(savedTpl as IdCardTemplate);
    }

    this.tenantService.getProfile().subscribe({
      next: (profile) => this.tenantProfile.set(profile),
      error: () => {}
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateScale();
  }

  calculateScale(providedWidth?: number): void {
    if (typeof window === 'undefined') return;
    const host = this.hostEl?.nativeElement;
    const width = providedWidth ?? (host?.clientWidth || 540);
    if (!width || width <= 0) return;
    const targetW = this.targetWidth();
    const ratio = Math.min(1, width / targetW);
    this.scaleRatio.set(ratio > 0 ? ratio : 1);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const host = this.hostEl?.nativeElement;
    if (!host) return;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          this.calculateScale(width);
        }
      }
    });
    this.resizeObserver.observe(host);
    this.calculateScale(host.clientWidth);
  }

  setTheme(themeId: IdCardTheme) {
    this.selectedTheme.set(themeId);
    localStorage.setItem('schoollinx_id_card_theme', themeId);
  }

  setTemplate(tplId: IdCardTemplate) {
    this.selectedTemplate.set(tplId);
    localStorage.setItem('schoollinx_id_card_template', tplId);
  }

  setCustomColor(primary: string, secondary: string) {
    this.customPrimaryColor.set(primary);
    this.customSecondaryColor.set(secondary);
    this.selectedTheme.set('custom');
    localStorage.setItem('schoollinx_id_card_theme', 'custom');
  }

  toggleFlip() {
    this.isBackSide.set(!this.isBackSide());
  }

  /**
   * High-Fidelity Dual-Sided ID Card Printing Engine
   * Generates a self-contained, print-perfect document rendering BOTH Front and Back sides.
   */
  printCard() {
    // 1. Capture QR Canvas if present
    let qrDataUrl = '';
    const qrCanvas = document.querySelector('#student-id-card-badge qrcode canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      try {
        qrDataUrl = qrCanvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Could not extract QR canvas data URL', e);
      }
    }

    // 2. Build Barcode SVG
    const bars = this.barcodeData().bars;
    const totalWidth = this.barcodeData().totalWidth;
    const barcodeSvg = `
      <svg viewBox="0 0 ${totalWidth} 22" width="120" height="20" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${bars.map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="22" fill="#0f172a" />`).join('')}
      </svg>
    `;

    const theme = this.currentThemeConfig();
    const tpl = this.selectedTemplate();
    const name = this.resolvedName();
    const id = this.resolvedId();
    const dob = this.resolvedDob();
    const address = this.resolvedAddress();
    const className = this.resolvedClass();
    const bloodGroup = this.resolvedBloodGroup();
    const schoolName = this.resolvedSchoolName();
    const schoolLogo = this.resolvedSchoolLogo();
    const photo = this.resolvedPhoto();
    const initials = this.resolvedInitials();
    const hotline = this.tenantProfile()?.contact_numbers || '+233 24 000 0000';
    const schoolEmail = this.tenantProfile()?.email || 'admin@school.edu';
    const signatureUrl = this.tenantProfile()?.headmaster_signature_url;

    // Build Front Card HTML according to selected template
    let frontCardBody = '';

    if (tpl === 'academic') {
      frontCardBody = `
        <div class="card-inner academic-layout">
          <div class="academic-header" style="background:${theme.primary}; border-bottom: 2px solid #fbbf24;">
            <div style="display:flex; align-items:center; gap:8px;">
              ${schoolLogo ? `<img src="${schoolLogo}" style="width:32px; height:32px; object-fit:contain; background:#fff; padding:2px; border-radius:6px; border:1px solid #fde68a;">` : `<div style="width:32px; height:32px; background:rgba(255,255,255,0.2); border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fde68a; font-weight:bold; font-size:14px;">🎓</div>`}
              <div>
                <div style="font-size:10px; font-weight:900; color:#fff; text-transform:uppercase; letter-spacing:0.5px;">${schoolName}</div>
                <div style="font-size:7px; font-weight:800; color:#fde68a; text-transform:uppercase; letter-spacing:1px;">OFFICIAL STUDENT PASSPORT • ${className}</div>
              </div>
            </div>
            <div style="background:#fbbf24; color:#111827; padding:2px 6px; border-radius:4px; font-size:7.5px; font-weight:900;">2026/27</div>
          </div>
          <div class="academic-body">
            <div class="photo-box" style="border: 2.5px solid #fbbf24; border-radius:8px; width:75px; height:88px; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:22px; font-weight:900; color:#4b5563;">${initials}</div>`}
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
              <div style="border-bottom:1px solid #e5e7eb; padding-bottom:3px;">
                <div style="font-size:7px; font-weight:800; color:#6b7280; text-transform:uppercase;">Student Full Name</div>
                <div style="font-size:11px; font-weight:900; color:#111827; text-transform:uppercase;">${name}</div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:8.5px;">
                <div><span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase; display:block;">Student ID</span><strong>${id}</strong></div>
                <div><span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase; display:block;">D.O.B</span><span>${dob}</span></div>
                <div><span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase; display:block;">Class</span><span>${className}</span></div>
                <div><span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase; display:block;">Blood Group</span><strong style="color:#b91c1c;">${bloodGroup}</strong></div>
              </div>
            </div>
          </div>
          <div class="academic-footer" style="background:#f3f4f6; border-top:1px solid #d1d5db; display:flex; align-items:center; justify-content:between; padding:4px 12px;">
            <div>${barcodeSvg}<div style="font-size:6.5px; font-family:monospace; text-align:center; color:#374151;">${id}</div></div>
            ${qrDataUrl ? `<div style="display:flex; align-items:center; gap:4px;"><img src="${qrDataUrl}" style="width:34px; height:34px;"><div style="font-size:6.5px; font-weight:800; color:#4b5563; text-transform:uppercase;"><span>Verified</span><br><strong style="color:#d97706;">Pass</strong></div></div>` : ''}
          </div>
        </div>
      `;
    } else if (tpl === 'corporate') {
      frontCardBody = `
        <div class="card-inner corporate-layout" style="display:flex; height:100%;">
          <div style="width:35%; background:${theme.primary}; color:#fff; padding:10px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center;">
            ${schoolLogo ? `<img src="${schoolLogo}" style="width:28px; height:28px; object-fit:contain; background:rgba(255,255,255,0.2); padding:2px; border-radius:6px;">` : `<div style="width:28px; height:28px; border-radius:6px; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:12px;">🏫</div>`}
            <div style="width:68px; height:68px; border-radius:50%; border:2.5px solid #fff; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center;">
              ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:20px; font-weight:900; color:#1f2937;">${initials}</div>`}
            </div>
            <div style="background:rgba(255,255,255,0.25); padding:2px 6px; border-radius:12px; font-size:7.5px; font-family:monospace; font-weight:800;">${id}</div>
            ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:30px; height:30px; background:#fff; padding:1px; border-radius:4px;">` : ''}
          </div>
          <div style="width:65%; padding:10px 14px; display:flex; flex-direction:column; justify-content:space-between; background:#fff;">
            <div style="border-bottom:1px solid #e5e7eb; padding-bottom:4px; display:flex; justify-content:space-between; align-items:flex-start;">
              <div><div style="font-size:9.5px; font-weight:900; color:#111827; text-transform:uppercase;">${schoolName}</div><div style="font-size:7px; color:#6b7280; font-weight:700; text-transform:uppercase;">Student Identification Card</div></div>
              <div style="background:${theme.secondary}; color:#fff; padding:2px 6px; border-radius:4px; font-size:7.5px; font-weight:800;">${className}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div style="font-size:6.5px; color:#9ca3af; font-weight:800; text-transform:uppercase;">Full Name</div>
              <div style="font-size:11px; font-weight:900; color:#111827; text-transform:uppercase;">${name}</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:3px; font-size:8px; margin-top:2px;">
                <div><span style="font-size:6.5px; color:#9ca3af; font-weight:800; display:block;">D.O.B</span><strong>${dob}</strong></div>
                <div><span style="font-size:6.5px; color:#9ca3af; font-weight:800; display:block;">Blood Group</span><strong style="color:#b91c1c;">${bloodGroup}</strong></div>
              </div>
              <div><span style="font-size:6.5px; color:#9ca3af; font-weight:800; display:block;">Address</span><span style="font-size:7.5px; color:#374151;">${address}</span></div>
            </div>
            <div style="border-top:1px solid #e5e7eb; padding-top:3px; display:flex; justify-content:space-between; align-items:center;">
              ${barcodeSvg}
              <div style="font-size:7px; font-weight:800; color:#9ca3af;">EXP: 2027</div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Default: Wave & Universal CR80 Layout
      frontCardBody = `
        <div class="card-inner wave-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow:hidden;">
          <!-- SVG Top Wave -->
          <svg viewBox="0 0 540 160" style="position:absolute; top:0; left:0; width:100%; height:45%; pointer-events:none;" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveTopPrint" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${theme.primary}" />
                <stop offset="60%" stop-color="${theme.secondary}" />
                <stop offset="100%" stop-color="${theme.accent}" />
              </linearGradient>
            </defs>
            <path d="M 0,0 L 540,0 L 540,110 C 440,175 320,135 220,95 C 130,55 50,85 0,140 Z" fill="url(#waveTopPrint)" />
          </svg>

          <!-- SVG Bottom Wave -->
          <svg viewBox="0 0 540 100" style="position:absolute; bottom:0; left:0; width:100%; height:26%; pointer-events:none;" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveBottomPrint" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${theme.accent}" />
                <stop offset="60%" stop-color="${theme.secondary}" />
                <stop offset="100%" stop-color="${theme.primary}" />
              </linearGradient>
            </defs>
            <path d="M 0,60 C 150,20 350,90 540,30 L 540,100 L 0,100 Z" fill="url(#waveBottomPrint)" />
          </svg>

          <!-- Header -->
          <div style="position:relative; z-index:2; padding:10px 14px 4px 14px; display:flex; justify-content:space-between; align-items:flex-start; color:#fff;">
            <div style="display:flex; align-items:center; gap:8px; max-width:65%;">
              ${schoolLogo ? `<img src="${schoolLogo}" style="width:30px; height:30px; object-fit:contain; background:rgba(255,255,255,0.25); padding:2px; border-radius:6px; border:1px solid rgba(255,255,255,0.4);">` : `<div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.5); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">🎓</div>`}
              <div>
                <div style="font-size:9.5px; font-weight:900; text-transform:uppercase; line-height:1.1; letter-spacing:0.3px;">${schoolName}</div>
                <div style="font-size:6.5px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:1px;">Official Student Card</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; font-weight:900; text-transform:uppercase; line-height:1; font-family:serif; letter-spacing:0.5px;">STUDENT<br>ID CARD</div>
            </div>
          </div>

          <!-- Middle Body: Photo & Details -->
          <div style="position:relative; z-index:2; padding:2px 14px; display:flex; align-items:center; gap:12px;">
            <div style="width:74px; height:74px; border-radius:50%; border:3px solid ${theme.secondary}; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
              ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:22px; font-weight:900; color:#374151;">${initials}</div>`}
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:2.5px; font-size:8.5px; color:#1f2937;">
              <div style="display:flex;"><span style="width:52px; font-weight:700; color:#4b5563;">Name</span><span style="margin-right:4px;">:</span><strong style="font-size:9.5px; text-transform:uppercase; color:#111827;">${name}</strong></div>
              <div style="display:flex;"><span style="width:52px; font-weight:700; color:#4b5563;">Student ID</span><span style="margin-right:4px;">:</span><strong style="font-family:monospace; font-size:9px; color:#111827;">${id}</strong></div>
              <div style="display:flex;"><span style="width:52px; font-weight:700; color:#4b5563;">D.O.B</span><span style="margin-right:4px;">:</span><span>${dob}</span></div>
              <div style="display:flex;"><span style="width:52px; font-weight:700; color:#4b5563;">Class</span><span style="margin-right:4px;">:</span><span>${className}</span></div>
              <div style="display:flex;"><span style="width:52px; font-weight:700; color:#4b5563;">Address</span><span style="margin-right:4px;">:</span><span style="font-size:7.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px;">${address}</span></div>
            </div>
          </div>

          <!-- Bottom Row: Barcode & QR -->
          <div style="position:relative; z-index:2; padding:2px 14px 8px 14px; display:flex; align-items:flex-end; justify-content:space-between;">
            <div style="background:rgba(255,255,255,0.92); padding:2px 6px; border-radius:6px; border:1px solid #e5e7eb;">
              ${barcodeSvg}
              <div style="font-size:6px; font-family:monospace; text-align:center; color:#374151; letter-spacing:1px;">${id}</div>
            </div>
            ${qrDataUrl ? `
              <div style="background:rgba(255,255,255,0.95); padding:2px 6px; border-radius:8px; border:1px solid #e5e7eb; display:flex; align-items:center; gap:4px;">
                <img src="${qrDataUrl}" style="width:34px; height:34px;">
                <div style="font-size:6px; font-weight:800; color:#4b5563; text-transform:uppercase; line-height:1.1;">
                  <span>Scan for</span><br><strong style="color:${theme.primary}; font-size:7px;">Attendance</strong>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Build Back Card HTML
    const backCardBody = `
      <div class="card-inner back-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:12px 16px; background:#f9fafb; color:#111827;">
        <!-- Top Wave Strip -->
        <div style="position:absolute; top:0; left:0; right:0; height:5px; background:${theme.gradient};"></div>

        <!-- Rules & Regulations -->
        <div style="display:flex; flex-direction:column; gap:4px; padding-top:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #d1d5db; padding-bottom:3px;">
            <span style="font-size:8.5px; font-weight:900; text-transform:uppercase; color:#1f2937;">Card Terms & Regulations</span>
            <span style="font-size:7px; font-family:monospace; font-weight:700; color:#6b7280;">CR80 PVC SPEC</span>
          </div>
          <p style="font-size:7px; color:#4b5563; line-height:1.3; margin:0;">
            1. This card is the property of <strong style="color:#111827;">${schoolName}</strong> and must be worn or presented upon request by authorized personnel.
          </p>
          <p style="font-size:7px; color:#4b5563; line-height:1.3; margin:0;">
            2. Required for automated biometric attendance, examination hall admissions, library loans, and campus health services.
          </p>
          <p style="font-size:7px; color:#4b5563; line-height:1.3; margin:0;">
            3. If found, please return immediately to the School Administration Office or notify campus security via the emergency hotline.
          </p>
        </div>

        <!-- Emergency Hotline & Signature -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; border-top:1px solid #d1d5db; padding-top:4px; font-size:8px;">
          <div style="display:flex; flex-direction:column; gap:1px;">
            <span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase;">Emergency Hotline:</span>
            <strong style="font-family:monospace; font-size:8px; color:#111827;">${hotline}</strong>
            <span style="font-size:6.5px; color:#6b7280;">${schoolEmail}</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
            <span style="font-size:6.5px; font-weight:800; color:#6b7280; text-transform:uppercase;">Authorized Signature:</span>
            <div style="height:18px; display:flex; align-items:flex-end; justify-content:flex-end;">
              ${signatureUrl ? `<img src="${signatureUrl}" style="max-height:16px; object-fit:contain;">` : `<span style="font-family:serif; font-style:italic; font-size:9px; color:#374151;">Registrar Office</span>`}
            </div>
            <div style="width:85px; border-bottom:1px solid #111827; margin-top:2px;"></div>
          </div>
        </div>

        <!-- Bottom Wave Strip -->
        <div style="position:absolute; bottom:0; left:0; right:0; height:4px; background:${theme.gradient};"></div>
      </div>
    `;

    // 3. Create clean isolated printing window / iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1000px';
    iframe.style.height = '1200px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Student ID Card - ${name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              margin: 0;
              padding: 10px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #ffffff;
              color: #111827;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 98vh;
            }
            .print-page-wrapper {
              width: 100%;
              max-width: 650px;
              margin: 0 auto;
              text-align: center;
            }
            .sheet-header {
              margin-bottom: 24px;
              border-bottom: 2px dashed #cbd5e1;
              padding-bottom: 12px;
            }
            .sheet-header h2 {
              margin: 0 0 4px 0;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .sheet-header p {
              margin: 0;
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
            }
            .cards-sheet {
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: center;
              gap: 20px;
              margin: 0 auto;
            }
            .card-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }
            .card-label {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #475569;
              background: #f1f5f9;
              padding: 2px 8px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .id-card-cr80 {
              width: 85.6mm;
              height: 53.98mm;
              border-radius: 3.18mm;
              border: 1px solid #cbd5e1;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
              overflow: hidden;
              background: #ffffff;
              position: relative;
            }
            .cut-guide {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 4px;
              color: #94a3b8;
              font-size: 8px;
              font-weight: 800;
            }
            .cut-line {
              width: 1px;
              height: 140px;
              border-left: 1.5px dashed #94a3b8;
            }
            .instructions {
              margin-top: 30px;
              padding: 10px 16px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              background: #f8fafc;
              font-size: 9px;
              color: #64748b;
              text-align: left;
              line-height: 1.4;
            }
            @media print {
              body {
                padding: 0;
                min-height: auto;
              }
              .instructions {
                display: none;
              }
              .id-card-cr80 {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-page-wrapper">
            <div class="sheet-header">
              <h2>${schoolName}</h2>
              <p>Official Student Credential ID Badge • Dual-Sided CR80 Format (85.6mm × 53.98mm)</p>
            </div>

            <div class="cards-sheet">
              <!-- FRONT CARD -->
              <div class="card-container">
                <div class="card-label">FRONT SIDE</div>
                <div class="id-card-cr80">
                  ${frontCardBody}
                </div>
              </div>

              <!-- CUT / FOLD GUIDE -->
              <div class="cut-guide">
                <span>✂</span>
                <div class="cut-line"></div>
                <span>FOLD</span>
              </div>

              <!-- BACK CARD -->
              <div class="card-container">
                <div class="card-label">BACK SIDE</div>
                <div class="id-card-cr80">
                  ${backCardBody}
                </div>
              </div>
            </div>

            <div class="instructions">
              <strong>Printing & Assembly Guide:</strong><br>
              • <strong>Paper Printing:</strong> Print in color on standard A4 / Letter cardstock (100% scale / No margin fit), cut along borders, and fold at the center guide for an instant dual-sided laminated badge.<br>
              • <strong>PVC Card Printing:</strong> Each card is scaled precisely to ISO/IEC 7810 ID-1 standard CR80 credit-card dimensions (85.6mm × 53.98mm).
            </div>
          </div>

          <script>
            function runPrint() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            }
            if (document.readyState === 'complete') {
              runPrint();
            } else {
              window.addEventListener('load', runPrint);
            }
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after printing dialog closes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 6000);
  }
}
