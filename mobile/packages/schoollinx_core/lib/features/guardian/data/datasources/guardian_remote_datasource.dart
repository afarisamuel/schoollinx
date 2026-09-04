import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../../finance/domain/entities/finance_entities.dart';
import '../../../finance/data/models/finance_models.dart';
import '../../domain/entities/child_entity.dart';
import '../../domain/entities/guardian_extra_entities.dart';

class GuardianRemoteDataSource {
  final ApiClient apiClient;

  GuardianRemoteDataSource({required this.apiClient});

  Future<List<ChildEntity>> getChildren() async {
    try {
      final response = await apiClient.dio.get('/guardian/children');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return ChildEntity(
            id: m['id']?.toString() ?? '',
            firstName: m['first_name']?.toString() ?? '',
            lastName: m['last_name']?.toString() ?? '',
            className: m['class_name']?.toString() ?? '',
            enrollmentNum: m['enrollment_num']?.toString() ?? m['enrollment_number']?.toString() ?? '',
            attendancePercent: '${m['attendance_rate'] ?? 0}%',
            outstandingFees: (m['outstanding_fees'] as num?)?.toDouble() ?? 0.0,
            busRouteName: m['bus_route_name']?.toString(),
            busStatus: m['bus_status']?.toString() ?? 'AT_SCHOOL',
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch children: $e');
    }
  }

  Future<Map<String, dynamic>> getChildAcademics(String studentId) async {
    try {
      final response = await apiClient.dio.get('/guardian/child/$studentId/academics');
      return response.data is Map<String, dynamic> ? response.data : {};
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch child academics: $e');
    }
  }

  Future<List<FeeRecordEntity>> getFamilyLedger() async {
    try {
      final response = await apiClient.dio.get('/guardian/family-ledger');
      final data = response.data;
      if (data is List) {
        return data.map((e) => FeeRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch family ledger: $e');
    }
  }

  Future<PickupPassEntity> getPickupPass(String childId) async {
    try {
      final response = await apiClient.dio.get('/guardian/pickup-pass', queryParameters: {
        'child_id': childId,
      });
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      return PickupPassEntity(
        guardianName: m['guardian_name'] ?? 'Guardian',
        childName: m['child_name'] ?? 'Student',
        childClassName: m['child_class_name'] ?? '',
        code: m['code'] ?? '',
        expiresAt: m['expires_at'] != null
            ? DateTime.tryParse(m['expires_at'].toString()) ?? DateTime.now().add(const Duration(minutes: 30))
            : DateTime.now().add(const Duration(minutes: 30)),
        qrData: m['qr_data'] ?? 'SLX-PICKUP-$childId',
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch pickup pass: $e');
    }
  }

  Future<String> generatePickupOTP(String childId) async {
    try {
      final response = await apiClient.dio.post('/guardian/pickup-pass/otp', data: {'child_id': childId});
      return response.data['otp']?.toString() ?? '';
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to generate pickup OTP: $e');
    }
  }

  Future<List<AbsenceRequestEntity>> getAbsenceRequests() async {
    try {
      final response = await apiClient.dio.get('/guardian/absence-requests');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return AbsenceRequestEntity(
            id: m['id']?.toString() ?? '',
            studentId: m['student_id']?.toString() ?? '',
            studentName: m['student_name']?.toString() ?? 'Student',
            reason: m['reason']?.toString() ?? '',
            startDate: DateTime.tryParse(m['start_date']?.toString() ?? '') ?? DateTime.now(),
            endDate: DateTime.tryParse(m['end_date']?.toString() ?? '') ?? DateTime.now(),
            status: m['status']?.toString() ?? 'PENDING',
            reviewNotes: m['review_notes']?.toString(),
            createdAt: DateTime.tryParse(m['created_at']?.toString() ?? '') ?? DateTime.now(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch absence requests: $e');
    }
  }

  Future<void> submitAbsenceRequest({
    required String studentId,
    required String reason,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      await apiClient.dio.post('/guardian/absence-requests', data: {
        'student_id': studentId,
        'reason': reason,
        'start_date': startDate.toIso8601String().split('T')[0],
        'end_date': endDate.toIso8601String().split('T')[0],
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to submit absence request: $e');
    }
  }

  Future<StudentWalletEntity> getStudentWallet(String studentId) async {
    try {
      final response = await apiClient.dio.get('/fiscal/wallet/$studentId');
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      final txList = (m['transactions'] as List?)?.map((t) {
        final tm = t as Map<String, dynamic>;
        return WalletTransactionEntity(
          id: tm['id']?.toString() ?? '',
          amount: (tm['amount'] as num?)?.toDouble() ?? 0.0,
          type: tm['type']?.toString() ?? 'CREDIT',
          description: tm['description']?.toString() ?? 'Wallet activity',
          timestamp: DateTime.tryParse(tm['timestamp']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList() ?? [];

      return StudentWalletEntity(
        studentId: studentId,
        balance: (m['balance'] as num?)?.toDouble() ?? 0.0,
        dailyLimit: (m['daily_limit'] as num?)?.toDouble() ?? 50.0,
        transactions: txList,
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch student wallet: $e');
    }
  }

  Future<void> topupStudentWallet({
    required String studentId,
    required double amount,
    required String paymentMethod,
  }) async {
    try {
      await apiClient.dio.post('/fiscal/wallet/topup/$studentId', data: {
        'amount': amount,
        'payment_method': paymentMethod,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to top up wallet: $e');
    }
  }

  Future<List<TeacherMeetingSlotEntity>> getTeacherMeetingSlots(String teacherId) async {
    try {
      final response = await apiClient.dio.get('/communication/meeting-slots/$teacherId');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return TeacherMeetingSlotEntity(
            id: m['id']?.toString() ?? '',
            teacherId: teacherId,
            teacherName: m['teacher_name']?.toString() ?? 'Teacher',
            startTime: DateTime.tryParse(m['start_time']?.toString() ?? '') ?? DateTime.now(),
            endTime: DateTime.tryParse(m['end_time']?.toString() ?? '') ?? DateTime.now().add(const Duration(minutes: 30)),
            isBooked: m['is_booked'] ?? false,
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch meeting slots: $e');
    }
  }

  Future<void> bookMeeting({
    required String slotId,
    required String guardianId,
    required String notes,
  }) async {
    try {
      await apiClient.dio.post('/communication/meeting-bookings', data: {
        'slot_id': slotId,
        'guardian_id': guardianId,
        'notes': notes,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to book meeting: $e');
    }
  }
}
