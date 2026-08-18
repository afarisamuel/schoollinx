import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { InventoryItem, VisitorLog } from '../../../core/domain/facility.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-facility-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facility-dashboard.component.html',
  styleUrl: './facility-dashboard.component.css'
})
export class FacilityDashboardComponent implements OnInit {
  private facilityService = inject(FacilityService);
  private dialog = inject(DialogService);

  activeTab = signal<'inventory' | 'visitors'>('inventory');
  inventory = signal<InventoryItem[]>([]);
  visitors = signal<VisitorLog[]>([]);
  isLoading = signal(false);
  showAddInventory = signal(false);
  showCheckIn = signal(false);

  newItem: Partial<InventoryItem> = { name: '', category: '', quantity: 0, unit_value: 0, location: '' };
  newVisitor: Partial<VisitorLog> = { name: '', phone: '', purpose: '' };

  categories = ['Furniture', 'Electronics', 'Stationery', 'Sports Equipment', 'Lab Equipment', 'Cleaning Supplies', 'Other'];

  ngOnInit() {
    this.loadInventory();
    this.loadVisitors();
  }

  switchTab(tab: 'inventory' | 'visitors') {
    this.activeTab.set(tab);
  }

  loadInventory() {
    this.isLoading.set(true);
    this.facilityService.getInventory().subscribe({
      next: (items) => {
        this.inventory.set(items || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadVisitors() {
    const today = new Date().toISOString().split('T')[0];
    this.facilityService.getVisitors(today).subscribe({
      next: (logs) => this.visitors.set(logs || []),
      error: () => {}
    });
  }

  addInventoryItem() {
    if (!this.newItem.name) return;
    this.facilityService.addInventoryItem(this.newItem).subscribe({
      next: () => {
        this.showAddInventory.set(false);
        this.newItem = { name: '', category: '', quantity: 0, unit_value: 0, location: '' };
        this.loadInventory();
      }
    });
  }

  deleteItem(id: string) {
    this.dialog.confirm('Delete this inventory item?').subscribe((ok: boolean) => {
      if (ok) {
        this.facilityService.deleteInventoryItem(id).subscribe(() => this.loadInventory());
      }
    });
  }

  checkInVisitor() {
    if (!this.newVisitor.name) return;
    this.facilityService.checkInVisitor(this.newVisitor).subscribe({
      next: () => {
        this.showCheckIn.set(false);
        this.newVisitor = { name: '', phone: '', purpose: '' };
        this.loadVisitors();
      }
    });
  }

  checkOutVisitor(id: string) {
    this.facilityService.checkOutVisitor(id).subscribe(() => this.loadVisitors());
  }

  get totalAssetValue(): number {
    return this.inventory().reduce((sum, i) => sum + (i.quantity * i.unit_value), 0);
  }

  get activeVisitorCount(): number {
    return this.visitors().filter(v => !v.check_out).length;
  }
}
