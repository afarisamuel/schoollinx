import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/academic_class_entity.dart';
import '../entities/academic_extra_entities.dart';
import '../entities/attendance_record.dart';
import '../entities/grade_record.dart';
import '../entities/homework_entity.dart';
import '../entities/student_entity.dart';
import '../entities/teacher_entity.dart';
import '../entities/timetable_entry_entity.dart';

abstract class AcademicRepository {
  Future<Either<Failure, List<AcademicClassEntity>>> getClasses();
  Future<Either<Failure, List<StudentEntity>>> getStudentsByClass(String classId);
  Future<Either<Failure, List<StudentEntity>>> getAllStudents();
  Future<Either<Failure, List<TeacherEntity>>> getAllTeachers();
  Future<Either<Failure, void>> markBulkAttendance(List<AttendanceRecord> records);
  Future<Either<Failure, void>> saveGrades(List<GradeRecord> records);
  Future<Either<Failure, List<HomeworkEntity>>> getHomeworkByClass(String classId);
  Future<Either<Failure, void>> createHomework({
    required String title,
    required String description,
    required String subject,
    required String classId,
    required DateTime dueDate,
    int maxScore,
  });
  Future<Either<Failure, List<HomeworkSubmissionEntity>>> getHomeworkSubmissions(String homeworkId);
  Future<Either<Failure, void>> gradeHomeworkSubmission({
    required String submissionId,
    required double score,
    required String feedback,
  });
  Future<Either<Failure, void>> submitHomework({
    required String homeworkId,
    required String studentId,
    required String content,
    String? fileUrl,
  });
  Future<Either<Failure, List<TimetableEntryEntity>>> getClassTimetable(String classId);
  Future<Either<Failure, List<TimetableEntryEntity>>> getTeacherTimetable(String teacherId);
  Future<Either<Failure, List<LibraryBookEntity>>> getLibraryBooks();
  Future<Either<Failure, List<CBTQuizEntity>>> getCBTQuizzes(String classId);
}
