import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushNotificationService } from '../../../core/infrastructure/push/push-notification.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-push-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './push-prompt.component.html',
  styleUrl: './push-prompt.component.css'
})
export class PushPromptComponent {
  public pushService = inject(PushNotificationService);
  private toast = inject(ToastService);

  async onEnable(): Promise<void> {
    try {
      const ok = await this.pushService.subscribeToPush();
      if (ok) {
        this.toast.success('Push notifications enabled! You will receive instant alerts.');
      } else {
        this.toast.info('Push notification permission was not granted.');
      }
    } catch (err: any) {
      const errorObj = err as { message?: string };
      this.toast.error(errorObj?.message || 'Could not enable push notifications on this device.');
    }
  }

  onDismiss(): void {
    this.pushService.dismissPrompt(true);
  }
}
