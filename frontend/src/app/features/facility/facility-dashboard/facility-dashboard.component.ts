import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { InventoryItem, VisitorLog } from '../../../core/domain/facility.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-facility-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, DecimalPipe],
  templateUrl: './facility-dashboard.component.html',
  styleUrl: './facility-dashboard.component.css'
})
export class FacilityDashboardComponent implements OnInit {
  private facilityService = inject(FacilityService);
  private dialog = inject(DialogService);

  activeTab = signal<'inventory' | 'visitors' | 'spaces'>('inventory');
  inventory = signal<InventoryItem[]>([]);
  visitors = signal<VisitorLog[]>([]);
  isLoadingInventory = signal(false);
  isLoadingVisitors = signal(false);
  isSubmitting = signal(false);

  // Search & Filter Signals
  inventorySearch = signal('');
  selectedCategory = signal('ALL');
  inventoryStatusFilter = signal<'ALL' | 'ACTIVE' | 'LOW_STOCK' | 'MAINTENANCE'>('ALL');

  visitorSearch = signal('');
  selectedVisitorDate = signal(new Date().toISOString().split('T')[0]);
  visitorStatusFilter = signal<'ALL' | 'ON_PREMISES' | 'CHECKED_OUT'>('ALL');

  // Modals
  showAddInventory = signal(false);
  editingItem = signal<InventoryItem | null>(null);
  showCheckIn = signal(false);

  // Form Models
  itemForm: Partial<InventoryItem> = {
    name: '',
    asset_tag: '',
    category: 'Furniture',
    quantity: 1,
    unit_value: 0,
    location: '',
    reorder_threshold: 5,
    status: 'ACTIVE'
  };

  visitorForm: Partial<VisitorLog> = {
    name: '',
    phone: '',
    purpose: '',
    host_id: ''
  };

  categories = [
    'Furniture',
    'Electronics & IT',
    'Laboratory Equipment',
    'Sports & Recreation',
    'Stationery & Office',
    'Cleaning Supplies',
    'Classroom AV',
    'General Facility'
  ];

  // --- Computed Telemetry ---
  totalInventoryUnits = computed(() => {
    return this.inventory().reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  });

  totalAssetValue = computed(() => {
    return this.inventory().reduce((sum, i) => {
      const val = i.current_value != null ? i.current_value : (Number(i.unit_value) || 0) * (Number(i.quantity) || 1);
      return sum + val;
    }, 0);
  });

  activeVisitorCount = computed(() => {
    return this.visitors().filter(v => !v.check_out).length;
  });

  checkedOutVisitorCount = computed(() => {
    return this.visitors().filter(v => !!v.check_out).length;
  });

  lowStockCount = computed(() => {
    return this.inventory().filter(i => (Number(i.quantity) || 0) <= (Number(i.reorder_threshold) || 0) && (i.status !== 'DISPOSED')).length;
  });

  maintenanceCount = computed(() => {
    return this.inventory().filter(i => i.status === 'MAINTENANCE').length;
  });

  availableCategories = computed(() => {
    const set = new Set<string>();
    this.inventory().forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  });

  // Filtered Inventory
  filteredInventory = computed(() => {
    const q = this.inventorySearch().toLowerCase().trim();
    const cat = this.selectedCategory();
    const st = this.inventoryStatusFilter();

    return this.inventory().filter(i => {
      const matchesQuery = !q ||
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.asset_tag && i.asset_tag.toLowerCase().includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q));

      const matchesCat = cat === 'ALL' || i.category === cat;

      let matchesStatus = true;
      if (st === 'ACTIVE') matchesStatus = i.status === 'ACTIVE' || !i.status;
      else if (st === 'MAINTENANCE') matchesStatus = i.status === 'MAINTENANCE';
      else if (st === 'LOW_STOCK') matchesStatus = (Number(i.quantity) || 0) <= (Number(i.reorder_threshold) || 0);

      return matchesQuery && matchesCat && matchesStatus;
    });
  });

  // Filtered Visitors
  filteredVisitors = computed(() => {
    const q = this.visitorSearch().toLowerCase().trim();
    const st = this.visitorStatusFilter();

    return this.visitors().filter(v => {
      const matchesQuery = !q ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.purpose && v.purpose.toLowerCase().includes(q)) ||
        (v.host_id && v.host_id.toLowerCase().includes(q));

      let matchesStatus = true;
      if (st === 'ON_PREMISES') matchesStatus = !v.check_out;
      else if (st === 'CHECKED_OUT') matchesStatus = !!v.check_out;

      return matchesQuery && matchesStatus;
    });
  });

  ngOnInit() {
    this.loadInventory();
    this.loadVisitors();
  }

  switchTab(tab: 'inventory' | 'visitors' | 'spaces') {
    this.activeTab.set(tab);
    if (tab === 'visitors') {
      this.loadVisitors();
    }
  }

  loadInventory() {
    this.isLoadingInventory.set(true);
    this.facilityService.getInventory().subscribe({
      next: (items) => {
        this.inventory.set(items || []);
        this.isLoadingInventory.set(false);
      },
      error: () => this.isLoadingInventory.set(false)
    });
  }

  loadVisitors() {
    this.isLoadingVisitors.set(true);
    const date = this.selectedVisitorDate();
    this.facilityService.getVisitors(date).subscribe({
      next: (logs) => {
        this.visitors.set(logs || []);
        this.isLoadingVisitors.set(false);
      },
      error: () => this.isLoadingVisitors.set(false)
    });
  }

  onVisitorDateChange(date: string) {
    this.selectedVisitorDate.set(date);
    this.loadVisitors();
  }

  // --- Inventory Actions ---
  openAddInventory() {
    this.editingItem.set(null);
    const prefix = 'FAC';
    const randomTag = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.itemForm = {
      name: '',
      asset_tag: randomTag,
      category: 'Furniture',
      quantity: 1,
      unit_value: 0,
      location: '',
      reorder_threshold: 5,
      status: 'ACTIVE'
    };
    this.showAddInventory.set(true);
  }

  openEditInventory(item: InventoryItem) {
    this.editingItem.set(item);
    this.itemForm = { ...item };
    this.showAddInventory.set(true);
  }

  generateTag() {
    const prefix = (this.itemForm.category?.substring(0, 3).toUpperCase() || 'FAC');
    this.itemForm.asset_tag = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  saveInventoryItem() {
    if (!this.itemForm.name?.trim()) {
      this.dialog.alert('Please enter an item name.', 'Missing Field', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    const payload: Partial<InventoryItem> = {
      ...this.itemForm,
      quantity: Number(this.itemForm.quantity) || 0,
      unit_value: Number(this.itemForm.unit_value) || 0,
      reorder_threshold: Number(this.itemForm.reorder_threshold) || 0
    };

    if (this.editingItem() && this.editingItem()!.id) {
      this.facilityService.updateAsset(this.editingItem()!.id!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showAddInventory.set(false);
          this.loadInventory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err?.error?.error || 'Failed to update item.', 'Update Error', 'danger');
        }
      });
    } else {
      this.facilityService.addInventoryItem(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.showAddInventory.set(false);
          this.loadInventory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err?.error?.error || 'Failed to add item.', 'Creation Error', 'danger');
        }
      });
    }
  }

  deleteItem(id: string, name: string) {
    this.dialog.confirm(`Permanently remove "${name}" from campus inventory?`, 'Delete Inventory Item', 'danger', 'Delete').subscribe((ok: boolean) => {
      if (ok) {
        this.facilityService.deleteInventoryItem(id).subscribe({
          next: () => this.loadInventory(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Failed to delete item.', 'Error', 'danger')
        });
      }
    });
  }

  quickAdjustQty(item: InventoryItem, delta: number) {
    if (!item.id) return;
    const current = Number(item.quantity) || 0;
    const newQty = Math.max(0, current + delta);
    this.facilityService.adjustInventory(item.id, newQty).subscribe({
      next: () => {
        this.inventory.update(list => list.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
      },
      error: (err) => console.error('Failed to adjust quantity:', err)
    });
  }

  // --- Visitor Actions ---
  openCheckIn() {
    this.visitorForm = {
      name: '',
      phone: '',
      purpose: '',
      host_id: ''
    };
    this.showCheckIn.set(true);
  }

  saveVisitorCheckIn() {
    if (!this.visitorForm.name?.trim() || !this.visitorForm.purpose?.trim()) {
      this.dialog.alert('Please specify the visitor name and purpose of visit.', 'Missing Fields', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    this.facilityService.checkInVisitor(this.visitorForm).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showCheckIn.set(false);
        this.loadVisitors();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.dialog.alert(err?.error?.error || 'Failed to check in visitor.', 'Check-In Error', 'danger');
      }
    });
  }

  checkOutVisitor(id: string, name: string) {
    this.dialog.confirm(`Confirm check-out for visitor "${name}"?`, 'Check Out Visitor', 'info', 'Check Out').subscribe((ok) => {
      if (ok) {
        this.facilityService.checkOutVisitor(id).subscribe({
          next: () => this.loadVisitors(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Failed to check out visitor.', 'Error', 'danger')
        });
      }
    });
  }

  // --- Export & Print ---
  exportCSV() {
    if (this.activeTab() === 'inventory') {
      const items = this.filteredInventory();
      if (!items.length) {
        this.dialog.alert('No inventory items to export.', 'Export CSV', 'info');
        return;
      }
      const headers = ['Asset Tag', 'Item Name', 'Category', 'Location', 'Quantity', 'Unit Value (GHS)', 'Total Value (GHS)', 'Reorder Threshold', 'Status'];
      const rows = items.map(i => [
        `"${i.asset_tag || ''}"`,
        `"${i.name || ''}"`,
        `"${i.category || ''}"`,
        `"${i.location || ''}"`,
        i.quantity || 0,
        i.unit_value || 0,
        (i.unit_value || 0) * (i.quantity || 1),
        i.reorder_threshold || 0,
        `"${i.status || 'ACTIVE'}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `campus_inventory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const logs = this.filteredVisitors();
      if (!logs.length) {
        this.dialog.alert('No visitor logs to export.', 'Export CSV', 'info');
        return;
      }
      const headers = ['Visitor Name', 'Phone', 'Purpose', 'Host / Department', 'Check In Time', 'Check Out Time', 'Status'];
      const rows = logs.map(v => [
        `"${v.name || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.purpose || ''}"`,
        `"${v.host_id || 'Campus Office'}"`,
        `"${v.check_in || ''}"`,
        `"${v.check_out || 'On Premises'}"`,
        `"${v.check_out ? 'CHECKED OUT' : 'ON PREMISES'}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `visitor_logs_${this.selectedVisitorDate()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  printReport() {
    window.print();
  }
}
