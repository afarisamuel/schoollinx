import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, LostAndFoundItem } from '../../../core/infrastructure/campus-ops/campus-ops.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-lost-and-found',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './lost-and-found.component.html',
    styles: []
})
export class LostAndFoundComponent implements OnInit {
    private opsService = inject(CampusOpsService);
    private authService = inject(AuthService);

    items: LostAndFoundItem[] = [];
    
    newItem: Partial<LostAndFoundItem> = {
        item_name: '',
        description: '',
        found_location: '',
        category: 'Electronics'
    };

    categories = ['Electronics', 'Clothing', 'Books', 'Jewelry', 'Other'];

    ngOnInit(): void {
        this.loadItems();
    }

    loadItems(): void {
        this.opsService.getLostItems().subscribe(data => {
            this.items = data || [];
        });
    }

    reportItem(): void {
        if (!this.newItem.item_name || !this.newItem.found_location) return;
        this.opsService.reportLostItem(this.newItem).subscribe(() => {
            this.loadItems();
            this.newItem = { item_name: '', description: '', found_location: '', category: 'Electronics' };
        });
    }

    claimItem(id: string): void {
        const currentUser = this.authService.currentUserValue;
        if (!currentUser?.id) return;
        this.opsService.claimLostItem(id, currentUser.id).subscribe(() => {
            this.loadItems();
        });
    }
}
