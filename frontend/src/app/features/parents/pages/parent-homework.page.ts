import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';

@Component({
    selector: 'app-parent-homework',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-homework.page.html'
})
export class ParentHomeworkPage {
    state = inject(ParentStateService);

    today() { return new Date().toISOString().slice(0, 10); }

    dueSoon(dueDate: string): boolean {
        const t = this.today();
        const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        return dueDate >= t && dueDate <= soon;
    }
}
