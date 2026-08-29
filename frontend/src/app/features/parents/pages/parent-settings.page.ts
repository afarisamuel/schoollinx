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

    enterEdit(p: any) {
        this.firstName.set(p.first_name || '');
        this.lastName.set(p.last_name || '');
        this.phone.set(p.phone_number || '');
        this.address.set(p.address || '');
        this.editMode.set(true);
    }

    saveProfile() {
        this.toast.info('Profile update coming soon!', 'Feature Preview');
        this.editMode.set(false);
    }

    toggleDark() {
        const d = !this.isDark();
        this.isDark.set(d);
        document.documentElement.classList.toggle('dark', d);
        localStorage.setItem('theme', d ? 'dark' : 'light');
    }

    print() { window.print(); }
}
