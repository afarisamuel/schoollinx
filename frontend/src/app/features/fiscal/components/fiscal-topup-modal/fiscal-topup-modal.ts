import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentSearchDropdownComponent } from '../../../../shared/ui/student-search-dropdown/student-search-dropdown.component';

export interface TopUpData {
    student_id: string;
    amount: number;
    description: string;
}

@Component({
  selector: 'app-fiscal-topup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StudentSearchDropdownComponent],
  templateUrl: './fiscal-topup-modal.html'
})
export class FiscalTopUpModalComponent {
  @Input() topUpData: TopUpData = { student_id: '', amount: 0, description: 'Wallet Top-Up' };
  @Input() toppingUp = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitTopUp = new EventEmitter<TopUpData>();

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.submitTopUp.emit(this.topUpData);
  }
}
