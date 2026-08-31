import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommunicationService, Notice, Reminder } from '../../../core/infrastructure/communication/communication.service';
import { SmsService, SMSOverview } from '../../../core/infrastructure/sms/sms.service';
import { SmsTopUpModalComponent } from '../../fiscal/subscription-billing/sms-topup-modal/sms-topup-modal.component';
import { SenderIdModalComponent } from '../sender-id-modal/sender-id-modal.component';

@Component({
    selector: 'app-communications-hub',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, RouterLink, SmsTopUpModalComponent, SenderIdModalComponent],
    templateUrl: './communications-hub.component.html'
})
export class CommunicationsHubComponent implements OnInit {
    private commService = inject(CommunicationService);
    private smsService = inject(SmsService);

    activeTab = signal<'notices' | 'sms' | 'reminders'>('notices');

    // SMS Modals & Live Balance
    showSmsTopUp = signal(false);
    showSenderId = signal(false);
    smsOverview = signal<SMSOverview | null>(null);

    // Notices
    notices = signal<Notice[]>([]);
    creatingNotice = signal(false);
    newNotice = signal<Partial<Notice>>({ title: '', content: '', target: 'ALL' });

    // SMS
    sendingSMS = signal(false);
    smsPayload = signal<{target_audience: string, message: string}>({ target_audience: 'ALL_PARENTS', message: '' });
    smsSuccess = signal<string | null>(null);
    smsError = signal<string | null>(null);

    // Reminders
    reminders = signal<Reminder[]>([]);
    creatingReminder = signal(false);
    newReminder = signal<Partial<Reminder>>({ title: '', message: '', target_audience: 'FEE_DEFAULTERS', send_date: '', channel: 'SMS' });

    ngOnInit() {
        this.loadNotices();
        this.loadReminders();
        this.loadSMSOverview();
    }

    loadSMSOverview() {
        this.smsService.getOverview().subscribe({
            next: (ov) => this.smsOverview.set(ov),
            error: () => {}
        });
    }

    setTab(tab: 'notices' | 'sms' | 'reminders') {
        this.activeTab.set(tab);
    }

    loadNotices() {
        this.commService.getNotices().subscribe(n => this.notices.set(n));
    }

    loadReminders() {
        this.commService.getReminders().subscribe(r => this.reminders.set(r));
    }

    saveNotice() {
        this.commService.createNotice(this.newNotice()).subscribe({
            next: () => {
                this.creatingNotice.set(false);
                this.newNotice.set({ title: '', content: '', target: 'ALL' });
                this.loadNotices();
            }
        });
    }

    sendSMS() {
        this.sendingSMS.set(true);
        this.smsSuccess.set(null);
        this.smsError.set(null);
        
        this.commService.sendUrgentSMS(this.smsPayload()).subscribe({
            next: (res) => {
                this.sendingSMS.set(false);
                this.smsSuccess.set(res.message);
                this.smsPayload.set({ target_audience: 'ALL_PARENTS', message: '' });
                this.loadSMSOverview();
            },
            error: (err) => {
                this.sendingSMS.set(false);
                this.smsError.set(err.error?.error || 'Failed to send SMS');
            }
        });
    }

    onTopUpCompleted(newBalance: number) {
        if (this.smsOverview()) {
            this.smsOverview.update(o => o ? { ...o, sms_credits: newBalance } : o);
        } else {
            this.loadSMSOverview();
        }
    }

    onSenderIdSubmitted() {
        this.loadSMSOverview();
    }

    saveReminder() {
        this.commService.scheduleReminder(this.newReminder()).subscribe({
            next: () => {
                this.creatingReminder.set(false);
                this.newReminder.set({ title: '', message: '', target_audience: 'FEE_DEFAULTERS', send_date: '', channel: 'SMS' });
                this.loadReminders();
            }
        });
    }

    triggeringBirthdays = signal(false);
    birthdayTriggerResult = signal<{message: string, count: number} | null>(null);

    triggerBirthdays() {
        this.triggeringBirthdays.set(true);
        this.birthdayTriggerResult.set(null);
        this.commService.triggerBirthdayGreetings().subscribe({
            next: (res) => {
                this.triggeringBirthdays.set(false);
                this.birthdayTriggerResult.set(res);
                setTimeout(() => this.birthdayTriggerResult.set(null), 5000);
            },
            error: () => this.triggeringBirthdays.set(false)
        });
    }

    triggeringLockdown = signal(false);
    lockdownResult = signal<{message: string} | null>(null);

    triggerLockdown() {
        if (!confirm('WARNING: You are about to trigger an emergency lockdown broadcast to all staff and parents. Are you absolutely sure?')) {
            return;
        }
        this.triggeringLockdown.set(true);
        this.lockdownResult.set(null);
        this.commService.triggerLockdown().subscribe({
            next: (res) => {
                this.triggeringLockdown.set(false);
                this.lockdownResult.set(res);
                setTimeout(() => this.lockdownResult.set(null), 10000);
            },
            error: () => {
                this.triggeringLockdown.set(false);
                alert('Failed to trigger lockdown. Please try again or use alternative emergency channels.');
            }
        });
    }
}
