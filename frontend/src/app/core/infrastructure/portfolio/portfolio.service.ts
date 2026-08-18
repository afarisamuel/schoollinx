import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StudentPortfolio {
    id?: string;
    student_id: string;
    bio: string;
    ambition: string;
    skills: string;
    languages: string;
    hobbies_json: string;
    achievements?: PortfolioAchievement[];
}

export interface PortfolioAchievement {
    id?: string;
    portfolio_id?: string;
    category: string;
    title: string;
    description: string;
    date_earned: string;
    issuer: string;
}

@Injectable({
    providedIn: 'root'
})
export class PortfolioService {
    private http = inject(HttpClient);

    getPortfolio(studentId: string): Observable<StudentPortfolio> {
        return this.http.get<StudentPortfolio>(`/api/students/${studentId}/portfolio`);
    }

    savePortfolio(studentId: string, portfolio: Partial<StudentPortfolio>): Observable<any> {
        return this.http.put(`/api/students/${studentId}/portfolio`, portfolio);
    }

    addAchievement(studentId: string, achievement: Partial<PortfolioAchievement>): Observable<PortfolioAchievement> {
        return this.http.post<PortfolioAchievement>(`/api/students/${studentId}/portfolio/achievements`, achievement);
    }

    deleteAchievement(studentId: string, achievementId: string): Observable<any> {
        return this.http.delete(`/api/students/${studentId}/portfolio/achievements/${achievementId}`);
    }
}
