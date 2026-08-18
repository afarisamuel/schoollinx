import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChartData {
    name: string;
    value: number;
}

export interface AttendanceStats {
    present: number;
    absent: number;
    tardy: number;
}

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskAlert {
    student_id: string;
    student_name: string;
    level: RiskLevel;
    grade_avg: number;
    attendance_pct: number;
    risk_score: number;
    reasons: string[];
}

export interface AttendanceAnomaly {
    student_id: string;
    student_name: string;
    anomaly_type: 'CRITICAL_ABSENCE' | 'CONSECUTIVE_ABSENCE';
    description: string;
    date_detected: string;
    severity: RiskLevel;
}

export interface ResourceHeatmap {
    room_name: string;
    day_of_week: number;
    hour_of_day: number;
    utilization: number;
}

export interface DemographicsStats {
    total_students: number;
    male: number;
    female: number;
    other: number;
    active: number;
    alumni: number;
    withdrawn: number;
}

// Legacy alias kept for backward compat
export type HeatmapData = ResourceHeatmap;

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private http = inject(HttpClient);
    private apiUrl = '/api/analytics';

    getAttendanceStats(): Observable<AttendanceStats> {
        return this.http.get<AttendanceStats>(`${this.apiUrl}/attendance`);
    }

    getGradeDistribution(): Observable<ChartData[]> {
        return this.http.get<ChartData[]>(`${this.apiUrl}/grades`);
    }

    getRiskAlerts(): Observable<RiskAlert[]> {
        return this.http.get<RiskAlert[]>(`${this.apiUrl}/risk-alerts`);
    }

    getResourceHeatmap(): Observable<ResourceHeatmap[]> {
        return this.http.get<ResourceHeatmap[]>(`${this.apiUrl}/heatmap`);
    }

    getDemographics(): Observable<DemographicsStats> {
        return this.http.get<DemographicsStats>(`${this.apiUrl}/demographics`);
    }

    getAttendanceAnomalies(): Observable<AttendanceAnomaly[]> {
        return this.http.get<AttendanceAnomaly[]>(`${this.apiUrl}/anomalies`);
    }

    downloadExecutiveReport(): void {
        window.open(`${this.apiUrl}/executive-report`, '_blank');
    }
}
