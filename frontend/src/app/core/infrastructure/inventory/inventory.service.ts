import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface StockItem {
  id?: string;
  tenant_id?: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  reorder_level: number;
  current_quantity: number;
  unit_cost: number;
  location_notes?: string;
  is_active?: boolean;
}

export interface StockMovement {
  id?: string;
  item_id: string;
  type?: string;
  quantity: number;
  reference?: string;
  remarks?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
}

export interface PurchaseOrder {
  id?: string;
  supplier_id: string;
  po_number?: string;
  status?: string;
  total_amount?: number;
  notes?: string;
  items?: POLineItem[];
}

export interface POLineItem {
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private base = `${environment.apiUrl}/inventory`;
  private procBase = `${environment.apiUrl}/procurement`;

  constructor(private http: HttpClient) {}

  // Stock Items
  createItem(item: StockItem): Observable<StockItem> {
    return this.http.post<StockItem>(`${this.base}/items`, item);
  }

  listItems(): Observable<StockItem[]> {
    return this.http.get<StockItem[]>(`${this.base}/items`);
  }

  getLowStock(): Observable<StockItem[]> {
    return this.http.get<StockItem[]>(`${this.base}/items/low-stock`);
  }

  getMovements(itemId: string): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.base}/items/${itemId}/movements`);
  }

  recordIn(movement: StockMovement): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.base}/movements/in`, movement);
  }

  recordOut(movement: StockMovement): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.base}/movements/out`, movement);
  }

  // Suppliers
  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.procBase}/suppliers`, supplier);
  }

  listSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.procBase}/suppliers`);
  }

  // Purchase Orders
  createPO(po: PurchaseOrder): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.procBase}/orders`, po);
  }

  listPOs(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.procBase}/orders`);
  }

  approvePO(id: string): Observable<any> {
    return this.http.post(`${this.procBase}/orders/${id}/approve`, {});
  }

  receivePO(id: string): Observable<any> {
    return this.http.post(`${this.procBase}/orders/${id}/receive`, {});
  }
}
