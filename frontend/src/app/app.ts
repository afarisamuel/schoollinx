import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/infrastructure/pwa/pwa-update.service';
import { DialogComponent } from './shared/ui/dialog/dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  private pwaUpdateService = inject(PwaUpdateService); // Instantiate the update poller
}
