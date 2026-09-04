import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/house_merit_model.dart';

abstract class HouseMeritRemoteDataSource {
  Future<List<SchoolHouseModel>> getHouseLeaderboard();
  Future<List<StudentMeritRecordModel>> getStudentMeritHistory(String studentId);
  Future<StudentMeritRecordModel> awardMeritPoints(Map<String, dynamic> data);
}

class HouseMeritRemoteDataSourceImpl implements HouseMeritRemoteDataSource {
  final ApiClient apiClient;
  HouseMeritRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<SchoolHouseModel>> getHouseLeaderboard() async {
    try {
      final response = await apiClient.dio.get('/houses/leaderboard');
      final data = response.data;
      if (data is List) {
        return data.map((e) => SchoolHouseModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch house leaderboard: $e');
    }
  }

  @override
  Future<List<StudentMeritRecordModel>> getStudentMeritHistory(String studentId) async {
    try {
      final response = await apiClient.dio.get('/houses/students/$studentId/merits');
      final data = response.data;
      if (data is List) {
        return data.map((e) => StudentMeritRecordModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch student merit history: $e');
    }
  }

  @override
  Future<StudentMeritRecordModel> awardMeritPoints(Map<String, dynamic> data) async {
    try {
      final response = await apiClient.dio.post('/houses/merits', data: data);
      return StudentMeritRecordModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to award merit points: $e');
    }
  }
}
