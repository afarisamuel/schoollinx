import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TeacherService } from '../infrastructure/teacher/teacher.service';
import { Teacher } from '../domain/teacher.model';

/**
 * Use-case layer for teacher operations.
 * Components should depend on this instead of TeacherService directly.
 */
@Injectable({ providedIn: 'root' })
export class TeacherUseCases {
    constructor(private teacherService: TeacherService) { }

    getAllTeachers(): Observable<Teacher[]> {
        return this.teacherService.getTeachers();
    }

    getTeacherById(id: string): Observable<Teacher> {
        return this.teacherService.getTeacher(id);
    }

    createTeacher(teacher: Teacher): Observable<Teacher> {
        return this.teacherService.createTeacher(teacher);
    }

    updateTeacher(id: string, teacher: Teacher): Observable<Teacher> {
        return this.teacherService.updateTeacher(id, teacher);
    }

    deleteTeacher(id: string): Observable<any> {
        return this.teacherService.deleteTeacher(id);
    }
}
