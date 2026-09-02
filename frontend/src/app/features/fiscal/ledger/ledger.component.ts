import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LedgerService, LedgerAccount, LedgerEntry, BalanceSheet } from '../../../core/infrastructure/ledger/ledger.service';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ledger.component.html'
})
export class LedgerComponent implements OnInit {
  accounts = signal<LedgerAccount[]>([]);
  balanceSheet = signal<BalanceSheet>({});
  selectedAccount = signal<LedgerAccount | null>(null);
  entries = signal<LedgerEntry[]>([]);
  isLoading = signal(false);
  showAccountForm = signal(false);
  showEntryForm = signal(false);
  activeTab = signal<'accounts' | 'balancesheet'>('accounts');

  accountTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  typeColors: Record<AccountType, string> = {
    ASSET:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    LIABILITY: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    EQUITY:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    REVENUE:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    EXPENSE:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  totalAssets = computed(() => this.balanceSheet().ASSET ?? 0);
  totalLiabilities = computed(() => this.balanceSheet().LIABILITY ?? 0);
  totalEquity = computed(() => this.balanceSheet().EQUITY ?? 0);
  totalRevenue = computed(() => this.balanceSheet().REVENUE ?? 0);
  totalExpenses = computed(() => this.balanceSheet().EXPENSE ?? 0);
  netIncome = computed(() => this.totalRevenue() - this.totalExpenses());

  accountForm: FormGroup;
  entryForm: FormGroup;

  constructor(private ledgerSvc: LedgerService, private fb: FormBuilder) {
    this.accountForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      type: ['ASSET', Validators.required],
      description: ['']
    });

    this.entryForm = this.fb.group({
      type: ['DEBIT', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      reference: [''],
      description: ['', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required]
    });
  }

  ngOnInit() {
    this.loadAccounts();
    this.loadBalanceSheet();
  }

  loadAccounts() {
    this.isLoading.set(true);
    this.ledgerSvc.getAccounts().subscribe({
      next: (data) => { this.accounts.set(data ?? []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  loadBalanceSheet() {
    this.ledgerSvc.getBalanceSheet().subscribe({
      next: (data) => this.balanceSheet.set(data ?? {})
    });
  }

  selectAccount(account: LedgerAccount) {
    this.selectedAccount.set(account);
    this.ledgerSvc.getAccountEntries(account.id!).subscribe(data => this.entries.set(data ?? []));
  }

  submitAccount() {
    if (this.accountForm.invalid) return;
    this.ledgerSvc.createAccount(this.accountForm.value).subscribe({
      next: () => { this.showAccountForm.set(false); this.accountForm.reset({ type: 'ASSET' }); this.loadAccounts(); this.loadBalanceSheet(); }
    });
  }

  submitEntry() {
    if (this.entryForm.invalid || !this.selectedAccount()) return;
    const entry: LedgerEntry = { ...this.entryForm.value, account_id: this.selectedAccount()!.id! };
    this.ledgerSvc.postEntry(entry).subscribe({
      next: () => { this.showEntryForm.set(false); this.entryForm.reset({ type: 'DEBIT', date: new Date().toISOString().substring(0,10) }); this.selectAccount(this.selectedAccount()!); this.loadBalanceSheet(); }
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(val || 0);
  }
}
