import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    private apiUrl = '/api/payments';

    initializePayment(
        fiscalRecordId?: string,
        amountOrOptions?: number | { amount?: number; studentId?: string; email?: string; callbackUrl?: string },
        callbackUrl?: string,
        studentId?: string,
        email?: string
    ): Observable<{ authorization_url: string }> {
        let amt: number | undefined;
        let cb = callbackUrl;
        let sId = studentId;
        let em = email;

        if (typeof amountOrOptions === 'object' && amountOrOptions !== null) {
            amt = amountOrOptions.amount;
            cb = amountOrOptions.callbackUrl || cb;
            sId = amountOrOptions.studentId || sId;
            em = amountOrOptions.email || em;
        } else if (typeof amountOrOptions === 'number') {
            amt = amountOrOptions;
        }

        return this.http.post<{ authorization_url: string }>(`${this.apiUrl}/initialize`, {
            fiscal_record_id: fiscalRecordId,
            student_id: sId,
            amount: amt,
            email: em,
            callback_url: cb
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
