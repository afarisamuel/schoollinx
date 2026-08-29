import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentStateService } from '../../../core/infrastructure/parent/parent-state.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
    selector: 'app-parent-pickup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './parent-pickup.page.html'
})
export class ParentPickupPage {
    state = inject(ParentStateService);
    private toast = inject(ToastService);

    sharePass(p: any) {
        if (navigator.share) {
            navigator.share({
                title: 'School Pickup Pass',
                text: `${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(
                `${p.first_name} ${p.last_name} — Gate Code: ${p.pickup_code || 'N/A'}`
            );
            this.toast.success('Pickup pass details copied to clipboard!', 'Copied');
        }
    }

    printPass() { window.print(); }
}
