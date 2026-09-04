import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/tenant_model.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<({UserModel user, String accessToken, String? refreshToken})> login({
    required String email,
    required String password,
  });

  Future<void> logout();

  Future<UserModel> getMe();

  Future<TenantModel> resolveTenantByCode(String code);

  Future<TenantModel> resolveTenantByDomain(String domain);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient apiClient;

  AuthRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<({UserModel user, String accessToken, String? refreshToken})> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.login,
        data: {
          'identifier': email,
          'password': password,
        },
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final userData = data['user'] ?? data['data']?['user'] ?? data;
        final token = data['token']?.toString() ?? data['access_token']?.toString() ?? '';
        final refreshToken = data['refresh_token']?.toString();

        return (
          user: UserModel.fromJson(userData is Map<String, dynamic> ? userData : {}),
          accessToken: token,
          refreshToken: refreshToken,
        );
      }
      throw const ServerException(message: 'Invalid response format from server');
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    }
  }

  @override
  Future<void> logout() async {
    try {
      await apiClient.dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore network errors during logout
    }
  }

  @override
  Future<UserModel> getMe() async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.me);
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final userData = data['user'] ?? data['data'] ?? data;
        return UserModel.fromJson(userData is Map<String, dynamic> ? userData : {});
      }
      throw const ServerException(message: 'Invalid user response');
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    }
  }

  @override
  Future<TenantModel> resolveTenantByCode(String code) async {
    final cleanCode = code.trim().toLowerCase();
    try {
      // Query public tenant info using X-Tenant-Subdomain header
      final response = await apiClient.dio.get(
        '/public/tenant-info',
        options: Options(headers: {'X-Tenant-Subdomain': cleanCode}),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final name = data['name']?.toString() ?? code.toUpperCase();
        final subdomain = data['subdomain']?.toString() ?? cleanCode;
        final logoUrl = data['logo_url']?.toString();

        return TenantModel(
          id: subdomain,
          name: name,
          code: code.toUpperCase(),
          domain: subdomain,
          logoUrl: logoUrl,
          status: 'active',
        );
      }

      return TenantModel(
        id: cleanCode,
        name: code.toUpperCase(),
        code: code.toUpperCase(),
        domain: cleanCode,
        status: 'active',
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw TenantNotFoundException(message: 'Institution not found for code "$code"');
      }
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to verify school code: $e');
    }
  }

  @override
  Future<TenantModel> resolveTenantByDomain(String domain) async {
    return resolveTenantByCode(domain);
  }
}
