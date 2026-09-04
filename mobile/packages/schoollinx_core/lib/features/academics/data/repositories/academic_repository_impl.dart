import 'package:dartz/dartz.dart';
import 'package:schoollinx_core/features/academics/domain/entities/academic_extra_entities.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/academic_class_entity.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/homework_entity.dart';
import '../../domain/entities/student_entity.dart';
import '../../domain/entities/teacher_entity.dart';
import '../../domain/entities/timetable_entry_entity.dart';
import '../../domain/repositories/academic_repository.dart';
import '../datasources/academic_remote_datasource.dart';

class AcademicRepositoryImpl implements AcademicRepository {
  final AcademicRemoteDataSource remoteDataSource;

  AcademicRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<AcademicClassEntity>>> getClasses() async {
    try {
      final result = await remoteDataSource.getClasses();
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<StudentEntity>>> getStudentsByClass(
    String classId,
  ) async {
    try {
      final result = await remoteDataSource.getStudentsByClass(classId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<StudentEntity>>> getAllStudents() async {
    try {
      final result = await remoteDataSource.getAllStudents();
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<TeacherEntity>>> getAllTeachers() async {
    try {
      final result = await remoteDataSource.getAllTeachers();
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> markBulkAttendance(
    List<AttendanceRecord> records,
  ) async {
    try {
      await remoteDataSource.markBulkAttendance(records);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> saveGrades(List<GradeRecord> records) async {
    try {
      await remoteDataSource.saveGrades(records);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<HomeworkEntity>>> getHomeworkByClass(
    String classId,
  ) async {
    try {
      final result = await remoteDataSource.getHomeworkByClass(classId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> submitHomework({
    required String homeworkId,
    required String studentId,
    required String content,
    String? fileUrl,
  }) async {
    try {
      await remoteDataSource.submitHomework(
        homeworkId: homeworkId,
        studentId: studentId,
        content: content,
        fileUrl: fileUrl,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<TimetableEntryEntity>>> getClassTimetable(
    String classId,
  ) async {
    try {
      final result = await remoteDataSource.getClassTimetable(classId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<TimetableEntryEntity>>> getTeacherTimetable(
    String teacherId,
  ) async {
    try {
      final result = await remoteDataSource.getTeacherTimetable(teacherId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> createHomework({
    required String title,
    required String description,
    required String subject,
    required String classId,
    required DateTime dueDate,
    int maxScore = 100,
  }) async {
    try {
      await remoteDataSource.createHomework(
        title: title,
        description: description,
        subject: subject,
        classId: classId,
        dueDate: dueDate,
        maxScore: maxScore,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<HomeworkSubmissionEntity>>>
  getHomeworkSubmissions(String homeworkId) async {
    try {
      final result = await remoteDataSource.getHomeworkSubmissions(homeworkId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> gradeHomeworkSubmission({
    required String submissionId,
    required double score,
    required String feedback,
  }) async {
    try {
      await remoteDataSource.gradeHomeworkSubmission(
        submissionId: submissionId,
        score: score,
        feedback: feedback,
      );
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<LibraryBookEntity>>> getLibraryBooks() async {
    try {
      final result = await remoteDataSource.getLibraryBooks();
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<CBTQuizEntity>>> getCBTQuizzes(
    String classId,
  ) async {
    try {
      final result = await remoteDataSource.getCBTQuizzes(classId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
