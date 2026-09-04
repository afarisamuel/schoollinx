import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/daily_bill_entity.dart';

class DailyBillRemoteDataSource {
  final ApiClient apiClient;

  DailyBillRemoteDataSource({required this.apiClient});

  Future<List<DailyBillEntity>> getPendingDailyBills({String? routeId, String? classId}) async {
    try {
      String endpoint = '/fiscal/daily-bills/pending';
      if (routeId != null) {
        endpoint = '/fiscal/daily-bills/pending/route/$routeId';
      }
      final response = await apiClient.dio.get(endpoint, queryParameters: {
        ...?classId == null ? null : {'class_id': classId},
      });

      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return DailyBillEntity(
            id: m['id']?.toString() ?? '',
            studentId: m['student_id']?.toString() ?? '',
            studentName: m['student_name'] ?? m['student']?['name'] ?? 'Student',
            className: m['class_name'] ?? m['class']?['name'] ?? 'Class',
            billType: m['bill_type']?.toString().toUpperCase() ?? 'FEEDING',
            amount: (m['amount'] as num?)?.toDouble() ?? 0.0,
            isCollected: m['is_collected'] ?? false,
            billDate: m['bill_date'] != null
                ? DateTime.tryParse(m['bill_date'].toString()) ?? DateTime.now()
                : DateTime.now(),
            collectedBy: m['collected_by']?.toString(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch pending daily bills: $e');
    }
  }

  Future<List<DailyBillEntity>> getMyCollections() async {
    try {
      final response = await apiClient.dio.get('/fiscal/daily-bills/my-collections');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return DailyBillEntity(
            id: m['id']?.toString() ?? '',
            studentId: m['student_id']?.toString() ?? '',
            studentName: m['student_name'] ?? m['student']?['name'] ?? 'Student',
            className: m['class_name'] ?? m['class']?['name'] ?? 'Class',
            billType: m['bill_type']?.toString().toUpperCase() ?? 'FEEDING',
            amount: (m['amount'] as num?)?.toDouble() ?? 0.0,
            isCollected: true,
            billDate: m['bill_date'] != null
                ? DateTime.tryParse(m['bill_date'].toString()) ?? DateTime.now()
                : DateTime.now(),
            collectedBy: m['collected_by']?.toString(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch my daily collections: $e');
    }
  }

  Future<void> collectDailyBill({required String billId, required String paymentMethod}) async {
    try {
      await apiClient.dio.post('/fiscal/daily-bills/$billId/collect', data: {
        'payment_method': paymentMethod,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to collect daily bill: $e');
    }
  }

  Future<ShiftReconciliationEntity> reconcileShift({
    required double physicalCashCounted,
    required String notes,
  }) async {
    try {
      final response = await apiClient.dio.post('/fiscal/daily-bills/reconcile', data: {
        'physical_cash_counted': physicalCashCounted,
        'notes': notes,
      });
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      final recorded = (m['system_recorded_total'] as num?)?.toDouble() ?? 0.0;
      final variance = physicalCashCounted - recorded;
      return ShiftReconciliationEntity(
        shiftId: m['shift_id']?.toString() ?? 'SH-001',
        shiftDate: DateTime.now(),
        physicalCashCounted: physicalCashCounted,
        systemRecordedTotal: recorded,
        variance: variance,
        status: variance.abs() < 0.01 ? 'BALANCED' : 'VARIANCE_FLAGGED',
        cashierName: m['cashier_name']?.toString() ?? 'Cashier',
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to reconcile shift: $e');
    }
  }
}
