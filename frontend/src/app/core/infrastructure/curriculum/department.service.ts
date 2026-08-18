import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Department {
    id: string;
    name: string;
    head_id?: string;
    head?: any;
}

@Injectable({
    providedIn: 'root'
})
export class DepartmentService {
    private http = inject(HttpClient);
    private apiUrl = '/api/departments';

    getDepartments(): Observable<Department[]> {
        return this.http.get<Department[]>(this.apiUrl);
    }


    createDepartment(dept: Partial<Department>): Observable<Department> {
        return this.http.post<Department>(this.apiUrl, dept);
    }

    updateDepartment(id: string, dept: Partial<Department>): Observable<Department> {
        return this.http.put<Department>(`${this.apiUrl}/${id}`, dept);
    }

    deleteDepartment(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
