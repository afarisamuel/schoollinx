import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusOpsService, LostAndFoundItem } from '../../../core/infrastructure/campus-ops/campus-ops.service';

@Component({
    selector: 'app-lost-and-found',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './lost-and-found.component.html',
    styles: []
})
export class LostAndFoundComponent implements OnInit {
    items: LostAndFoundItem[] = [];
    
    newItem: Partial<LostAndFoundItem> = {
        item_name: '',
        description: '',
        found_location: '',
        category: 'Electronics'
    };

    categories = ['Electronics', 'Clothing', 'Books', 'Jewelry', 'Other'];

    constructor(private opsService: CampusOpsService) {}

    ngOnInit(): void {
        this.loadItems();
    }

    loadItems(): void {
        this.opsService.getLostItems().subscribe(data => {
            this.items = data;
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
        // In a real app, this ID would come from the auth context
        const dummyUserId = '00000000-0000-0000-0000-000000000001'; 
        this.opsService.claimLostItem(id, dummyUserId).subscribe(() => {
            this.loadItems();
        });
    }
}
