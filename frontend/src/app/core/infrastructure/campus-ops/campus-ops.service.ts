import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LostAndFoundItem {
    id: string;
    item_name: string;
    description: string;
    category: string;
    found_location: string;
    date_found: string;
    status: string;
    reported_by_id?: string;
    claimed_by_id?: string;
    date_claimed?: string;
    created_at: string;
}

export interface VisitorLog {
    id: string;
    name: string;
    phone: string;
    purpose: string;
    host_id: string;
    check_in: string;
    check_out?: string;
    status: string;
    badge_number?: string;
    created_at: string;
}

export interface DisciplinaryIncident {
    id: string;
    student_id: string;
    reported_by_id: string;
    incident_date: string;
    incident_type: string;
    description: string;
    action_taken: string;
    status: string;
    points_deducted: number;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class CampusOpsService {
    private apiUrl = environment.apiUrl + '/campus-ops';

    constructor(private http: HttpClient) {}

    // Lost and Found
    reportLostItem(item: Partial<LostAndFoundItem>): Observable<LostAndFoundItem> {
        return this.http.post<LostAndFoundItem>(`${this.apiUrl}/lost-and-found`, item);
    }

    claimLostItem(id: string, claimedById: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/lost-and-found/${id}/claim`, { claimed_by_id: claimedById });
    }

    getLostItems(): Observable<LostAndFoundItem[]> {
        return this.http.get<LostAndFoundItem[]>(`${this.apiUrl}/lost-and-found`);
    }

    // Visitors
    signInVisitor(log: Partial<VisitorLog>): Observable<VisitorLog> {
        return this.http.post<VisitorLog>(`${this.apiUrl}/visitors`, log);
    }

    signOutVisitor(id: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/visitors/${id}/sign-out`, {});
    }

    getActiveVisitors(): Observable<VisitorLog[]> {
        return this.http.get<VisitorLog[]>(`${this.apiUrl}/visitors/active`);
    }

    // Disciplinary
    reportIncident(incident: Partial<DisciplinaryIncident>): Observable<DisciplinaryIncident> {
        return this.http.post<DisciplinaryIncident>(`${this.apiUrl}/disciplinary`, incident);
    }

    resolveIncident(id: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/disciplinary/${id}/resolve`, {});
    }

    getStudentIncidents(studentId: string): Observable<DisciplinaryIncident[]> {
        return this.http.get<DisciplinaryIncident[]>(`${this.apiUrl}/disciplinary/student/${studentId}`);
    }
}
