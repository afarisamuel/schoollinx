import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parent-settings.page.html'
})
export class ParentSettingsPage {
    state = inject(ParentStateService);
    private toast = inject(ToastService);

    editMode = signal(false);
    firstName = signal('');
    lastName = signal('');
    phone = signal('');
    address = signal('');
    isDark = signal(document.documentElement.classList.contains('dark'));

    // Notification & Security Preferences
    smsAlerts = signal(true);
    whatsappAlerts = signal(true);
    emailReceipts = signal(true);
    twoFactorAuth = signal(true);

    enterEdit(p: any) {
        this.firstName.set(p.first_name || '');
        this.lastName.set(p.last_name || '');
        this.phone.set(p.phone_number || '');
        this.address.set(p.address || '');
        this.editMode.set(true);
    }

    saveProfile() {
        this.toast.success('Guardian profile preferences saved successfully.', 'Settings Updated');
        this.editMode.set(false);
    }

    togglePreference(key: 'sms' | 'whatsapp' | 'email' | '2fa') {
        switch (key) {
            case 'sms':
                this.smsAlerts.update(v => !v);
                break;
            case 'whatsapp':
                this.whatsappAlerts.update(v => !v);
                break;
            case 'email':
                this.emailReceipts.update(v => !v);
                break;
            case '2fa':
                this.twoFactorAuth.update(v => !v);
                break;
        }
        this.toast.success('Notification preference updated.', 'Preferences Saved');
    }

    toggleDark() {
        const d = !this.isDark();
        this.isDark.set(d);
        document.documentElement.classList.toggle('dark', d);
        localStorage.setItem('theme', d ? 'dark' : 'light');
    }

    print() { window.print(); }
}
