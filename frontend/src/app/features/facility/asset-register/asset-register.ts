import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { InventoryItem } from '../../../core/domain/facility.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-asset-register',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe, FormsModule, RouterModule],
  templateUrl: './asset-register.html',
  styleUrl: './asset-register.css'
})
export class AssetRegisterComponent implements OnInit {
  private facilityService = inject(FacilityService);
  private dialog = inject(DialogService);

  assets = signal<InventoryItem[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  searchQuery = signal('');
  selectedCategory = signal('ALL');
  filterStatus = signal<'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED'>('ALL');
  viewMode = signal<'grid' | 'table'>('table');

  // Modals
  showModal = signal(false);
  editingAsset = signal<InventoryItem | null>(null);
  selectedAssetForDetail = signal<InventoryItem | null>(null);
  copiedTag = signal<string | null>(null);

  // Form Model
  formData: Partial<InventoryItem> = {
    name: '',
    asset_tag: '',
    category: 'IT & Electronics',
    quantity: 1,
    unit_value: 0,
    depreciation_rate: 10,
    location: '',
    reorder_threshold: 0,
    status: 'ACTIVE',
    acquisition_date: new Date().toISOString().split('T')[0]
  };

  categories = [
    'IT & Electronics',
    'Furniture & Fixtures',
    'Laboratory Equipment',
    'Sports & Recreation',
    'Vehicles & Fleet',
    'Musical Instruments',
    'Classroom AV',
    'Textbooks & Library',
    'General Facility'
  ];

  // Computed Telemetry
  totalValue = computed(() => {
    return this.assets().reduce((acc, a) => {
      const val = a.current_value != null ? a.current_value : (a.unit_value || 0) * (a.quantity || 1);
      return acc + val;
    }, 0);
  });

  activeCount = computed(() => this.assets().filter(a => a.status === 'ACTIVE').length);
  maintenanceCount = computed(() => this.assets().filter(a => a.status === 'MAINTENANCE').length);
  disposedCount = computed(() => this.assets().filter(a => a.status === 'DISPOSED').length);
  lowStockCount = computed(() => this.assets().filter(a => (a.quantity || 0) <= (a.reorder_threshold || 0) && a.status === 'ACTIVE').length);

  allCategories = computed(() => {
    const cats = new Set<string>();
    this.assets().forEach(a => { if (a.category) cats.add(a.category); });
    return Array.from(cats);
  });

  filteredAssets = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const st = this.filterStatus();

    return this.assets().filter(a => {
      const matchesSearch = !q ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.asset_tag && a.asset_tag.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q));

      const matchesCat = cat === 'ALL' || a.category === cat;
      const matchesStatus = st === 'ALL' || a.status === st;

      return matchesSearch && matchesCat && matchesStatus;
    });
  });

  ngOnInit() {
    this.loadAssets();
  }

  loadAssets() {
    this.isLoading.set(true);
    this.facilityService.getInventory().subscribe({
      next: (res) => {
        this.assets.set(res || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load asset register:', err);
        this.isLoading.set(false);
      }
    });
  }

  openAdd() {
    this.editingAsset.set(null);
    const randomTag = 'AST-' + Math.floor(1000 + Math.random() * 9000);
    this.formData = {
      name: '',
      asset_tag: randomTag,
      category: 'IT & Electronics',
      quantity: 1,
      unit_value: 0,
      depreciation_rate: 10,
      location: '',
      reorder_threshold: 0,
      status: 'ACTIVE',
      acquisition_date: new Date().toISOString().split('T')[0]
    };
    this.showModal.set(true);
  }

  openEdit(asset: InventoryItem) {
    this.editingAsset.set(asset);
    this.formData = {
      ...asset,
      acquisition_date: asset.acquisition_date ? asset.acquisition_date.split('T')[0] : ''
    };
    this.showModal.set(true);
  }

  generateTag() {
    const prefix = (this.formData.category?.substring(0, 3).toUpperCase() || 'AST');
    this.formData.asset_tag = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  closeModal() {
    this.showModal.set(false);
    this.editingAsset.set(null);
  }

  submit() {
    if (!this.formData.name?.trim() || !this.formData.category?.trim()) {
      this.dialog.alert('Asset name and category are mandatory.', 'Missing Fields', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    const itemData = {
      ...this.formData,
      unit_value: Number(this.formData.unit_value) || 0,
      quantity: Number(this.formData.quantity) || 1,
      depreciation_rate: Number(this.formData.depreciation_rate) || 0,
      reorder_threshold: Number(this.formData.reorder_threshold) || 0
    };

    if (this.editingAsset() && this.editingAsset()!.id) {
      this.facilityService.updateAsset(this.editingAsset()!.id!, itemData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadAssets();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err?.error?.error || 'Failed to update asset.', 'Update Error', 'danger');
        }
      });
    } else {
      this.facilityService.addInventoryItem(itemData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadAssets();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.dialog.alert(err?.error?.error || 'Failed to register asset.', 'Creation Error', 'danger');
        }
      });
    }
  }

  toggleStatus(asset: InventoryItem, newStatus: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED') {
    if (!asset.id) return;
    const actionLabel = newStatus === 'DISPOSED' ? 'Dispose' : newStatus === 'MAINTENANCE' ? 'Set to Maintenance' : 'Activate';
    this.dialog.confirm(
      `Are you sure you want to change status of "${asset.name}" to ${newStatus}?`,
      `${actionLabel} Asset`,
      newStatus === 'DISPOSED' ? 'danger' : 'info',
      'Confirm'
    ).subscribe(ok => {
      if (ok) {
        this.facilityService.updateAsset(asset.id!, { ...asset, status: newStatus }).subscribe({
          next: () => this.loadAssets(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Error updating status', 'Error', 'danger')
        });
      }
    });
  }

  deleteAsset(asset: InventoryItem) {
    if (!asset.id) return;
    this.dialog.confirm(
      `Permanently delete "${asset.name}" (${asset.asset_tag || 'No tag'}) from the campus asset register?`,
      'Delete Asset Record',
      'danger',
      'Delete'
    ).subscribe(ok => {
      if (ok) {
        this.facilityService.deleteInventoryItem(asset.id!).subscribe({
          next: () => this.loadAssets(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Failed to delete asset', 'Error', 'danger')
        });
      }
    });
  }

  quickAdjustQty(asset: InventoryItem, delta: number) {
    if (!asset.id) return;
    const current = asset.quantity || 0;
    const newQty = Math.max(0, current + delta);
    this.facilityService.adjustInventory(asset.id, newQty).subscribe({
      next: () => {
        this.assets.update(list => list.map(a => a.id === asset.id ? { ...a, quantity: newQty } : a));
      },
      error: (err) => console.error('Failed to adjust quantity:', err)
    });
  }

  copyTag(tag: string) {
    navigator.clipboard.writeText(tag).then(() => {
      this.copiedTag.set(tag);
      setTimeout(() => this.copiedTag.set(null), 2000);
    });
  }

  openDetail(asset: InventoryItem) {
    this.selectedAssetForDetail.set(asset);
  }

  closeDetail() {
    this.selectedAssetForDetail.set(null);
  }

  exportCSV() {
    const list = this.filteredAssets();
    if (!list.length) {
      this.dialog.alert('No assets found to export.', 'Export CSV', 'info');
      return;
    }

    const headers = ['Asset Tag', 'Asset Name', 'Category', 'Location', 'Quantity', 'Unit Value (GHS)', 'Total Value (GHS)', 'Depreciation %', 'Status', 'Acquisition Date'];
    const rows = list.map(a => [
      `"${a.asset_tag || ''}"`,
      `"${a.name || ''}"`,
      `"${a.category || ''}"`,
      `"${a.location || ''}"`,
      a.quantity || 0,
      a.unit_value || 0,
      (a.current_value != null ? a.current_value : (a.unit_value || 0) * (a.quantity || 1)),
      a.depreciation_rate || 0,
      `"${a.status || 'ACTIVE'}"`,
      `"${a.acquisition_date || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_assets_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printRoster() {
    window.print();
  }
}

