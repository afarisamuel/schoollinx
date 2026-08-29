import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-schedule',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-schedule.page.html'
})
export class ParentSchedulePage {
    state = inject(ParentStateService);
    readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    todayDay() { return new Date().getDay(); }
    dayLabel(d: number) { return this.dayLabels[d] || ''; }
}
