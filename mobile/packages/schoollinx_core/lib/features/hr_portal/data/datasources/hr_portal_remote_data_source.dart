import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/staff_leave_model.dart';

abstract class HrPortalRemoteDataSource {
  Future<List<StaffLeaveModel>> getMyLeaveApplications();
  Future<StaffLeaveModel> applyForLeave(Map<String, dynamic> data);
  Future<List<PayslipModel>> getMyPayslips();
}

class HrPortalRemoteDataSourceImpl implements HrPortalRemoteDataSource {
  final ApiClient apiClient;
  HrPortalRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<StaffLeaveModel>> getMyLeaveApplications() async {
    try {
      final response = await apiClient.dio.get('/hr/leave/mine');
      final data = response.data;
      if (data is List) {
        return data.map((e) => StaffLeaveModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch staff leaves: $e');
    }
  }

  @override
  Future<StaffLeaveModel> applyForLeave(Map<String, dynamic> data) async {
    try {
      final response = await apiClient.dio.post('/hr/leave/apply', data: data);
      return StaffLeaveModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to submit leave application: $e');
    }
  }

  @override
  Future<List<PayslipModel>> getMyPayslips() async {
    try {
      final response = await apiClient.dio.get('/hr/payslips/mine');
      final data = response.data;
      if (data is List) {
        return data.map((e) => PayslipModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch payslips: $e');
    }
  }
}
