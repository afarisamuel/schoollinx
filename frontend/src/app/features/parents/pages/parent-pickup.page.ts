import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ParentPortalService } from '../../../core/infrastructure/parent/parent-portal.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-pickup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parent-pickup.page.html'
})
export class ParentPickupPage {
    state = inject(ParentStateService);
    private portalService = inject(ParentPortalService);
    private toast = inject(ToastService);

    // Third-party OTP Delegation
    showOtpModal = signal(false);
    selectedStudentId = signal('');
    collectorName = signal('');
    collectorPhone = signal('');
    generating = signal(false);
    activeOtp = signal<any>(null);

    openOtpModal(studentId: string) {
        this.selectedStudentId.set(studentId);
        this.collectorName.set('');
        this.collectorPhone.set('');
        this.showOtpModal.set(true);
    }

    generateOTP() {
        const studentId = this.selectedStudentId();
        const name = this.collectorName().trim();
        const phone = this.collectorPhone().trim();

        if (!studentId || !name || !phone) {
            this.toast.error('Please enter the collector\'s name and phone number.', 'Missing Information');
            return;
        }

        this.generating.set(true);
        this.portalService.generatePickupOTP(studentId, name, phone).subscribe({
            next: (res) => {
                this.generating.set(false);
                this.activeOtp.set(res);
                this.toast.success('Single-use gate pass OTP generated.', 'Pass Created');
            },
            error: (err) => {
                this.generating.set(false);
                this.toast.error(err?.error?.error || 'Failed to generate pickup OTP.', 'Error');
            }
        });
    }

    sharePass(p: any) {
        if (navigator.share) {
            navigator.share({
                title: 'School Permanent Pickup Pass',
                text: `${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(
                `${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code || 'N/A'}`
            );
            this.toast.success('Pickup pass details copied to clipboard!', 'Copied');
        }
    }

    shareOtpWhatsApp(otp: string, name: string) {
        const text = encodeURIComponent(`*SchoolLinx Gate Pass OTP*: ${otp}\nAuthorized Collector: ${name}\nSingle-use pass valid for 4 hours. Present this 6-digit code at the security gate to collect the student.`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    copyOtp(otp: string) {
        navigator.clipboard.writeText(otp);
        this.toast.success(`Gate pass code ${otp} copied to clipboard!`, 'Code Copied');
    }

    printPass() { window.print(); }
}
