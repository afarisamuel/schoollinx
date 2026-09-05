import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Student } from '../../../core/domain/student.model';
import { Class } from '../../../core/infrastructure/curriculum/class.service';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
import { ID_CARD_THEMES, ID_CARD_TEMPLATES, IdCardTheme, IdCardTemplate, ThemeConfig } from '../student-id-card/student-id-card.component';
import { BarcodeGenerator } from '../../../core/utils/barcode.util';

@Component({
  selector: 'app-batch-id-card-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-id-card-modal.component.html',
  styleUrl: './batch-id-card-modal.component.css'
})
export class BatchIdCardModalComponent {
  private tenantService = inject(TenantProfileService);

  @Input({ required: true }) allStudents: Student[] = [];
  @Input() selectedStudents: Student[] = [];
  @Input() classes: Class[] = [];
  @Output() close = new EventEmitter<void>();

  // Configuration Signals
  selectedClassId = signal<string>('all');
  selectedTheme = signal<IdCardTheme>('teal');
  selectedTemplate = signal<IdCardTemplate>('wave');
  printMode = signal<'a4-paired' | 'a4-fronts-only' | 'pvc-duplex'>('a4-paired');
  tenantProfile = signal<TenantProfile | null>(null);

  themes = ID_CARD_THEMES;
  templates = ID_CARD_TEMPLATES;

  constructor() {
    this.tenantService.getProfile().subscribe({
      next: (p) => this.tenantProfile.set(p),
      error: () => {}
    });
  }

  // Filtered Students to Print
  targetStudents = computed(() => {
    if (this.selectedStudents && this.selectedStudents.length > 0) {
      return this.selectedStudents;
    }
    const classId = this.selectedClassId();
    if (classId === 'all') {
      return this.allStudents.slice(0, 100); // safety cap
    }
    return this.allStudents.filter(s => s.class_id === classId);
  });

  currentThemeConfig = computed(() => {
    return this.themes.find(t => t.id === this.selectedTheme()) || this.themes[0];
  });

  getSchoolName(): string {
    return this.tenantProfile()?.name || 'SchoolLinx International Academy';
  }

  getSchoolLogo(): string | null {
    return this.tenantProfile()?.logo_url || null;
  }

  getStudentFullName(s: Student): string {
    const parts = [s.first_name, s.other_name, s.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ').toUpperCase() : 'CANDIDATE NAME';
  }

  getStudentId(s: Student): string {
    if (s.enrollment_num) return s.enrollment_num;
    if (s.id) return `STU-${s.id.substring(0, 8).toUpperCase()}`;
    return 'STU-2026-0001';
  }

  getStudentDob(s: Student): string {
    if (!s.dob) return '01 Jan 2012';
    const d = new Date(s.dob);
    return isNaN(d.getTime()) ? s.dob : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getInitials(s: Student): string {
    const fn = s.first_name?.[0] || 'S';
    const ln = s.last_name?.[0] || 'T';
    return (fn + ln).toUpperCase();
  }

  /**
   * Generates High-Density Batch Printable Document
   */
  printBatch() {
    const students = this.targetStudents();
    if (students.length === 0) return;

    const theme = this.currentThemeConfig();
    const schoolName = this.getSchoolName();
    const schoolLogo = this.getSchoolLogo();
    const hotline = this.tenantProfile()?.contact_numbers || '+233 24 000 0000';
    const schoolEmail = this.tenantProfile()?.email || 'admin@school.edu';
    const signatureUrl = this.tenantProfile()?.headmaster_signature_url;
    const mode = this.printMode();

    // Build Cards HTML
    const cardsHtml = students.map((s, idx) => {
      const name = this.getStudentFullName(s);
      const id = this.getStudentId(s);
      const dob = this.getStudentDob(s);
      const className = s.class_name || 'Class Roster';
      const bloodGroup = s.blood_group || 'O+';
      const residence = s.placed_residence_type || 'Day Scholar';
      const emergencyContact = s.emergency_contact_name || s.guardian_name || s.father_name || 'Guardian';
      const emergencyPhone = s.emergency_contact_phone || s.guardian_phone || s.father_phone || hotline;
      const allergies = s.allergies || 'None';
      const initials = this.getInitials(s);
      const photo = s.photo_url || null;

      const barcode = BarcodeGenerator.generateCode128(id, 1.6);
      const barcodeSvg = `
        <svg viewBox="0 0 ${barcode.totalWidth} 20" width="115" height="16" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          ${barcode.bars.map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="20" fill="#0f172a" />`).join('')}
        </svg>
      `;

      // Front Side
      const front = `
        <div class="card-box cr80-card">
          <div class="card-inner wave-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow:hidden;">
            <!-- SVG Top Wave Ribbon -->
            <svg viewBox="0 0 540 160" style="position:absolute; top:0; left:0; width:100%; height:46%; pointer-events:none;" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveTop_${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${theme.primary}" />
                  <stop offset="55%" stop-color="${theme.secondary}" />
                  <stop offset="100%" stop-color="${theme.accent}" />
                </linearGradient>
              </defs>
              <path d="M 0,0 L 540,0 L 540,110 C 440,175 320,135 220,95 C 130,55 50,85 0,140 Z" fill="url(#waveTop_${idx})" />
            </svg>

            <!-- SVG Bottom Wave Ribbon -->
            <svg viewBox="0 0 540 100" style="position:absolute; bottom:0; left:0; width:100%; height:25%; pointer-events:none;" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBottom_${idx}" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="${theme.accent}" />
                  <stop offset="50%" stop-color="${theme.secondary}" />
                  <stop offset="100%" stop-color="${theme.primary}" />
                </linearGradient>
              </defs>
              <path d="M 0,60 C 150,20 350,90 540,30 L 540,100 L 0,100 Z" fill="url(#waveBottom_${idx})" />
            </svg>

            <!-- Header -->
            <div style="position:relative; z-index:2; padding:7px 12px 2px 12px; display:flex; justify-content:space-between; align-items:flex-start; color:#fff;">
              <div style="display:flex; align-items:center; gap:6px; max-width:68%;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="width:26px; height:26px; object-fit:contain; background:rgba(255,255,255,0.25); padding:2px; border-radius:4px;">` : `<div style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">🎓</div>`}
                <div>
                  <div style="font-size:8.5px; font-weight:900; text-transform:uppercase; line-height:1.1; letter-spacing:-0.2px;">${schoolName}</div>
                  <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.5px;">Official Student Identity</div>
                </div>
              </div>
              <div style="font-size:9.5px; font-weight:900; text-transform:uppercase; line-height:1; font-family:serif; text-align:right;">STUDENT<br>ID CARD</div>
            </div>

            <!-- Body -->
            <div style="position:relative; z-index:2; padding:1px 12px; display:flex; align-items:center; gap:10px;">
              <div style="width:62px; height:62px; border-radius:50%; border:2.5px solid ${theme.secondary}; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:18px; font-weight:900; color:#374151;">${initials}</div>`}
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:2px; font-size:7.5px; color:#1f2937;">
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">Name</span><span style="margin-right:3px;">:</span><strong style="font-size:8.5px; text-transform:uppercase; color:#0f172a;">${name}</strong></div>
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">ID No</span><span style="margin-right:3px;">:</span><strong style="font-family:monospace; font-size:8px; color:#0f172a;">${id}</strong></div>
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">Class</span><span style="margin-right:3px;">:</span><span style="font-weight:700;">${className}</span></div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding-right:4px;">
                  <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">D.O.B</span><span style="margin-right:3px;">:</span><span>${dob}</span></div>
                  <span style="font-size:6px; font-weight:800; color:#e11d48; background:#ffe4e6; padding:1px 4px; border-radius:3px; border:1px solid #fecdd3;">🩸 ${bloodGroup}</span>
                </div>
              </div>
            </div>

            <!-- Footer Barcode & Validity -->
            <div style="position:relative; z-index:2; padding:1px 12px 5px 12px; display:flex; align-items:flex-end; justify-content:space-between;">
              <div style="background:rgba(255,255,255,0.95); padding:2px 5px; border-radius:4px; border:1px solid #cbd5e1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                ${barcodeSvg}
                <div style="font-size:5.5px; font-family:monospace; text-align:center; color:#334155; letter-spacing:0.5px;">${id}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
                <span style="font-size:6px; font-weight:800; text-transform:uppercase; color:#475569; background:rgba(255,255,255,0.9); padding:1px 5px; border-radius:3px; border:1px solid #cbd5e1;">${residence}</span>
                <span style="font-size:6.5px; font-weight:900; color:#0f172a; background:rgba(255,255,255,0.95); padding:1px 5px; border-radius:3px; border:1px solid #cbd5e1;">VALID: 2025/26</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Back Side
      const back = `
        <div class="card-box cr80-card">
          <div class="card-inner back-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:8px 11px; background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1;">
            <div style="position:absolute; top:0; left:0; right:0; height:3.5px; background:${theme.gradient};"></div>
            
            <!-- Terms & Regulation -->
            <div style="display:flex; flex-direction:column; gap:2.5px; padding-top:2px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:1.5px;">
                <span style="font-size:7px; font-weight:900; text-transform:uppercase; color:#0f172a; letter-spacing:0.3px;">Terms & Regulations</span>
                <span style="font-size:6px; font-weight:700; color:#64748b;">OFFICIAL CREDENTIAL</span>
              </div>
              <p style="font-size:6px; color:#475569; line-height:1.2; margin:0;">
                1. Property of <strong style="color:#0f172a;">${schoolName}</strong>. Carry at all times on campus.
              </p>
              <p style="font-size:6px; color:#475569; line-height:1.2; margin:0;">
                2. Required for gate attendance, examinations, library checkout & canteen wallet.
              </p>
            </div>

            <!-- Emergency & Medical Info Box -->
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:4px; padding:3px 6px; display:flex; flex-direction:column; gap:1.5px; font-size:6.5px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:800; color:#dc2626; text-transform:uppercase; font-size:6px;">⚠️ Emergency & Medical Alert:</span>
                <span style="font-weight:700; color:#334155; font-size:6px;">Blood: <strong>${bloodGroup}</strong></span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:#64748b;">Guardian: <strong style="color:#0f172a;">${emergencyContact}</strong></span>
                <span style="color:#64748b;">Tel: <strong style="color:#0f172a; font-family:monospace;">${emergencyPhone}</strong></span>
              </div>
            </div>

            <!-- Footer: School Contact, QR & Authorized Signature -->
            <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:6px; border-top:1px solid #cbd5e1; padding-top:2px; font-size:6.5px; align-items:center;">
              <div>
                <span style="font-size:5.5px; font-weight:800; color:#64748b; display:block; text-transform:uppercase;">Campus Helpline & Return:</span>
                <strong style="font-family:monospace; font-size:7px; color:#0f172a;">${hotline}</strong>
                <div style="font-size:5.5px; color:#64748b; margin-top:0.5px;">${schoolEmail}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <span style="font-size:5.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Principal Signature</span>
                <div style="height:12px; display:flex; align-items:flex-end;">
                  ${signatureUrl ? `<img src="${signatureUrl}" style="max-height:11px;">` : `<span style="font-family:serif; font-style:italic; font-size:7.5px; color:#334155;">Authorized Seal</span>`}
                </div>
                <div style="width:60px; border-bottom:1px solid #334155; margin-top:0.5px;"></div>
              </div>
            </div>

            <div style="position:absolute; bottom:0; left:0; right:0; height:2.5px; background:${theme.gradient};"></div>
          </div>
        </div>
      `;

      if (mode === 'pvc-duplex') {
        return `
          <div class="duplex-page">${front}</div>
          <div class="duplex-page">${back}</div>
        `;
      } else {
        return `
          <div class="card-pair-row">
            <div class="card-col">${front}</div>
            <div class="cut-line">✂</div>
            <div class="card-col">${back}</div>
          </div>
        `;
      }
    }).join('');

    // Open Print Iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1200px';
    iframe.style.height = '1400px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Batch Student ID Cards - ${schoolName}</title>
          <style>
            @page {
              size: ${mode === 'pvc-duplex' ? '85.6mm 53.98mm' : 'A4 portrait'};
              margin: ${mode === 'pvc-duplex' ? '0' : '8mm'};
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #111827;
            }
            .batch-container {
              display: flex;
              flex-direction: column;
              gap: 8mm;
            }
            .card-pair-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4mm;
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 4mm;
            }
            .card-col {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .cr80-card {
              width: 85.6mm;
              height: 53.98mm;
              border-radius: 3.18mm;
              border: 1px solid #cbd5e1;
              overflow: hidden;
              background: #fff;
              position: relative;
            }
            .cut-line {
              font-size: 10px;
              color: #94a3b8;
              font-weight: bold;
              border-left: 1px dashed #cbd5e1;
              padding-left: 2px;
              height: 50mm;
              display: flex;
              align-items: center;
            }
            .duplex-page {
              width: 85.6mm;
              height: 53.98mm;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <div class="batch-container">
            ${cardsHtml}
          </div>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 8000);
  }
}
