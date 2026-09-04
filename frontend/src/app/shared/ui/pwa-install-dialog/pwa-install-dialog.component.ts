import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/infrastructure/pwa/pwa-install.service';

@Component({
  selector: 'app-pwa-install-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-dialog.component.html',
  styleUrl: './pwa-install-dialog.component.css'
})
export class PwaInstallDialogComponent {
  public pwa = inject(PwaInstallService);

  onInstall(): void {
    this.pwa.install();
  }

  onDismiss(): void {
    this.pwa.dismiss(3);
  }

  onClose(): void {
    this.pwa.closePrompt();
  }

  toggleIOSHelp(): void {
    this.pwa.showIOSInstructions.update(v => !v);
  }
}
