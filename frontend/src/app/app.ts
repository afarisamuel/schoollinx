import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/infrastructure/pwa/pwa-update.service';
import { PwaInstallService } from './core/infrastructure/pwa/pwa-install.service';
import { PushNotificationService } from './core/infrastructure/push/push-notification.service';
import { DialogComponent } from './shared/ui/dialog/dialog.component';
import { ToastComponent } from './shared/ui/toast/toast.component';
import { LoadingBarComponent } from './shared/ui/loading-bar/loading-bar.component';
import { PwaInstallDialogComponent } from './shared/ui/pwa-install-dialog/pwa-install-dialog.component';
import { PushPromptComponent } from './shared/ui/push-prompt/push-prompt.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    DialogComponent,
    ToastComponent,
    LoadingBarComponent,
    PwaInstallDialogComponent,
    PushPromptComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  private pwaUpdateService = inject(PwaUpdateService); // Instantiate update poller
  private pwaInstallService = inject(PwaInstallService); // Initialize PWA install listener
  private pushService = inject(PushNotificationService); // Initialize Push check & prompt
}
