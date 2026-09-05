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
      const address = s.address || 'Campus Avenue, Accra';
      const initials = this.getInitials(s);
      const photo = s.photo_url || null;

      const barcode = BarcodeGenerator.generateCode128(id, 1.6);
      const barcodeSvg = `
        <svg viewBox="0 0 ${barcode.totalWidth} 20" width="110" height="16" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          ${barcode.bars.map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="20" fill="#0f172a" />`).join('')}
        </svg>
      `;

      // Front Side
      const front = `
        <div class="card-box cr80-card">
          <div class="card-inner wave-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow:hidden;">
            <!-- SVG Top Wave -->
            <svg viewBox="0 0 540 160" style="position:absolute; top:0; left:0; width:100%; height:45%; pointer-events:none;" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveTop_${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${theme.primary}" />
                  <stop offset="60%" stop-color="${theme.secondary}" />
                  <stop offset="100%" stop-color="${theme.accent}" />
                </linearGradient>
              </defs>
              <path d="M 0,0 L 540,0 L 540,110 C 440,175 320,135 220,95 C 130,55 50,85 0,140 Z" fill="url(#waveTop_${idx})" />
            </svg>

            <!-- SVG Bottom Wave -->
            <svg viewBox="0 0 540 100" style="position:absolute; bottom:0; left:0; width:100%; height:26%; pointer-events:none;" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBottom_${idx}" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="${theme.accent}" />
                  <stop offset="60%" stop-color="${theme.secondary}" />
                  <stop offset="100%" stop-color="${theme.primary}" />
                </linearGradient>
              </defs>
              <path d="M 0,60 C 150,20 350,90 540,30 L 540,100 L 0,100 Z" fill="url(#waveBottom_${idx})" />
            </svg>

            <!-- Header -->
            <div style="position:relative; z-index:2; padding:8px 12px 2px 12px; display:flex; justify-content:space-between; align-items:flex-start; color:#fff;">
              <div style="display:flex; align-items:center; gap:6px; max-width:65%;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="width:26px; height:26px; object-fit:contain; background:rgba(255,255,255,0.25); padding:2px; border-radius:4px;">` : `<div style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">🎓</div>`}
                <div>
                  <div style="font-size:8.5px; font-weight:900; text-transform:uppercase; line-height:1.1;">${schoolName}</div>
                  <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase;">Official Student Card</div>
                </div>
              </div>
              <div style="font-size:10px; font-weight:900; text-transform:uppercase; line-height:1; font-family:serif; text-align:right;">STUDENT<br>ID CARD</div>
            </div>

            <!-- Body -->
            <div style="position:relative; z-index:2; padding:2px 12px; display:flex; align-items:center; gap:10px;">
              <div style="width:64px; height:64px; border-radius:50%; border:2.5px solid ${theme.secondary}; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:18px; font-weight:900; color:#374151;">${initials}</div>`}
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:2px; font-size:7.5px; color:#1f2937;">
                <div style="display:flex;"><span style="width:44px; font-weight:700; color:#4b5563;">Name</span><span style="margin-right:3px;">:</span><strong style="font-size:8.5px; text-transform:uppercase; color:#111827;">${name}</strong></div>
                <div style="display:flex;"><span style="width:44px; font-weight:700; color:#4b5563;">ID No</span><span style="margin-right:3px;">:</span><strong style="font-family:monospace; font-size:8px; color:#111827;">${id}</strong></div>
                <div style="display:flex;"><span style="width:44px; font-weight:700; color:#4b5563;">D.O.B</span><span style="margin-right:3px;">:</span><span>${dob}</span></div>
                <div style="display:flex;"><span style="width:44px; font-weight:700; color:#4b5563;">Class</span><span style="margin-right:3px;">:</span><span>${className}</span></div>
              </div>
            </div>

            <!-- Footer Barcode -->
            <div style="position:relative; z-index:2; padding:2px 12px 6px 12px; display:flex; align-items:flex-end; justify-content:space-between;">
              <div style="background:rgba(255,255,255,0.92); padding:2px 5px; border-radius:4px; border:1px solid #e5e7eb;">
                ${barcodeSvg}
                <div style="font-size:5.5px; font-family:monospace; text-align:center; color:#374151;">${id}</div>
              </div>
              <div style="font-size:6.5px; font-weight:800; color:#1f2937; background:rgba(255,255,255,0.9); padding:2px 6px; border-radius:4px; border:1px solid #e5e7eb;">
                VALID: 2026/27
              </div>
            </div>
          </div>
        </div>
      `;

      // Back Side
      const back = `
        <div class="card-box cr80-card">
          <div class="card-inner back-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:10px 12px; background:#f9fafb; color:#111827;">
            <div style="position:absolute; top:0; left:0; right:0; height:4px; background:${theme.gradient};"></div>
            
            <div style="display:flex; flex-direction:column; gap:3px; padding-top:2px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #d1d5db; padding-bottom:2px;">
                <span style="font-size:7.5px; font-weight:900; text-transform:uppercase; color:#1f2937;">Terms & Regulations</span>
                <span style="font-size:6px; font-family:monospace; color:#6b7280;">CR80 PVC</span>
              </div>
              <p style="font-size:6.5px; color:#4b5563; line-height:1.2; margin:0;">
                1. Property of <strong style="color:#111827;">${schoolName}</strong>. Carry at all times on campus.
              </p>
              <p style="font-size:6.5px; color:#4b5563; line-height:1.2; margin:0;">
                2. Required for automated attendance, examination access, library checkout & infirmary.
              </p>
              <p style="font-size:6.5px; color:#4b5563; line-height:1.2; margin:0;">
                3. If found, return to School Admin Office or call hotline below.
              </p>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; border-top:1px solid #d1d5db; padding-top:3px; font-size:7px;">
              <div>
                <span style="font-size:6px; font-weight:800; color:#6b7280; display:block;">HOTLINE:</span>
                <strong style="font-family:monospace; font-size:7.5px;">${hotline}</strong>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <span style="font-size:6px; font-weight:800; color:#6b7280;">REGISTRAR SIGNATURE</span>
                <div style="height:14px; display:flex; align-items:flex-end;">
                  ${signatureUrl ? `<img src="${signatureUrl}" style="max-height:12px;">` : `<span style="font-family:serif; font-style:italic; font-size:8px;">Authorized</span>`}
                </div>
                <div style="width:65px; border-bottom:1px solid #111827; margin-top:1px;"></div>
              </div>
            </div>

            <div style="position:absolute; bottom:0; left:0; right:0; height:3px; background:${theme.gradient};"></div>
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
