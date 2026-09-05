import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Student } from '../../../core/domain/student.model';
import { BarcodeGenerator, BarcodeBar } from '../../../core/utils/barcode.util';
import { QRCodeComponent } from 'angularx-qrcode';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';

export type IdCardTheme = 'teal' | 'blue' | 'purple' | 'ruby' | 'amber' | 'dark' | 'custom';

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
    gradient: 'from-[#084c42] via-[#0d695b] to-[#149d85]',
    waveColor: '#0a594c'
  },
  {
    id: 'blue',
    name: 'Ocean Cobalt',
    primary: '#1e3a8a',
    secondary: '#2563eb',
    accent: '#60a5fa',
    gradient: 'from-[#0f172a] via-[#1e3a8a] to-[#2563eb]',
    waveColor: '#1e3a8a'
  },
  {
    id: 'purple',
    name: 'Imperial Violet',
    primary: '#581c87',
    secondary: '#7e22ce',
    accent: '#c084fc',
    gradient: 'from-[#3b0764] via-[#581c87] to-[#9333ea]',
    waveColor: '#581c87'
  },
  {
    id: 'ruby',
    name: 'Crimson Ruby',
    primary: '#881337',
    secondary: '#be123c',
    accent: '#f43f5e',
    gradient: 'from-[#4c0519] via-[#881337] to-[#e11d48]',
    waveColor: '#881337'
  },
  {
    id: 'amber',
    name: 'Midnight Amber',
    primary: '#78350f',
    secondary: '#b45309',
    accent: '#f59e0b',
    gradient: 'from-[#1c1917] via-[#451a03] to-[#b45309]',
    waveColor: '#78350f'
  },
  {
    id: 'dark',
    name: 'Obsidian Slate',
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#94a3b8',
    gradient: 'from-[#020617] via-[#0f172a] to-[#334155]',
    waveColor: '#0f172a'
  }
];

@Component({
  selector: 'app-student-id-card',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './student-id-card.component.html',
  styleUrl: './student-id-card.component.css'
})
export class StudentIdCardComponent implements OnInit {
  private tenantService = inject(TenantProfileService);

  @Input() student: Student | null = null;
  @Input() studentName: string = '';
  @Input() studentIdCode: string = '';
  @Input() studentDob: string = '';
  @Input() studentAddress: string = '';
  @Input() studentPhotoUrl: string | null = null;
  @Input() studentGender: string = '';
  @Input() studentClass: string = '';
  @Input() studentLevel: string = '';
  @Input() studentBloodGroup: string = '';

  @Input() schoolName: string = '';
  @Input() schoolLogo: string = '';
  
  @Input() allowColorCustomization: boolean = true;
  @Input() showQrCode: boolean = true;
  @Input() showBarcode: boolean = true;
  @Input() showControls: boolean = true;

  // Selected Card Theme
  selectedTheme = signal<IdCardTheme>('teal');
  customPrimaryColor = signal<string>('#0d695b');
  customSecondaryColor = signal<string>('#138b75');
  isBackSide = signal<boolean>(false);

  themes = ID_CARD_THEMES;
  tenantProfile = signal<TenantProfile | null>(null);

  // Resolved Display Values
  resolvedName = computed(() => {
    if (this.studentName) return this.studentName;
    if (!this.student) return 'ALFREDO TORRES';
    const parts = [this.student.first_name, this.student.other_name, this.student.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ').toUpperCase() : 'ALFREDO TORRES';
  });

  resolvedId = computed(() => {
    if (this.studentIdCode) return this.studentIdCode;
    if (this.student?.enrollment_num) return this.student.enrollment_num;
    if (this.student?.id) return `STU-${this.student.id.substring(0, 8).toUpperCase()}`;
    return 'STU-2026-0042';
  });

  resolvedDob = computed(() => {
    const raw = this.studentDob || this.student?.dob;
    if (!raw) return '05 March 2013';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  });

  resolvedAddress = computed(() => {
    return this.studentAddress || this.student?.address || '123 Campus Avenue, Accra';
  });

  resolvedPhoto = computed(() => {
    return this.studentPhotoUrl || this.student?.photo_url || null;
  });

  resolvedSchoolName = computed(() => {
    return this.schoolName || this.tenantProfile()?.name || 'Hanover and Tyke Elementary School';
  });

  resolvedSchoolLogo = computed(() => {
    return this.schoolLogo || this.tenantProfile()?.logo_url || null;
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
    const themeId = this.selectedTheme();
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

  // Barcode data
  barcodeData = computed(() => {
    const text = this.resolvedId();
    return BarcodeGenerator.generateCode128(text, 1.8);
  });

  // QR Code Payload (Encodes attendance verification payload)
  qrPayload = computed(() => {
    return JSON.stringify({
      id: this.student?.id || this.resolvedId(),
      code: this.resolvedId(),
      name: this.resolvedName(),
      type: 'STUDENT_ATTENDANCE'
    });
  });

  ngOnInit(): void {
    // Check saved theme in localStorage if available
    const saved = localStorage.getItem('schoollinx_id_card_theme');
    if (saved && (ID_CARD_THEMES.some(t => t.id === saved) || saved === 'custom')) {
      this.selectedTheme.set(saved as IdCardTheme);
    }

    this.tenantService.getProfile().subscribe({
      next: (profile) => this.tenantProfile.set(profile),
      error: () => {}
    });
  }

  setTheme(themeId: IdCardTheme) {
    this.selectedTheme.set(themeId);
    localStorage.setItem('schoollinx_id_card_theme', themeId);
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

  printCard() {
    window.print();
  }
}
