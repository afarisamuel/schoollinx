import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { Student } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

import { StudentService } from '../../../core/infrastructure/student/student.service';
import { OnDestroy } from '@angular/core';

export interface CanteenPresetItem {
    id: string;
    name: string;
    price: number;
    category: 'MEALS' | 'SNACKS' | 'DRINKS' | 'STATIONERY';
    icon: string;
    badge?: string;
    badgeColor?: string;
}

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, StudentSearchDropdownComponent],
    templateUrl: './wallet.component.html',
    styleUrl: './wallet.component.css'
})
export class WalletComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient);
    private toast = inject(ToastService);
    private dialog = inject(DialogService);
    private studentService = inject(StudentService);

    selectedStudent = signal<Student | null>(null);
    selectedStudentId = signal<string | null>(null);
    balance = signal<number>(0);
    transactions = signal<any[]>([]);
    isLoading = signal(false);

    // Hardware Scanner Buffer
    private keyBuffer: string = '';
    private lastKeyTime: number = 0;
    allStudents = signal<Student[]>([]);

    ngOnInit(): void {
        this.loadAllStudentsRoster();
        this.setupHardwareBarcodeListener();
    }

    ngOnDestroy(): void {
        this.removeHardwareBarcodeListener();
    }

    private loadAllStudentsRoster() {
        this.studentService.getStudents().subscribe({
            next: (list) => this.allStudents.set(list || []),
            error: () => {}
        });
    }

    private handleBarcodeScan = (event: KeyboardEvent) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            return;
        }

        const currentTime = Date.now();
        if (currentTime - this.lastKeyTime > 200) {
            this.keyBuffer = '';
        }
        this.lastKeyTime = currentTime;

        if (event.key === 'Enter') {
            if (this.keyBuffer.trim().length > 0) {
                event.preventDefault();
                this.lookupStudentByBarcode(this.keyBuffer.trim());
                this.keyBuffer = '';
            }
        } else if (event.key.length === 1) {
            this.keyBuffer += event.key;
        }
    };

    private setupHardwareBarcodeListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleBarcodeScan);
        }
    }

    private removeHardwareBarcodeListener() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleBarcodeScan);
        }
    }

    lookupStudentByBarcode(code: string) {
        let clean = code.trim().toLowerCase();
        const student = this.allStudents().find(s => 
            (s.id && s.id.toLowerCase() === clean) ||
            (s.id && `stu-${s.id.substring(0, 8)}`.toLowerCase() === clean) ||
            (s.enrollment_num && s.enrollment_num.toLowerCase() === clean) ||
            (clean.length >= 4 && `${s.first_name} ${s.last_name}`.toLowerCase().includes(clean))
        );

        if (student) {
            this.onStudentSelected(student);
            this.toast.success(`Card Verified: ${student.first_name} ${student.last_name}`, 'Badge Swiped');
        } else {
            this.toast.warning(`No candidate found matching credential "${code}"`, 'Card Lookup');
        }
    }

    // Terminal active mode tab: 'POS' | 'TOPUP' | 'SECURITY'
    activeTerminalTab = signal<'POS' | 'TOPUP' | 'SECURITY'>('POS');

    // POS State
    purchaseAmount = signal<number>(0);
    purchaseItem = signal<string>('');
    purchaseQuantity = signal<number>(1);
    purchaseLoading = signal(false);
    selectedCategory = signal<'ALL' | 'MEALS' | 'SNACKS' | 'DRINKS' | 'STATIONERY'>('ALL');

    // Top-up State
    topupAmount = signal<number>(0);
    topupMethod = signal<'CASH' | 'MOMO' | 'BANK'>('CASH');
    topupReference = signal<string>('');
    topupLoading = signal(false);

    // Ledger Filters & Search
    txFilter = signal<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
    txSearch = signal<string>('');

    // Receipt Modal State
    selectedReceiptTx = signal<any | null>(null);
    isReceiptOpen = signal<boolean>(false);

    // Daily Limit & Pass Controls (UI state)
    dailySpendingLimit = signal<number>(50);
    isCardFrozen = signal<boolean>(false);

    // Canteen Menu Catalog
    readonly canteenCatalog: CanteenPresetItem[] = [
        { id: '1', name: 'Lunch Combo Special', price: 15, category: 'MEALS', icon: 'fa-utensils', badge: 'Popular', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
        { id: '2', name: 'Hot Jollof Rice & Chicken', price: 18, category: 'MEALS', icon: 'fa-bowl-rice', badge: 'Chef Special', badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
        { id: '3', name: 'Waakye & Fish Combo', price: 16, category: 'MEALS', icon: 'fa-plate-wheat' },
        { id: '4', name: 'Breakfast Egg & Bread Set', price: 10, category: 'MEALS', icon: 'fa-egg' },
        { id: '5', name: 'Meat Pie & Chilled Juice', price: 12, category: 'SNACKS', icon: 'fa-cookie-bite', badge: 'Combo', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        { id: '6', name: 'Fresh Fruit Salad Cup', price: 7, category: 'SNACKS', icon: 'fa-apple-whole', badge: 'Healthy', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
        { id: '7', name: 'Pastry & Milk Drink', price: 8, category: 'SNACKS', icon: 'fa-cake-candles' },
        { id: '8', name: 'Chilled Water Bottle (750ml)', price: 3, category: 'DRINKS', icon: 'fa-bottle-water' },
        { id: '9', name: 'Fresh Juice Box (330ml)', price: 6, category: 'DRINKS', icon: 'fa-glass-water' },
        { id: '10', name: 'Chilled Yoghurt Cup', price: 5, category: 'DRINKS', icon: 'fa-ice-cream' },
        { id: '11', name: 'School Exercise Notebook', price: 6, category: 'STATIONERY', icon: 'fa-book' },
        { id: '12', name: 'Pen & Pencil Dual Pack', price: 4, category: 'STATIONERY', icon: 'fa-pen-clip' },
        { id: '13', name: 'Geometry Math Set', price: 15, category: 'STATIONERY', icon: 'fa-compass-drafting' }
    ];

    // Quick Top-up amounts
    readonly quickTopups = [10, 20, 50, 100, 200, 500];

    // Computed Filtered Menu Items
    filteredCatalog = computed(() => {
        const cat = this.selectedCategory();
        if (cat === 'ALL') return this.canteenCatalog;
        return this.canteenCatalog.filter(item => item.category === cat);
    });

    // Computed Telemetry Metrics
    totalDeposited = computed(() => {
        return this.transactions()
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    totalSpent = computed(() => {
        return this.transactions()
            .filter(t => t.type !== 'CREDIT')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    totalTxCount = computed(() => this.transactions().length);

    projectedRemainingBalance = computed(() => {
        return this.balance() - (this.purchaseAmount() || 0);
    });

    // Computed Filtered Transactions
    filteredTransactions = computed(() => {
        const filter = this.txFilter();
        const search = this.txSearch().toLowerCase().trim();
        let list = this.transactions();

        if (filter === 'CREDIT') {
            list = list.filter(t => t.type === 'CREDIT');
        } else if (filter === 'DEBIT') {
            list = list.filter(t => t.type !== 'CREDIT');
        }

        if (search) {
            list = list.filter(t => 
                (t.description || '').toLowerCase().includes(search) ||
                (String(t.amount) || '').includes(search) ||
                (t.type || '').toLowerCase().includes(search)
            );
        }

        return list;
    });

    onStudentSelected(student: Student) {
        this.selectedStudent.set(student);
        this.selectedStudentId.set(student.id || null);
        this.loadWalletInfo();
    }

    clearStudent() {
        this.selectedStudent.set(null);
        this.selectedStudentId.set(null);
        this.balance.set(0);
        this.transactions.set([]);
        this.purchaseAmount.set(0);
        this.purchaseItem.set('');
        this.purchaseQuantity.set(1);
        this.topupAmount.set(0);
        this.topupReference.set('');
        this.isCardFrozen.set(false);
    }

    selectItemPreset(item: CanteenPresetItem) {
        this.purchaseItem.set(item.name);
        this.purchaseAmount.set(item.price);
        this.purchaseQuantity.set(1);
    }

    adjustQuantity(delta: number) {
        const currentQty = this.purchaseQuantity();
        const newQty = Math.max(1, currentQty + delta);
        const singlePrice = currentQty > 0 ? (this.purchaseAmount() / currentQty) : this.purchaseAmount();
        this.purchaseQuantity.set(newQty);
        this.purchaseAmount.set(Math.round(singlePrice * newQty * 100) / 100);
    }

    selectTopupPreset(amount: number) {
        this.topupAmount.set(amount);
    }

    toggleCardFreeze() {
        this.isCardFrozen.update(v => !v);
        if (this.isCardFrozen()) {
            this.toast.warning('Scholar NFC Smart Pass has been temporarily FROZEN. Canteen POS transactions are blocked.', 'Pass Frozen');
        } else {
            this.toast.success('Scholar Smart Pass is now ACTIVE and unlocked for POS transactions.', 'Pass Activated');
        }
    }

    openReceipt(tx: any) {
        this.selectedReceiptTx.set(tx);
        this.isReceiptOpen.set(true);
    }

    closeReceipt() {
        this.isReceiptOpen.set(false);
        this.selectedReceiptTx.set(null);
    }

    printReceipt() {
        window.print();
    }

    loadWalletInfo() {
        const id = this.selectedStudentId();
        if (!id) return;

        this.isLoading.set(true);
        this.http.get<any>(`/api/fiscal/wallet/${id}`).subscribe({
            next: (data) => {
                this.balance.set(data.balance ?? 0);
                this.transactions.set(data.transactions || []);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Failed to load wallet information', 'Wallet Sync Error');
            }
        });
    }

    processPurchase() {
        const id = this.selectedStudentId();
        const amt = this.purchaseAmount();
        const item = this.purchaseItem().trim();
        
        if (!id) {
            this.toast.warning('Please select a student first.', 'Student Required');
            return;
        }

        if (this.isCardFrozen()) {
            this.dialog.alert(
                'This scholar wallet is currently FROZEN. Please unfreeze the card under the Security tab to process transactions.',
                'Card Locked',
                'warning'
            );
            return;
        }

        if (amt <= 0) {
            this.toast.warning('Please enter a valid purchase amount.', 'Invalid Amount');
            return;
        }
        if (!item) {
            this.toast.warning('Please enter an item description.', 'Description Required');
            return;
        }

        if (amt > this.balance()) {
            this.dialog.alert(
                `Insufficient balance! Student has ₵${this.balance().toFixed(2)} available, but the transaction total is ₵${amt.toFixed(2)}.`,
                'Insufficient Funds',
                'warning'
            );
            return;
        }
        
        this.purchaseLoading.set(true);
        const itemDesc = this.purchaseQuantity() > 1 ? `${item} (x${this.purchaseQuantity()})` : item;
        
        this.http.post(`/api/fiscal/wallet/purchase/${id}`, { amount: amt, item: itemDesc }).subscribe({
            next: (res: any) => {
                this.purchaseLoading.set(false);
                this.toast.success(`Charged ₵${amt.toFixed(2)} for ${itemDesc}`, 'Payment Processed');
                
                // Show mini receipt for instant verification
                const latestTx = {
                    id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
                    type: 'DEBIT',
                    description: `Canteen Purchase: ${itemDesc}`,
                    amount: amt,
                    balance: this.balance() - amt,
                    created_at: new Date().toISOString()
                };
                this.openReceipt(latestTx);

                this.purchaseAmount.set(0);
                this.purchaseItem.set('');
                this.purchaseQuantity.set(1);
                this.loadWalletInfo(); // Refresh
            },
            error: (err) => {
                this.purchaseLoading.set(false);
                const msg = err.error?.error || 'Purchase transaction failed.';
                this.toast.error(msg, 'Transaction Failed');
            }
        });
    }

    processTopUp() {
        const id = this.selectedStudentId();
        const amt = this.topupAmount();
        
        if (!id) {
            this.toast.warning('Please select a student first.', 'Student Required');
            return;
        }
        if (amt <= 0) {
            this.toast.warning('Please enter a valid deposit amount.', 'Invalid Amount');
            return;
        }

        let desc = `Manual top-up (${this.topupMethod()})`;
        if (this.topupReference().trim()) {
            desc += ` - Ref: ${this.topupReference().trim()}`;
        }
        
        this.topupLoading.set(true);
        this.http.post(`/api/fiscal/wallet/topup/${id}`, { amount: amt, description: desc }).subscribe({
            next: () => {
                this.topupLoading.set(false);
                this.toast.success(`Successfully credited ₵${amt.toFixed(2)} to wallet!`, 'Top-Up Successful');
                
                const latestTx = {
                    id: 'DEP-' + Math.floor(100000 + Math.random() * 900000),
                    type: 'CREDIT',
                    description: desc,
                    amount: amt,
                    balance: this.balance() + amt,
                    created_at: new Date().toISOString()
                };
                this.openReceipt(latestTx);

                this.topupAmount.set(0);
                this.topupReference.set('');
                this.loadWalletInfo(); // Refresh
            },
            error: (err) => {
                this.topupLoading.set(false);
                const msg = err.error?.error || 'Top-up deposit failed.';
                this.toast.error(msg, 'Deposit Failed');
            }
        });
    }
}

