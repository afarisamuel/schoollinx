import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/finance_models.dart';

abstract class FinanceRemoteDataSource {
  Future<FiscalSummaryModel> getFiscalSummary();
  Future<List<FeeRecordModel>> getFeeRecords({String? studentId, String? status});
  Future<PaymentResponseModel> initializePayment({
    required double amount,
    required String email,
    required String feeRecordId,
    required String channel,
  });
  Future<bool> verifyPayment(String reference);
  Future<List<FeeRecordModel>> getDefaulters();
  Future<void> sendDefaultersDunningSms({
    required List<String> studentIds,
    required String messageTemplate,
  });
}

class FinanceRemoteDataSourceImpl implements FinanceRemoteDataSource {
  final ApiClient apiClient;

  FinanceRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<FiscalSummaryModel> getFiscalSummary() async {
    try {
      final response = await apiClient.dio.get('/fiscal/summary');
      final data = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      return FiscalSummaryModel.fromJson(data);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch fiscal summary: $e');
    }
  }

  @override
  Future<List<FeeRecordModel>> getFeeRecords({String? studentId, String? status}) async {
    try {
      String endpoint = '/fiscal/records';
      if (studentId != null) {
        endpoint = '/fiscal/students/$studentId';
      }
      final response = await apiClient.dio.get(endpoint, queryParameters: {
        ...?status == null ? null : {'status': status},
      });

      if (response.data is List) {
        return (response.data as List).map((e) => FeeRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      } else if (response.data is Map && response.data['records'] is List) {
        return (response.data['records'] as List).map((e) => FeeRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch fee records: $e');
    }
  }

  @override
  Future<List<FeeRecordModel>> getDefaulters() async {
    try {
      final response = await apiClient.dio.get('/fiscal/defaulters');
      final data = response.data;
      if (data is Map && data['defaulters'] is List) {
        return (data['defaulters'] as List).map((e) => FeeRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      } else if (data is List) {
        return data.map((e) => FeeRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch fee defaulters: $e');
    }
  }

  @override
  Future<PaymentResponseModel> initializePayment({
    required double amount,
    required String email,
    required String feeRecordId,
    required String channel,
  }) async {
    try {
      final response = await apiClient.dio.post('/payments/initialize', data: {
        'amount': amount,
        'email': email,
        'fee_record_id': feeRecordId,
        'channel': channel,
      });
      return PaymentResponseModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to initialize payment: $e');
    }
  }

  @override
  Future<bool> verifyPayment(String reference) async {
    try {
      final response = await apiClient.dio.get('/payments/verify/$reference');
      return response.statusCode == 200;
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to verify payment: $e');
    }
  }

  @override
  Future<void> sendDefaultersDunningSms({
    required List<String> studentIds,
    required String messageTemplate,
  }) async {
    try {
      await apiClient.dio.post('/fiscal/defaulters/sms', data: {
        'student_ids': studentIds,
        'message_template': messageTemplate,
      });
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to dispatch dunning SMS: $e');
    }
  }
}
