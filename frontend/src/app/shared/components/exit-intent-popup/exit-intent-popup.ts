import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exit-intent-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exit-intent-popup.component.html',
  styleUrl: './exit-intent-popup.component.css',
})
export class ExitIntentPopup {
  showPopup = false;
  hasTriggered = false;

  @HostListener('document:mouseout', ['$event'])
  onMouseOut(event: MouseEvent) {
    if (!this.hasTriggered && event.clientY < 50) {
      this.showPopup = true;
      this.hasTriggered = true;
    }
  }

  closePopup() {
    this.showPopup = false;
  }
}
