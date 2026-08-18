import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService, StockItem, StockMovement, Supplier, PurchaseOrder } from '../../../core/infrastructure/inventory/inventory.service';

type ActiveTab = 'stock' | 'orders' | 'suppliers';

@Component({
  selector: 'app-operations-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './operations-dashboard.component.html'
})
export class OperationsDashboardComponent implements OnInit {
  activeTab = signal<ActiveTab>('stock');
  
  items = signal<StockItem[]>([]);
  lowStockItems = signal<StockItem[]>([]);
  suppliers = signal<Supplier[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);

  selectedItem = signal<StockItem | null>(null);

  showItemForm = signal(false);
  showMovementForm = signal(false);
  showSupplierForm = signal(false);
  showPOForm = signal(false);
  
  movementMode = signal<'in' | 'out'>('in');

  itemForm: FormGroup;
  movementForm: FormGroup;
  supplierForm: FormGroup;
  poForm: FormGroup;

  totalStockValue = computed(() =>
    this.items().reduce((s, i) => s + i.current_quantity * i.unit_cost, 0)
  );

  lowStockCount = computed(() => this.lowStockItems().length);

  constructor(private invSvc: InventoryService, private fb: FormBuilder) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      category: ['CONSUMABLE', Validators.required],
      unit: ['pcs', Validators.required],
      unit_cost: [0, Validators.required],
      reorder_level: [5, Validators.required],
      location_notes: ['']
    });

    this.movementForm = this.fb.group({
      item_id: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reference: [''],
      remarks: ['']
    });

    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      contact_name: [''],
      email: [''],
      phone: [''],
      address: ['']
    });

    this.poForm = this.fb.group({
      supplier_id: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.invSvc.listItems().subscribe(d => this.items.set(d || []));
    this.invSvc.getLowStock().subscribe(d => this.lowStockItems.set(d || []));
    this.invSvc.listSuppliers().subscribe(d => this.suppliers.set(d || []));
    this.invSvc.listPOs().subscribe(d => this.purchaseOrders.set(d || []));
  }

  openMovement(item: StockItem, mode: 'in' | 'out') {
    this.movementMode.set(mode);
    this.movementForm.patchValue({ item_id: item.id });
    this.showMovementForm.set(true);
  }

  submitItem() {
    if (this.itemForm.invalid) return;
    this.invSvc.createItem(this.itemForm.value).subscribe(() => {
      this.showItemForm.set(false);
      this.itemForm.reset({ category: 'CONSUMABLE', unit: 'pcs', unit_cost: 0, reorder_level: 5 });
      this.loadAll();
    });
  }

  submitMovement() {
    if (this.movementForm.invalid) return;
    const call = this.movementMode() === 'in' ? this.invSvc.recordIn(this.movementForm.value) : this.invSvc.recordOut(this.movementForm.value);
    call.subscribe(() => {
      this.showMovementForm.set(false);
      this.movementForm.reset({ quantity: 1 });
      this.loadAll();
    });
  }

  submitSupplier() {
    if (this.supplierForm.invalid) return;
    this.invSvc.createSupplier(this.supplierForm.value).subscribe(() => {
      this.showSupplierForm.set(false);
      this.supplierForm.reset();
      this.loadAll();
    });
  }

  submitPO() {
    if (this.poForm.invalid) return;
    const po: PurchaseOrder = { ...this.poForm.value, items: [] };
    this.invSvc.createPO(po).subscribe(() => {
      this.showPOForm.set(false);
      this.poForm.reset();
      this.loadAll();
    });
  }

  approvePO(id: string) {
    this.invSvc.approvePO(id).subscribe(() => this.loadAll());
  }

  receivePO(id: string) {
    this.invSvc.receivePO(id).subscribe(() => this.loadAll());
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      'DRAFT': 'bg-slate-700 text-slate-300',
      'SUBMITTED': 'bg-blue-900/50 text-blue-400',
      'APPROVED': 'bg-amber-900/50 text-amber-400',
      'RECEIVED': 'bg-emerald-900/50 text-emerald-400',
      'CANCELLED': 'bg-red-900/50 text-red-400'
    };
    return map[status] || 'bg-slate-700 text-slate-300';
  }

  get stockHealthPercentage(): number {
    const items = this.items();
    if (!items.length) return 100;
    const healthy = items.filter(i => i.current_quantity > i.reorder_level).length;
    return Math.round((healthy / items.length) * 100);
  }
}
