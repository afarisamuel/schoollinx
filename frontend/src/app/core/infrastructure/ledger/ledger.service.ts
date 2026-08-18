import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LedgerAccount {
  id?: string;
  tenant_id?: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerEntry {
  id?: string;
  account_id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reference?: string;
  description?: string;
  date: string;
  created_at?: string;
}

export interface BalanceSheet {
  ASSET?: number;
  LIABILITY?: number;
  EQUITY?: number;
  REVENUE?: number;
  EXPENSE?: number;
}

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private baseUrl = `${environment.apiUrl}/ledger`;

  constructor(private http: HttpClient) {}

  createAccount(account: LedgerAccount): Observable<LedgerAccount> {
    return this.http.post<LedgerAccount>(`${this.baseUrl}/accounts`, account);
  }

  getAccounts(): Observable<LedgerAccount[]> {
    return this.http.get<LedgerAccount[]>(`${this.baseUrl}/accounts`);
  }

  postEntry(entry: LedgerEntry): Observable<LedgerEntry> {
    return this.http.post<LedgerEntry>(`${this.baseUrl}/entries`, entry);
  }

  getAccountEntries(accountId: string): Observable<LedgerEntry[]> {
    return this.http.get<LedgerEntry[]>(`${this.baseUrl}/accounts/${accountId}/entries`);
  }

  getAccountBalance(accountId: string): Observable<{ balance: number }> {
    return this.http.get<{ balance: number }>(`${this.baseUrl}/accounts/${accountId}/balance`);
  }

  getBalanceSheet(): Observable<BalanceSheet> {
    return this.http.get<BalanceSheet>(`${this.baseUrl}/balance-sheet`);
  }
}
