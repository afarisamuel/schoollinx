import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/infrastructure/pwa/pwa-update.service';
import { DialogComponent } from './shared/ui/dialog/dialog.component';
import { ToastComponent } from './shared/ui/toast/toast.component';
import { LoadingBarComponent } from './shared/ui/loading-bar/loading-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogComponent, ToastComponent, LoadingBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  private pwaUpdateService = inject(PwaUpdateService); // Instantiate the update poller
}
