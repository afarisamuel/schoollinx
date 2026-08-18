import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacilityService } from '../../../core/infrastructure/facility/facility.service';
import { InventoryItem } from '../../../core/domain/facility.model';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
  selector: 'app-asset-register',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './asset-register.html',
  styleUrl: './asset-register.css'
})
export class AssetRegisterComponent implements OnInit {
  private facilityService = inject(FacilityService);
  private dialog = inject(DialogService);

  assets = signal<InventoryItem[]>([]);
  filterStatus = signal<string>('ALL');
  showModal = signal(false);
  isSubmitting = signal(false);

  formData: Partial<InventoryItem> = { status: 'ACTIVE', depreciation_rate: 10, quantity: 1, reorder_threshold: 0 };

  filteredAssets = computed(() => {
    const status = this.filterStatus();
    if (status === 'ALL') return this.assets();
    return this.assets().filter(a => a.status === status);
  });

  totalValue = computed(() => this.assets().reduce((acc, a) => acc + (a.current_value || a.unit_value || 0), 0));

  ngOnInit() { this.loadAssets(); }

  loadAssets() {
    this.facilityService.getInventory().subscribe({
      next: (res) => this.assets.set(res),
      error: (err) => console.error(err)
    });
  }

  openAdd() {
    this.formData = { status: 'ACTIVE', depreciation_rate: 10, quantity: 1, reorder_threshold: 0 };
    this.showModal.set(true);
  }

  submit() {
    if (!this.formData.name || !this.formData.category) {
      this.dialog.alert('Name and category are required.', 'Validation', 'warning');
      return;
    }
    this.isSubmitting.set(true);
    this.facilityService.addInventoryItem(this.formData).subscribe({
      next: () => { this.isSubmitting.set(false); this.showModal.set(false); this.loadAssets(); },
      error: (err) => { this.isSubmitting.set(false); this.dialog.alert(err?.error?.error || 'Error', 'Error', 'danger'); }
    });
  }

  markDisposed(asset: InventoryItem) {
    this.dialog.confirm(`Mark "${asset.name}" as Disposed?`, 'Dispose Asset', 'danger', 'Dispose').subscribe(ok => {
      if (ok && asset.id) {
        this.facilityService.updateAsset(asset.id, { ...asset, status: 'DISPOSED' }).subscribe({
          next: () => this.loadAssets(),
          error: (err) => this.dialog.alert(err?.error?.error || 'Error', 'Error', 'danger')
        });
      }
    });
  }
}
