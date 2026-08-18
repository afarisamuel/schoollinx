import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { StudentSearchDropdownComponent } from '../../../shared/ui/student-search-dropdown/student-search-dropdown.component';
import { Student } from '../../../core/domain/student.model';

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, StudentSearchDropdownComponent],
    templateUrl: './wallet.component.html',
    styleUrl: './wallet.component.css'
})
export class WalletComponent {
    private http = inject(HttpClient);

    selectedStudentId = signal<string | null>(null);
    balance = signal<number>(0);
    transactions = signal<any[]>([]);
    isLoading = signal(false);

    purchaseAmount = signal<number>(0);
    purchaseItem = signal<string>('');
    purchaseLoading = signal(false);

    topupAmount = signal<number>(0);
    topupLoading = signal(false);

    onStudentSelected(student: Student) {
        this.selectedStudentId.set(student.id || null);
        this.loadWalletInfo();
    }

    loadWalletInfo() {
        const id = this.selectedStudentId();
        if (!id) return;

        this.isLoading.set(true);
        this.http.get<any>(`/api/fiscal/wallet/${id}`).subscribe({
            next: (data) => {
                this.balance.set(data.balance);
                this.transactions.set(data.transactions || []);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.isLoading.set(false);
                alert('Failed to load wallet information');
            }
        });
    }

    processPurchase() {
        const id = this.selectedStudentId();
        const amt = this.purchaseAmount();
        const item = this.purchaseItem();
        
        if (!id || amt <= 0 || !item) return;
        
        this.purchaseLoading.set(true);
        this.http.post(`/api/fiscal/wallet/purchase/${id}`, { amount: amt, item: item }).subscribe({
            next: () => {
                this.purchaseLoading.set(false);
                this.purchaseAmount.set(0);
                this.purchaseItem.set('');
                this.loadWalletInfo(); // Refresh
                alert('Purchase successful');
            },
            error: (err) => {
                this.purchaseLoading.set(false);
                alert(err.error.error || 'Purchase failed');
            }
        });
    }

    processTopUp() {
        const id = this.selectedStudentId();
        const amt = this.topupAmount();
        
        if (!id || amt <= 0) return;
        
        this.topupLoading.set(true);
        this.http.post(`/api/fiscal/wallet/topup/${id}`, { amount: amt, description: 'Manual top-up' }).subscribe({
            next: () => {
                this.topupLoading.set(false);
                this.topupAmount.set(0);
                this.loadWalletInfo(); // Refresh
                alert('Top-up successful');
            },
            error: (err) => {
                this.topupLoading.set(false);
                alert(err.error.error || 'Top-up failed');
            }
        });
    }
}
