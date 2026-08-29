import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    private apiUrl = '/api/payments';

    initializePayment(fiscalRecordId: string, amount?: number, callbackUrl?: string): Observable<{ authorization_url: string }> {
        return this.http.post<{ authorization_url: string }>(`${this.apiUrl}/initialize`, {
            fiscal_record_id: fiscalRecordId,
            amount: amount,
            callback_url: callbackUrl
        });
    }

    initializeWalletTopUp(studentId: string, amount: number, email?: string, callbackUrl?: string): Observable<{ authorization_url: string }> {
        return this.http.post<{ authorization_url: string }>(`${this.apiUrl}/initialize-wallet-topup`, {
            student_id: studentId,
            amount: amount,
            email: email,
            callback_url: callbackUrl
        });
    }

    verifyPayment(reference: string): Observable<{ status: string; message?: string; data?: any }> {
        return this.http.get<{ status: string; message?: string; data?: any }>(`${this.apiUrl}/verify/${reference}`);
    }
}
