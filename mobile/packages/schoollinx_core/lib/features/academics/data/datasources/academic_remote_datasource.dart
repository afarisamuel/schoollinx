import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../domain/entities/academic_class_entity.dart';
import '../../domain/entities/academic_extra_entities.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/student_entity.dart';
import '../../domain/entities/teacher_entity.dart';
import '../models/homework_model.dart';
import '../models/timetable_model.dart';

abstract class AcademicRemoteDataSource {
  Future<List<AcademicClassEntity>> getClasses();
  Future<List<StudentEntity>> getStudentsByClass(String classId);
  Future<List<StudentEntity>> getAllStudents();
  Future<List<TeacherEntity>> getAllTeachers();
  Future<void> markBulkAttendance(List<AttendanceRecord> records);
  Future<void> saveGrades(List<GradeRecord> records);
  Future<List<HomeworkModel>> getHomeworkByClass(String classId);
  Future<void> createHomework({
    required String title,
    required String description,
    required String subject,
    required String classId,
    required DateTime dueDate,
    int maxScore,
  });
  Future<List<HomeworkSubmissionEntity>> getHomeworkSubmissions(String homeworkId);
  Future<void> gradeHomeworkSubmission({
    required String submissionId,
    required double score,
    required String feedback,
  });
  Future<void> submitHomework({
    required String homeworkId,
    required String studentId,
    required String content,
    String? fileUrl,
  });
  Future<List<TimetableModel>> getClassTimetable(String classId);
  Future<List<TimetableModel>> getTeacherTimetable(String teacherId);
  Future<List<LibraryBookEntity>> getLibraryBooks();
  Future<List<CBTQuizEntity>> getCBTQuizzes(String classId);
}

class AcademicRemoteDataSourceImpl implements AcademicRemoteDataSource {
  final ApiClient apiClient;

  AcademicRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<AcademicClassEntity>> getClasses() async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.classes);
      final data = response.data;

      if (data is List) {
        return data.map((json) {
          final map = json as Map<String, dynamic>;
          final scholastic = map['scholastic_level'] is Map ? map['scholastic_level']['name'] : null;
          return AcademicClassEntity(
            id: map['id']?.toString() ?? '',
            name: map['name']?.toString() ?? 'Class',
            teacherId: map['teacher_id']?.toString(),
            scholasticLevelId: map['scholastic_level_id']?.toString(),
            scholasticLevelName: scholastic,
            studentsCount: map['students_count'] is int ? map['students_count'] : 0,
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch classes: $e');
    }
  }

  @override
  Future<List<StudentEntity>> getStudentsByClass(String classId) async {
    try {
      final response = await apiClient.dio.get('/students/class/$classId');
      final data = response.data;

      if (data is List) {
        return data.map((json) {
          final map = json as Map<String, dynamic>;
          return StudentEntity(
            id: map['id']?.toString() ?? '',
            firstName: map['first_name']?.toString() ?? '',
            lastName: map['last_name']?.toString() ?? '',
            otherName: map['other_name']?.toString(),
            enrollmentNum: map['enrollment_num']?.toString() ?? map['enrollment_number']?.toString(),
            classId: map['class_id']?.toString() ?? classId,
            className: map['class_name']?.toString(),
            status: map['status']?.toString() ?? 'ACTIVE',
            gender: map['gender']?.toString(),
            phone: map['phone_number']?.toString(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch students by class: $e');
    }
  }

  @override
  Future<List<StudentEntity>> getAllStudents() async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.students);
      final data = response.data;

      List list = [];
      if (data is List) {
        list = data;
      } else if (data is Map && data['data'] is List) {
        list = data['data'];
      } else if (data is Map && data['students'] is List) {
        list = data['students'];
      }

      return list.map((json) {
        final map = json as Map<String, dynamic>;
        return StudentEntity(
          id: map['id']?.toString() ?? '',
          firstName: map['first_name']?.toString() ?? '',
          lastName: map['last_name']?.toString() ?? '',
          otherName: map['other_name']?.toString(),
          enrollmentNum: map['enrollment_num']?.toString() ?? map['enrollment_number']?.toString(),
          classId: map['class_id']?.toString(),
          className: map['class_name']?.toString(),
          status: map['status']?.toString() ?? 'ACTIVE',
          gender: map['gender']?.toString(),
          phone: map['phone_number']?.toString(),
        );
      }).toList();
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch students: $e');
    }
  }

  @override
  Future<List<TeacherEntity>> getAllTeachers() async {
    try {
      final response = await apiClient.dio.get('/teachers');
      final data = response.data;

      List list = [];
      if (data is List) {
        list = data;
      } else if (data is Map && data['teachers'] is List) {
        list = data['teachers'];
      } else if (data is Map && data['data'] is List) {
        list = data['data'];
      }

      return list.map((json) {
        final map = json as Map<String, dynamic>;
        List<String> subjectList = [];
        if (map['subjects'] is List) {
          subjectList = (map['subjects'] as List).map((s) {
            if (s is Map) return s['name']?.toString() ?? '';
            return s.toString();
          }).where((s) => s.isNotEmpty).toList();
        }

        return TeacherEntity(
          id: map['id']?.toString() ?? '',
          firstName: map['first_name']?.toString() ?? '',
          lastName: map['last_name']?.toString() ?? '',
          email: map['email']?.toString(),
          phoneNumber: map['phone_number']?.toString(),
          subjects: subjectList,
          role: map['role']?.toString() ?? 'Faculty Member',
        );
      }).toList();
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch teachers: $e');
    }
  }

  @override
  Future<void> markBulkAttendance(List<AttendanceRecord> records) async {
    try {
      final payload = records.map((r) => r.toJson()).toList();
      await apiClient.dio.post('${ApiEndpoints.attendance}/bulk', data: payload);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to submit attendance: $e');
    }
  }

  @override
  Future<void> saveGrades(List<GradeRecord> records) async {
    try {
      final payload = records.map((r) => r.toJson()).toList();
      await apiClient.dio.post('${ApiEndpoints.grades}/bulk', data: payload);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to submit grades: $e');
    }
  }

  @override
  Future<List<HomeworkModel>> getHomeworkByClass(String classId) async {
    try {
      final response = await apiClient.dio.get('/homework/class/$classId');
      final data = response.data;
      if (data is List) {
        return data.map((j) => HomeworkModel.fromJson(j as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch homework: $e');
    }
  }

  @override
  Future<void> createHomework({
    required String title,
    required String description,
    required String subject,
    required String classId,
    required DateTime dueDate,
    int maxScore = 100,
  }) async {
    try {
      await apiClient.dio.post('/homework', data: {
        'title': title,
        'description': description,
        'subject': subject,
        'class_id': classId,
        'due_date': dueDate.toIso8601String(),
        'max_score': maxScore,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to create homework: $e');
    }
  }

  @override
  Future<List<HomeworkSubmissionEntity>> getHomeworkSubmissions(String homeworkId) async {
    try {
      final response = await apiClient.dio.get('/homework/$homeworkId/submissions');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return HomeworkSubmissionEntity(
            id: m['id']?.toString() ?? '',
            homeworkId: homeworkId,
            studentId: m['student_id']?.toString() ?? '',
            studentName: m['student_name'] ?? m['student']?['name'] ?? 'Student',
            className: m['class_name'] ?? '',
            content: m['content']?.toString() ?? '',
            fileUrl: m['file_url']?.toString(),
            submittedAt: m['created_at'] != null
                ? DateTime.tryParse(m['created_at'].toString()) ?? DateTime.now()
                : DateTime.now(),
            score: (m['score'] as num?)?.toDouble(),
            feedback: m['feedback']?.toString(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch submissions: $e');
    }
  }

  @override
  Future<void> gradeHomeworkSubmission({
    required String submissionId,
    required double score,
    required String feedback,
  }) async {
    try {
      await apiClient.dio.put('/homework/submissions/$submissionId/grade', data: {
        'score': score,
        'feedback': feedback,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to grade submission: $e');
    }
  }

  @override
  Future<void> submitHomework({
    required String homeworkId,
    required String studentId,
    required String content,
    String? fileUrl,
  }) async {
    try {
      await apiClient.dio.post('/homework/$homeworkId/submissions', data: {
        'student_id': studentId,
        'content': content,
        ...?fileUrl == null ? null : {'file_url': fileUrl},
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to submit homework: $e');
    }
  }

  @override
  Future<List<TimetableModel>> getClassTimetable(String classId) async {
    try {
      final response = await apiClient.dio.get('/timetable/class/$classId');
      final data = response.data;
      if (data is List) {
        return data.map((j) => TimetableModel.fromJson(j as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch class timetable: $e');
    }
  }

  @override
  Future<List<TimetableModel>> getTeacherTimetable(String teacherId) async {
    try {
      final response = await apiClient.dio.get('/timetable/teacher/$teacherId');
      final data = response.data;
      if (data is List) {
        return data.map((j) => TimetableModel.fromJson(j as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch teacher timetable: $e');
    }
  }

  @override
  Future<List<LibraryBookEntity>> getLibraryBooks() async {
    try {
      final response = await apiClient.dio.get('/library/books');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return LibraryBookEntity(
            id: m['id']?.toString() ?? '',
            title: m['title']?.toString() ?? 'Book',
            author: m['author']?.toString() ?? 'Unknown Author',
            isbn: m['isbn']?.toString() ?? '',
            category: m['category']?.toString() ?? 'General',
            isAvailable: m['is_available'] ?? true,
            copiesAvailable: (m['copies_available'] as num?)?.toInt() ?? 1,
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch library books: $e');
    }
  }

  @override
  Future<List<CBTQuizEntity>> getCBTQuizzes(String classId) async {
    try {
      final response = await apiClient.dio.get('/cbt/quizzes', queryParameters: {
        'class_id': classId,
      });
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return CBTQuizEntity(
            id: m['id']?.toString() ?? '',
            title: m['title']?.toString() ?? 'Online Quiz',
            subject: m['subject']?.toString() ?? 'General',
            durationMinutes: (m['duration_minutes'] as num?)?.toInt() ?? 30,
            totalQuestions: (m['total_questions'] as num?)?.toInt() ?? 20,
            isCompleted: m['is_completed'] ?? false,
            scorePercentage: (m['score_percentage'] as num?)?.toDouble(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch quizzes: $e');
    }
  }
}
