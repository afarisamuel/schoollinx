import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StudentService } from '../infrastructure/student/student.service';
import { Student } from '../domain/student.model';

/**
 * Use-case layer for student operations.
 * Components should depend on this instead of StudentService directly.
 */
@Injectable({ providedIn: 'root' })
export class StudentUseCases {
    constructor(private studentService: StudentService) { }

    getAllStudents(): Observable<Student[]> {
        return this.studentService.getStudents();
    }

    getStudentById(id: string): Observable<Student> {
        return this.studentService.getStudent(id);
    }

    createStudent(student: Student): Observable<Student> {
        return this.studentService.createStudent(student);
    }

    updateStudent(id: string, student: Student): Observable<Student> {
        return this.studentService.updateStudent(id, student);
    }

    deleteStudent(id: string): Observable<any> {
        return this.studentService.deleteStudent(id);
    }
}
