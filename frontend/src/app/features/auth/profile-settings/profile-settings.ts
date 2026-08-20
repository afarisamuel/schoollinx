import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

import { TenantProfileService } from '../../../core/infrastructure/tenant-profile.service';
import { TeacherPortalService } from '../../../core/infrastructure/teacher/teacher-portal.service';
import { TeacherService } from '../../../core/infrastructure/teacher/teacher.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-settings.html',
})
export class ProfileSettings implements OnInit {
  private authService = inject(AuthService);
  private tenantProfileService = inject(TenantProfileService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;
  setupUrl: string = '';
  qrCodeImageUrl: SafeUrl | null = null;
  qrCodeVisible: boolean = false;
  verificationCode: string = '';
  loading: boolean = false;
  error: string = '';
  success: string = '';

  // Teacher Profile Settings
  private teacherPortalService = inject(TeacherPortalService);
  private teacherService = inject(TeacherService);
  teacherProfile: any = null;
  savingTeacherProfile: boolean = false;
  teacherSuccess: string = '';
  teacherError: string = '';

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (this.user?.role === 'TEACHER') {
        this.loadTeacherProfile();
      }
    });
    this.loadTenantProfile();
  }

  loadTeacherProfile() {
    this.teacherPortalService.getMyClasses().subscribe({
      next: (res) => {
        this.teacherProfile = res.teacher;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load teacher profile', err)
    });
  }

  enable2FA() {
    this.loading = true;
    this.error = '';
    
    this.authService.setup2FA().subscribe({
      next: (res) => {
        this.setupUrl = res.url;
        // Generate QR code image URL using the free QR server API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(res.url || '')}`;
        this.qrCodeImageUrl = this.sanitizer.bypassSecurityTrustUrl(qrApiUrl);
        this.qrCodeVisible = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to setup 2FA';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  verify2FA() {
    if (!this.verificationCode || this.verificationCode.length !== 6) return;
    this.loading = true;
    this.error = '';

    this.authService.verify2FA(this.verificationCode).subscribe({
      next: () => {
        this.success = 'Two-Factor Authentication successfully enabled!';
        this.qrCodeVisible = false;
        this.loading = false;
        if (this.user) {
          this.user.two_factor_enabled = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Invalid verification code';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Tenant Profile Settings
  tenantProfile: any = null;
  savingProfile: boolean = false;
  profileSuccess: string = '';
  profileError: string = '';

  loadTenantProfile() {
    this.tenantProfileService.getProfile().subscribe({
      next: (profile) => {
        this.tenantProfile = profile;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tenant profile', err);
      }
    });
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.profileError = 'Image exceeds maximum size of 2MB.';
        this.cdr.detectChanges();
        return;
      }
      this.savingProfile = true;
      this.profileError = '';
      this.tenantProfileService.uploadLogo(file).subscribe({
        next: (res) => {
          this.tenantProfile.logo_url = res.url;
          this.savingProfile = false;
          this.profileSuccess = 'Logo uploaded successfully! Remember to Save Changes.';
          this.cdr.detectChanges();
          
          setTimeout(() => {
            this.profileSuccess = '';
            this.cdr.detectChanges();
          }, 3000);
        },
        error: (err) => {
          this.profileError = err.error?.error || 'Failed to upload logo';
          this.savingProfile = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  onHeadmasterSignatureSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.profileError = 'Signature image exceeds maximum size of 2MB.';
        this.cdr.detectChanges();
        return;
      }
      this.savingProfile = true;
      this.profileError = '';
      this.tenantProfileService.uploadHeadmasterSignature(file).subscribe({
        next: (res) => {
          this.tenantProfile.headmaster_signature_url = res.url;
          this.savingProfile = false;
          this.profileSuccess = 'Signature uploaded! Remember to Save Changes.';
          this.cdr.detectChanges();
          setTimeout(() => { this.profileSuccess = ''; this.cdr.detectChanges(); }, 3000);
        },
        error: (err) => {
          this.profileError = err.error?.error || 'Failed to upload headmaster signature';
          this.savingProfile = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  updateProfile() {
    if (!this.tenantProfile) return;
    
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';
    
    this.tenantProfileService.updateProfile({
      name: this.tenantProfile.name,
      address: this.tenantProfile.address,
      contact_numbers: this.tenantProfile.contact_numbers,
      email: this.tenantProfile.email,
      logo_url: this.tenantProfile.logo_url,
      headmaster_signature_url: this.tenantProfile.headmaster_signature_url,
    }).subscribe({
      next: (updatedProfile) => {
        this.tenantProfile = updatedProfile;
        this.profileSuccess = 'School profile updated successfully!';
        this.savingProfile = false;
        this.cdr.detectChanges();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.profileSuccess = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.profileError = err.error?.error || 'Failed to update school profile';
        this.savingProfile = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTeacherSignatureSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.teacherProfile?.id) {
      if (file.size > 2 * 1024 * 1024) {
        this.teacherError = 'Signature image exceeds maximum size of 2MB.';
        this.cdr.detectChanges();
        return;
      }
      this.savingTeacherProfile = true;
      this.teacherError = '';
      this.teacherService.uploadSignature(this.teacherProfile.id, file).subscribe({
        next: (res) => {
          this.teacherProfile.signature_url = res.url;
          this.savingTeacherProfile = false;
          this.teacherSuccess = 'Signature uploaded successfully!';
          this.cdr.detectChanges();
          setTimeout(() => { this.teacherSuccess = ''; this.cdr.detectChanges(); }, 3000);
        },
        error: (err) => {
          this.teacherError = err.error?.error || 'Failed to upload signature';
          this.savingTeacherProfile = false;
          this.cdr.detectChanges();
        }
      });
    }
  }
}
