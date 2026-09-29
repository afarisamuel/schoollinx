import { Component, Input, OnInit, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Student } from '../../../core/domain/student.model';
import { Class } from '../../../core/infrastructure/curriculum/class.service';
import { TenantProfileService, TenantProfile } from '../../../core/infrastructure/tenant-profile.service';
import { ID_CARD_THEMES, ID_CARD_TEMPLATES, IdCardTheme, IdCardTemplate, ThemeConfig } from '../student-id-card/student-id-card.component';
import { BarcodeGenerator } from '../../../core/utils/barcode.util';
import { formatMediaUrl } from '../../../core/utils/media-url.util';

@Component({
  selector: 'app-batch-id-card-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-id-card-modal.component.html',
  styleUrl: './batch-id-card-modal.component.css'
})
export class BatchIdCardModalComponent implements OnInit {
  private tenantService = inject(TenantProfileService);

  @Input({ required: true }) allStudents: Student[] = [];
  @Input() selectedStudents: Student[] = [];
  @Input() classes: Class[] = [];
  @Input() initialTheme?: IdCardTheme;
  @Input() initialTemplate?: IdCardTemplate;
  @Output() close = new EventEmitter<void>();

  // Configuration Signals
  selectedClassId = signal<string>('all');
  selectedTheme = signal<IdCardTheme>('teal');
  selectedTemplate = signal<IdCardTemplate>('wave');
  printMode = signal<'a4-paired' | 'a4-fronts-only' | 'pvc-duplex'>('a4-paired');
  tenantProfile = signal<TenantProfile | null>(null);

  themes = ID_CARD_THEMES;
  templates = ID_CARD_TEMPLATES;

  ngOnInit(): void {
    if (this.initialTheme) {
      this.selectedTheme.set(this.initialTheme);
    }
    if (this.initialTemplate) {
      this.selectedTemplate.set(this.initialTemplate);
    }
  }

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

  getClassName(s: Student): string {
    if (s.class_name && s.class_name.trim() !== '' && s.class_name.toLowerCase() !== 'class roster') {
      return s.class_name;
    }
    if (s.class && s.class.name) {
      return s.class.name;
    }
    if (s.class_id && this.classes && this.classes.length > 0) {
      const found = this.classes.find(c => c.id === s.class_id);
      if (found?.name) return found.name;
    }
    return s.class_name || 'General';
  }

  getStudentDob(s: Student): string {
    if (!s.dob) return '01 Jan 2012';
    const d = new Date(s.dob);
    return isNaN(d.getTime()) ? s.dob : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Track failed student image IDs
  failedImageIds = signal<Set<string>>(new Set());

  onStudentImageError(studentId?: string) {
    if (!studentId) return;
    this.failedImageIds.update(set => {
      const next = new Set(set);
      next.add(studentId);
      return next;
    });
  }

  hasPhoto(s: Student): boolean {
    return !!s.photo_url && !this.failedImageIds().has(s.id || '');
  }

  getStudentPhotoUrl(photoUrl?: string): string {
    return formatMediaUrl(photoUrl);
  }

  getInitials(s: Student): string {
    const fn = s.first_name?.[0] || 'S';
    const ln = s.last_name?.[0] || 'T';
    return (fn + ln).toUpperCase();
  }

  /**
   * Generates High-Density Batch Printable Document with Chosen Template & Theme
   */
  printBatch() {
    const students = this.targetStudents();
    if (students.length === 0) return;

    const theme = this.currentThemeConfig();
    const template = this.selectedTemplate();
    const isVertical = template === 'vertical';
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
      const className = this.getClassName(s);
      const bloodGroup = s.blood_group || 'O+';
      const residence = s.placed_residence_type || 'Day Scholar';
      const address = s.address || 'Campus Resident, Accra';
      const emergencyContact = s.emergency_contact_name || s.guardian_name || s.father_name || 'Guardian';
      const emergencyPhone = s.emergency_contact_phone || s.guardian_phone || s.father_phone || hotline;
      const initials = this.getInitials(s);
      const photo = s.photo_url ? formatMediaUrl(s.photo_url) : null;

      const barcode = BarcodeGenerator.generateCode128(id, 1.6);
      const barcodeSvg = `
        <svg viewBox="0 0 ${barcode.totalWidth} 20" width="115" height="16" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          ${barcode.bars.map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="20" fill="#0f172a" />`).join('')}
        </svg>
      `;

      let frontBody = '';

      if (template === 'academic') {
        frontBody = `
          <div class="card-inner academic-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fafafa; overflow:hidden;">
            <!-- Header -->
            <div style="background:${theme.primary}; border-bottom:2px solid #fbbf24; padding:6px 10px; display:flex; align-items:center; justify-content:space-between; color:#fff;">
              <div style="display:flex; align-items:center; gap:6px; max-width:72%;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="width:24px; height:24px; object-fit:contain; background:#fff; padding:1.5px; border-radius:4px; border:1px solid #fde68a;">` : `<div style="width:22px; height:22px; background:rgba(255,255,255,0.2); border-radius:4px; display:flex; align-items:center; justify-content:center; color:#fde68a; font-weight:bold; font-size:10px;">🎓</div>`}
                <div>
                  <div style="font-size:8px; font-weight:900; color:#fff; text-transform:uppercase; letter-spacing:0.3px; line-height:1.1;">${schoolName}</div>
                  <div style="font-size:5.5px; font-weight:800; color:#fde68a; text-transform:uppercase; letter-spacing:0.5px;">STUDENT PASSPORT • ${className}</div>
                </div>
              </div>
              <div style="background:#fbbf24; color:#111827; padding:1.5px 5px; border-radius:3px; font-size:6.5px; font-weight:900;">2026/27</div>
            </div>

            <!-- Body -->
            <div style="padding:4px 10px; display:flex; align-items:center; gap:10px; flex:1;">
              <div style="width:62px; height:74px; border:2.5px solid #fbbf24; border-radius:6px; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:18px; font-weight:900; color:#374151;">${initials}</div>`}
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:2.5px; font-size:7.5px; color:#1f2937;">
                <div style="border-bottom:1px solid #e5e7eb; padding-bottom:1.5px;">
                  <span style="font-size:5.5px; font-weight:800; color:#6b7280; text-transform:uppercase; display:block;">Candidate Name</span>
                  <strong style="font-size:8.5px; text-transform:uppercase; color:#0f172a;">${name}</strong>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px; font-size:7px;">
                  <div><span style="font-size:5.5px; font-weight:700; color:#64748b; display:block;">ID Number</span><strong style="font-family:monospace; color:#0f172a;">${id}</strong></div>
                  <div><span style="font-size:5.5px; font-weight:700; color:#64748b; display:block;">D.O.B</span><span>${dob}</span></div>
                  <div><span style="font-size:5.5px; font-weight:700; color:#64748b; display:block;">Class</span><strong style="color:#0f172a;">${className}</strong></div>
                  <div><span style="font-size:5.5px; font-weight:700; color:#64748b; display:block;">Blood Group</span><strong style="color:#e11d48;">🩸 ${bloodGroup}</strong></div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="background:#f3f4f6; border-top:1px solid #d1d5db; display:flex; align-items:center; justify-content:space-between; padding:2px 10px;">
              <div style="background:#fff; padding:1.5px 4px; border-radius:3px; border:1px solid #e2e8f0;">
                ${barcodeSvg}
                <div style="font-size:5.5px; font-family:monospace; text-align:center; color:#374151;">${id}</div>
              </div>
              <span style="font-size:6px; font-weight:800; color:#64748b; text-transform:uppercase;">Principal Certified</span>
            </div>
          </div>
        `;
      } else if (template === 'corporate') {
        frontBody = `
          <div class="card-inner corporate-layout" style="position:relative; height:100%; display:flex; background:#fff; overflow:hidden;">
            <!-- Left Side -->
            <div style="width:34%; background:${theme.primary}; color:#fff; padding:6px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center;">
              ${schoolLogo ? `<img src="${schoolLogo}" style="width:22px; height:22px; object-fit:contain; background:rgba(255,255,255,0.2); padding:1.5px; border-radius:4px;">` : `<div style="width:20px; height:20px; border-radius:4px; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:10px;">🏫</div>`}
              <div style="width:58px; height:58px; border-radius:50%; border:2px solid #fff; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center;">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:16px; font-weight:900; color:#1f2937;">${initials}</div>`}
              </div>
              <div style="background:rgba(255,255,255,0.25); padding:1px 5px; border-radius:10px; font-size:6.5px; font-family:monospace; font-weight:800;">${id}</div>
            </div>

            <!-- Right Side -->
            <div style="width:66%; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; background:#fff;">
              <div style="border-bottom:1px solid #e2e8f0; padding-bottom:2px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <div style="font-size:8px; font-weight:900; color:#0f172a; text-transform:uppercase; line-height:1.1;">${schoolName}</div>
                  <div style="font-size:5.5px; color:#64748b; font-weight:700; text-transform:uppercase;">Student Identity Card</div>
                </div>
                <div style="background:${theme.secondary}; color:#fff; padding:1px 5px; border-radius:3px; font-size:6.5px; font-weight:800;">${className}</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="font-size:5.5px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Full Name</div>
                <div style="font-size:8.5px; font-weight:900; color:#0f172a; text-transform:uppercase;">${name}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px; font-size:6.5px; margin-top:1px;">
                  <div><span style="font-size:5.5px; color:#94a3b8; font-weight:800; display:block;">D.O.B</span><strong>${dob}</strong></div>
                  <div><span style="font-size:5.5px; color:#94a3b8; font-weight:800; display:block;">Blood Group</span><strong style="color:#e11d48;">${bloodGroup}</strong></div>
                </div>
                <div><span style="font-size:5.5px; color:#94a3b8; font-weight:800; display:block;">Campus Address</span><span style="font-size:6.5px; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:140px;">${address}</span></div>
              </div>
              <div style="border-top:1px solid #e2e8f0; padding-top:2px; display:flex; justify-content:space-between; align-items:center;">
                ${barcodeSvg}
                <div style="font-size:6px; font-weight:800; color:#64748b;">EXP: 2027</div>
              </div>
            </div>
          </div>
        `;
      } else if (template === 'cyber') {
        frontBody = `
          <div class="card-inner cyber-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow:hidden;">
            <!-- Angled Header Polygon -->
            <svg viewBox="0 0 540 160" style="position:absolute; top:0; left:0; width:100%; height:45%; pointer-events:none;" preserveAspectRatio="none">
              <polygon points="0,0 540,0 540,90 280,140 0,110" fill="${theme.primary}" />
              <polygon points="0,0 540,0 540,60 320,110 0,80" fill="white" opacity="0.12" />
            </svg>

            <!-- Angled Footer Polygon -->
            <svg viewBox="0 0 540 100" style="position:absolute; bottom:0; left:0; width:100%; height:26%; pointer-events:none;" preserveAspectRatio="none">
              <polygon points="0,45 220,15 540,65 540,100 0,100" fill="${theme.primary}" />
            </svg>

            <!-- Header -->
            <div style="position:relative; z-index:2; padding:7px 12px 2px 12px; display:flex; justify-content:space-between; align-items:flex-start; color:#fff;">
              <div style="display:flex; align-items:center; gap:6px;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="width:24px; height:24px; object-fit:contain; background:rgba(255,255,255,0.25); padding:1.5px; border-radius:4px;">` : `<div style="width:22px; height:22px; border-radius:4px; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-size:10px;">🔷</div>`}
                <div>
                  <div style="font-size:8.5px; font-weight:900; text-transform:uppercase; line-height:1.1;">${schoolName}</div>
                  <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.5px;">Digital Student Pass</div>
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.25); border:1px solid rgba(255,255,255,0.4); color:#fff; padding:1.5px 6px; border-radius:12px; font-size:6.5px; font-weight:900; text-transform:uppercase;">${className}</div>
            </div>

            <!-- Body -->
            <div style="position:relative; z-index:2; padding:1px 12px; display:flex; align-items:center; gap:10px;">
              <div style="width:62px; height:62px; border-radius:10px; border:2.5px solid ${theme.secondary}; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:18px; font-weight:900; color:#374151;">${initials}</div>`}
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:2px; font-size:7.5px; color:#1f2937;">
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">Name</span><span style="margin-right:3px;">:</span><strong style="font-size:8.5px; text-transform:uppercase; color:#0f172a;">${name}</strong></div>
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">ID No</span><span style="margin-right:3px;">:</span><strong style="font-family:monospace; font-size:8px; color:#0f172a;">${id}</strong></div>
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">D.O.B</span><span style="margin-right:3px;">:</span><span>${dob}</span></div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">Class</span><span style="margin-right:3px;">:</span><strong style="color:#0f172a;">${className}</strong></div>
                  <span style="font-size:6px; font-weight:800; color:#e11d48; background:#ffe4e6; padding:1px 4px; border-radius:3px;">🩸 ${bloodGroup}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="position:relative; z-index:2; padding:1px 12px 5px 12px; display:flex; align-items:flex-end; justify-content:space-between;">
              <div style="background:rgba(255,255,255,0.95); padding:2px 5px; border-radius:4px; border:1px solid #cbd5e1;">
                ${barcodeSvg}
                <div style="font-size:5.5px; font-family:monospace; text-align:center; color:#334155;">${id}</div>
              </div>
              <span style="font-size:6.5px; font-weight:900; color:#0f172a; background:rgba(255,255,255,0.95); padding:1px 5px; border-radius:3px; border:1px solid #cbd5e1;">VALID: 2026/27</span>
            </div>
          </div>
        `;
      } else if (template === 'vertical') {
        frontBody = `
          <div class="card-inner vertical-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; background:#fff; padding:8px; border:1px solid #cbd5e1; text-align:center;">
            <!-- Lanyard Slot -->
            <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
              <div style="width:36px; height:8px; border-radius:6px; background:#e2e8f0; border:1px solid #94a3b8;"></div>
              <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                ${schoolLogo ? `<img src="${schoolLogo}" style="width:20px; height:20px; object-fit:contain;">` : `<div style="font-size:12px;">🎓</div>`}
                <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:#0f172a;">${schoolName}</div>
              </div>
            </div>

            <!-- Portrait & Identity -->
            <div style="display:flex; flex-direction:column; align-items:center; gap:2px; margin:2px 0;">
              <div style="width:64px; height:74px; border-radius:8px; border:2.5px solid ${theme.primary}; overflow:hidden; background:#e5e7eb; display:flex; align-items:center; justify-content:center;">
                ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:18px; font-weight:900; color:#374151;">${initials}</div>`}
              </div>
              <div style="font-size:9px; font-weight:900; text-transform:uppercase; color:#0f172a; margin-top:2px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
              <div style="font-size:7px; font-family:monospace; color:#64748b; font-weight:700;">${id}</div>
              <div style="background:${theme.primary}; color:#fff; padding:1px 8px; border-radius:10px; font-size:7px; font-weight:800; text-transform:uppercase; margin-top:1px;">${className}</div>
            </div>

            <!-- Barcode & Footer -->
            <div style="display:flex; flex-direction:column; align-items:center; gap:2px; border-top:1px solid #e2e8f0; padding-top:4px;">
              ${barcodeSvg}
              <div style="display:flex; justify-content:space-between; width:100%; font-size:6px; color:#64748b; font-weight:700;">
                <span>DOB: ${dob}</span>
                <span style="color:#e11d48;">🩸 ${bloodGroup}</span>
                <span>VALID: 2026/27</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // Fluid Wave Template (Default)
        frontBody = `
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
                <div style="display:flex;"><span style="width:42px; font-weight:700; color:#4b5563;">Class</span><span style="margin-right:3px;">:</span><strong style="font-weight:700; color:#0f172a;">${className}</strong></div>
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
        `;
      }

      const cardBoxClass = isVertical ? 'card-box cr80-card-vertical' : 'card-box cr80-card';
      const front = `<div class="${cardBoxClass}">${frontBody}</div>`;

      // Back Side
      const back = `
        <div class="${cardBoxClass}">
          <div class="card-inner back-layout" style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:8px 11px; background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1;">
            <div style="position:absolute; top:0; left:0; right:0; height:3.5px; background:${theme.primary};"></div>
            
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

            <div style="position:absolute; bottom:0; left:0; right:0; height:2.5px; background:${theme.primary};"></div>
          </div>
        </div>
      `;

      if (mode === 'pvc-duplex') {
        return `
          <div class="duplex-page ${isVertical ? 'duplex-vertical' : ''}">${front}</div>
          <div class="duplex-page ${isVertical ? 'duplex-vertical' : ''}">${back}</div>
        `;
      } else {
        return `
          <div class="card-pair-row ${isVertical ? 'card-pair-row-vertical' : ''}">
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
              size: ${mode === 'pvc-duplex' ? (isVertical ? '53.98mm 85.6mm' : '85.6mm 53.98mm') : 'A4 portrait'};
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
            .cr80-card-vertical {
              width: 53.98mm;
              height: 85.6mm;
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
            .duplex-vertical {
              width: 53.98mm;
              height: 85.6mm;
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
