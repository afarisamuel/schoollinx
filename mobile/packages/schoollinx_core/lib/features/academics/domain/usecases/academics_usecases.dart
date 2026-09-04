import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/academic_class_entity.dart';
import '../entities/academic_extra_entities.dart';
import '../entities/attendance_record.dart';
import '../entities/grade_record.dart';
import '../entities/homework_entity.dart';
import '../entities/student_entity.dart';
import '../entities/teacher_entity.dart';
import '../entities/timetable_entry_entity.dart';
import '../repositories/academic_repository.dart';

class GetClassesUseCase implements UseCase<List<AcademicClassEntity>, NoParams> {
  final AcademicRepository repository;
  GetClassesUseCase(this.repository);
  @override
  Future<Either<Failure, List<AcademicClassEntity>>> call(NoParams params) {
    return repository.getClasses();
  }
}

class GetStudentsByClassUseCase implements UseCase<List<StudentEntity>, String> {
  final AcademicRepository repository;
  GetStudentsByClassUseCase(this.repository);
  @override
  Future<Either<Failure, List<StudentEntity>>> call(String classId) {
    return repository.getStudentsByClass(classId);
  }
}

class GetAllStudentsUseCase implements UseCase<List<StudentEntity>, NoParams> {
  final AcademicRepository repository;
  GetAllStudentsUseCase(this.repository);
  @override
  Future<Either<Failure, List<StudentEntity>>> call(NoParams params) {
    return repository.getAllStudents();
  }
}

class GetAllTeachersUseCase implements UseCase<List<TeacherEntity>, NoParams> {
  final AcademicRepository repository;
  GetAllTeachersUseCase(this.repository);
  @override
  Future<Either<Failure, List<TeacherEntity>>> call(NoParams params) {
    return repository.getAllTeachers();
  }
}

class MarkBulkAttendanceUseCase implements UseCase<void, List<AttendanceRecord>> {
  final AcademicRepository repository;
  MarkBulkAttendanceUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(List<AttendanceRecord> records) {
    return repository.markBulkAttendance(records);
  }
}

class SaveGradesUseCase implements UseCase<void, List<GradeRecord>> {
  final AcademicRepository repository;
  SaveGradesUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(List<GradeRecord> records) {
    return repository.saveGrades(records);
  }
}

class GetHomeworkByClassUseCase implements UseCase<List<HomeworkEntity>, String> {
  final AcademicRepository repository;
  GetHomeworkByClassUseCase(this.repository);
  @override
  Future<Either<Failure, List<HomeworkEntity>>> call(String classId) {
    return repository.getHomeworkByClass(classId);
  }
}

class CreateHomeworkParams {
  final String title;
  final String description;
  final String subject;
  final String classId;
  final DateTime dueDate;
  final int maxScore;

  CreateHomeworkParams({
    required this.title,
    required this.description,
    required this.subject,
    required this.classId,
    required this.dueDate,
    this.maxScore = 100,
  });
}

class CreateHomeworkUseCase implements UseCase<void, CreateHomeworkParams> {
  final AcademicRepository repository;
  CreateHomeworkUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(CreateHomeworkParams params) {
    return repository.createHomework(
      title: params.title,
      description: params.description,
      subject: params.subject,
      classId: params.classId,
      dueDate: params.dueDate,
      maxScore: params.maxScore,
    );
  }
}

class GetHomeworkSubmissionsUseCase implements UseCase<List<HomeworkSubmissionEntity>, String> {
  final AcademicRepository repository;
  GetHomeworkSubmissionsUseCase(this.repository);
  @override
  Future<Either<Failure, List<HomeworkSubmissionEntity>>> call(String homeworkId) {
    return repository.getHomeworkSubmissions(homeworkId);
  }
}

class GradeHomeworkSubmissionParams {
  final String submissionId;
  final double score;
  final String feedback;

  GradeHomeworkSubmissionParams({
    required this.submissionId,
    required this.score,
    required this.feedback,
  });
}

class GradeHomeworkSubmissionUseCase implements UseCase<void, GradeHomeworkSubmissionParams> {
  final AcademicRepository repository;
  GradeHomeworkSubmissionUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(GradeHomeworkSubmissionParams params) {
    return repository.gradeHomeworkSubmission(
      submissionId: params.submissionId,
      score: params.score,
      feedback: params.feedback,
    );
  }
}

class SubmitHomeworkParams {
  final String homeworkId;
  final String studentId;
  final String content;
  final String? fileUrl;

  SubmitHomeworkParams({
    required this.homeworkId,
    required this.studentId,
    required this.content,
    this.fileUrl,
  });
}

class SubmitHomeworkUseCase implements UseCase<void, SubmitHomeworkParams> {
  final AcademicRepository repository;
  SubmitHomeworkUseCase(this.repository);
  @override
  Future<Either<Failure, void>> call(SubmitHomeworkParams params) {
    return repository.submitHomework(
      homeworkId: params.homeworkId,
      studentId: params.studentId,
      content: params.content,
      fileUrl: params.fileUrl,
    );
  }
}

class GetClassTimetableUseCase implements UseCase<List<TimetableEntryEntity>, String> {
  final AcademicRepository repository;
  GetClassTimetableUseCase(this.repository);
  @override
  Future<Either<Failure, List<TimetableEntryEntity>>> call(String classId) {
    return repository.getClassTimetable(classId);
  }
}

class GetTeacherTimetableUseCase implements UseCase<List<TimetableEntryEntity>, String> {
  final AcademicRepository repository;
  GetTeacherTimetableUseCase(this.repository);
  @override
  Future<Either<Failure, List<TimetableEntryEntity>>> call(String teacherId) {
    return repository.getTeacherTimetable(teacherId);
  }
}

class GetLibraryBooksUseCase implements UseCase<List<LibraryBookEntity>, NoParams> {
  final AcademicRepository repository;
  GetLibraryBooksUseCase(this.repository);
  @override
  Future<Either<Failure, List<LibraryBookEntity>>> call(NoParams params) {
    return repository.getLibraryBooks();
  }
}

class GetCBTQuizzesUseCase implements UseCase<List<CBTQuizEntity>, String> {
  final AcademicRepository repository;
  GetCBTQuizzesUseCase(this.repository);
  @override
  Future<Either<Failure, List<CBTQuizEntity>>> call(String classId) {
    return repository.getCBTQuizzes(classId);
  }
}
