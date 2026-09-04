import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/clinic_visit_model.dart';

abstract class WelfareRemoteDataSource {
  Future<List<ClinicVisitModel>> getStudentClinicVisits(String studentId);
  Future<List<ClinicVisitModel>> getActiveClinicVisits();
  Future<ClinicVisitModel> logClinicVisit(Map<String, dynamic> data);
  Future<List<HostelRoomModel>> getHostelRooms();
}

class WelfareRemoteDataSourceImpl implements WelfareRemoteDataSource {
  final ApiClient apiClient;
  WelfareRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<ClinicVisitModel>> getStudentClinicVisits(String studentId) async {
    try {
      final response = await apiClient.dio.get('/welfare/clinic/students/$studentId');
      final data = response.data;
      if (data is List) {
        return data.map((e) => ClinicVisitModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch student clinic visits: $e');
    }
  }

  @override
  Future<List<ClinicVisitModel>> getActiveClinicVisits() async {
    try {
      final response = await apiClient.dio.get('/welfare/clinic/active');
      final data = response.data;
      if (data is List) {
        return data.map((e) => ClinicVisitModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch active clinic visits: $e');
    }
  }

  @override
  Future<ClinicVisitModel> logClinicVisit(Map<String, dynamic> data) async {
    try {
      final response = await apiClient.dio.post('/welfare/clinic/visits', data: data);
      return ClinicVisitModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to log clinic visit: $e');
    }
  }

  @override
  Future<List<HostelRoomModel>> getHostelRooms() async {
    try {
      final response = await apiClient.dio.get('/hostels/rooms');
      final data = response.data;
      if (data is List) {
        return data.map((e) => HostelRoomModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch hostel rooms: $e');
    }
  }
}
