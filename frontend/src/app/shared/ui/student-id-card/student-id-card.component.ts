import { Component, OnInit, signal, computed, inject, input } from '@angular/core';
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
    id: 'cyan',
    name: 'Cyber Cyan',
    primary: '#0e7490',
    secondary: '#0891b2',
    accent: '#22d3ee',
    gradient: 'from-[#083344] via-[#0e7490] to-[#06b6d4]',
    waveColor: '#0e7490'
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    primary: '#9f1239',
    secondary: '#e11d48',
    accent: '#fda4af',
    gradient: 'from-[#4c0519] via-[#9f1239] to-[#fb7185]',
    waveColor: '#9f1239'
  },
  {
    id: 'forest',
    name: 'Forest Pine',
    primary: '#14532d',
    secondary: '#15803d',
    accent: '#4ade80',
    gradient: 'from-[#052e16] via-[#14532d] to-[#16a34a]',
    waveColor: '#14532d'
  },
  {
    id: 'dark',
    name: 'Obsidian Slate',
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#94a3b8',
    gradient: 'from-[#020617] via-[#0f172a] to-[#334155]',
    waveColor: '#0f172a'
  },
  {
    id: 'onyx',
    name: 'Midnight Onyx',
    primary: '#18181b',
    secondary: '#27272a',
    accent: '#e4e4e7',
    gradient: 'from-[#09090b] via-[#18181b] to-[#3f3f46]',
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
export class StudentIdCardComponent implements OnInit {
  private tenantService = inject(TenantProfileService);

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

  // Interactive Configuration Signals
  selectedTheme = signal<IdCardTheme>('teal');
  selectedTemplate = signal<IdCardTemplate>('wave');
  customPrimaryColor = signal<string>('#0d695b');
  customSecondaryColor = signal<string>('#138b75');
  isBackSide = signal<boolean>(false);

  themes = ID_CARD_THEMES;
  templates = ID_CARD_TEMPLATES;
  tenantProfile = signal<TenantProfile | null>(null);

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
   * Isolated ID Card Printing Engine
   * Creates an isolated print frame containing ONLY the ID card element,
   * completely ignoring the outer webpage / form, and printing in exact CR80 format.
   */
  printCard() {
    const cardEl = document.getElementById('student-id-card-badge');
    if (!cardEl) {
      window.print();
      return;
    }

    // Clone element
    const cardHtml = cardEl.outerHTML;

    // Collect all stylesheets from the host document
    let stylesHtml = '';
    const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleElements.forEach(el => {
      stylesHtml += el.outerHTML;
    });

    const isVertical = this.selectedTemplate() === 'vertical';
    const cardWidth = isVertical ? '53.98mm' : '85.6mm';
    const cardHeight = isVertical ? '85.6mm' : '53.98mm';

    // Create an isolated hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
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
          <title>Student ID Badge - ${this.resolvedName()}</title>
          ${stylesHtml}
          <style>
            @page {
              size: ${cardWidth} ${cardHeight};
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: ${cardWidth} !important;
              height: ${cardHeight} !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #student-id-card-badge {
              width: ${cardWidth} !important;
              height: ${cardHeight} !important;
              max-width: ${cardWidth} !important;
              max-height: ${cardHeight} !important;
              border-radius: 3.18mm !important;
              box-shadow: none !important;
              margin: 0 !important;
              border: none !important;
              overflow: hidden !important;
            }
          </style>
        </head>
        <body>
          ${cardHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            };
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
    }, 4000);
  }
}
