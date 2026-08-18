import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../../domain/student.model';

export interface LibraryBook {
    id: string;
    isbn: string;
    barcode: string;
    title: string;
    author: string;
    category: string;
    total_copies: number;
    available_copies: number;
}

export interface LibraryLoan {
    id: string;
    book_id: string;
    student_id: string;
    loan_date: string;
    due_date: string;
    returned_at?: string;
    status: 'LOANED' | 'RETURNED' | 'OVERDUE';
    book?: LibraryBook;
    student?: Student;
}

@Injectable({
    providedIn: 'root'
})
export class LibraryService {
    private http = inject(HttpClient);
    private apiUrl = '/api/library';

    getBooks(query?: string): Observable<LibraryBook[]> {
        let params: any = {};
        if (query) {
            params.q = query;
        }
        return this.http.get<LibraryBook[]>(`${this.apiUrl}/books`, { params });
    }

    addBook(book: Partial<LibraryBook>): Observable<LibraryBook> {
        return this.http.post<LibraryBook>(`${this.apiUrl}/books`, book);
    }

    getActiveLoans(): Observable<LibraryLoan[]> {
        return this.http.get<LibraryLoan[]>(`${this.apiUrl}/active-loans`);
    }

    issueLoan(barcode: string, studentId: string): Observable<LibraryLoan> {
        return this.http.post<LibraryLoan>(`${this.apiUrl}/loans`, {
            barcode: barcode,
            student_id: studentId
        });
    }

    returnBook(loanId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/loans/${loanId}/return`, {});
    }

    auditOverdue(): Observable<any> {
        return this.http.post(`${this.apiUrl}/audit-overdue`, {});
    }
}
