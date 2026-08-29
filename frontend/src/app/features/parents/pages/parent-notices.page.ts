import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-notices',
    standalone: true,
    imports: [CommonModule, DatePipe],
    templateUrl: './parent-notices.page.html'
})
export class ParentNoticesPage {
    state = inject(ParentStateService);
    filter = signal('ALL');

    filtered() {
        const f = this.filter();
        if (f === 'ALL') return this.state.notices();
        return this.state.notices().filter(n => n.target === f || n.target === 'ALL');
    }
}
