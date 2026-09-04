import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { Student } from '../../../core/domain/student.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, StudentSearchDropdownComponent],
    templateUrl: './wallet.component.html',
    styleUrl: './wallet.component.css'
})
export class WalletComponent {
    private http = inject(HttpClient);
    private toast = inject(ToastService);
    private dialog = inject(DialogService);

    selectedStudent = signal<Student | null>(null);
    selectedStudentId = signal<string | null>(null);
    balance = signal<number>(0);
    transactions = signal<any[]>([]);
    isLoading = signal(false);

    purchaseAmount = signal<number>(0);
    purchaseItem = signal<string>('');
    purchaseLoading = signal(false);

    topupAmount = signal<number>(0);
    topupLoading = signal(false);

    // Quick Canteen Presets
    readonly commonItems = [
        { name: 'Lunch Combo', price: 15 },
        { name: 'Snack & Drink', price: 8 },
        { name: 'Breakfast Set', price: 10 },
        { name: 'Water Bottle', price: 3 },
        { name: 'Stationery Item', price: 5 }
    ];

    // Quick Top-up amounts
    readonly quickTopups = [10, 20, 50, 100, 200];

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
        this.topupAmount.set(0);
    }

    selectItemPreset(item: { name: string; price: number }) {
        this.purchaseItem.set(item.name);
        this.purchaseAmount.set(item.price);
    }

    selectTopupPreset(amount: number) {
        this.topupAmount.set(amount);
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
            error: (err) => {
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
        this.http.post(`/api/fiscal/wallet/purchase/${id}`, { amount: amt, item: item }).subscribe({
            next: () => {
                this.purchaseLoading.set(false);
                this.toast.success(`Charged ₵${amt.toFixed(2)} for ${item}`, 'Payment Processed');
                this.purchaseAmount.set(0);
                this.purchaseItem.set('');
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
        
        this.topupLoading.set(true);
        this.http.post(`/api/fiscal/wallet/topup/${id}`, { amount: amt, description: 'Manual wallet top-up' }).subscribe({
            next: () => {
                this.topupLoading.set(false);
                this.toast.success(`Successfully credited ₵${amt.toFixed(2)} to wallet!`, 'Top-Up Successful');
                this.topupAmount.set(0);
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

