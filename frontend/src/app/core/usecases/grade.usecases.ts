import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GradeService } from '../infrastructure/grade/grade.service';
import { Grade } from '../domain/grade.model';

/**
 * Use-case layer for grade operations.
 * Components should depend on this instead of GradeService directly.
 */
@Injectable({ providedIn: 'root' })
export class GradeUseCases {
    constructor(private gradeService: GradeService) { }

    getGradesForStudent(studentId: string): Observable<Grade[]> {
        return this.gradeService.getGradesForStudent(studentId);
    }

    getGradeById(id: string): Observable<Grade> {
        return this.gradeService.getGrade(id);
    }

    addGrade(grade: Grade): Observable<Grade> {
        return this.gradeService.addGrade(grade);
    }

    updateGrade(id: string, grade: Grade): Observable<Grade> {
        return this.gradeService.updateGrade(id, grade);
    }

    deleteGrade(id: string): Observable<any> {
        return this.gradeService.deleteGrade(id);
    }
}
