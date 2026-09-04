import 'package:dio/dio.dart';
import 'api_endpoints.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/tenant_interceptor.dart';
import '../errors/exceptions.dart';

class ApiClient {
  final Dio _dio;

  ApiClient({
    required AuthInterceptor authInterceptor,
    required TenantInterceptor tenantInterceptor,
    String? baseUrl,
  }) : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? ApiEndpoints.defaultBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            followRedirects: true,
            maxRedirects: 5,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.addAll([
      tenantInterceptor,
      authInterceptor,
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        requestHeader: true,
        responseHeader: false,
      ),
    ]);
  }

  Dio get dio => _dio;

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }

  Never handleDioError(DioException error) {
    final response = error.response;
    final statusCode = response?.statusCode;

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError) {
      throw const NetworkException(message: 'Unable to connect to server. Check your internet connection.');
    }

    if (response != null) {
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        final errorMessage = data['message']?.toString() ??
            data['error']?.toString() ??
            'An unexpected server error occurred ($statusCode)';
        if (statusCode == 401) {
          throw AuthException(message: errorMessage, statusCode: statusCode);
        }
        throw ServerException(message: errorMessage, statusCode: statusCode);
      } else if (response.data is String) {
        final text = response.data.toString();
        if (text.contains('<html') || text.contains('<head')) {
          throw ServerException(
            message: 'Server responded with status $statusCode ($statusCode)',
            statusCode: statusCode,
          );
        }
      }
    }

    throw ServerException(
      message: error.message ?? 'Unknown network or server error occurred',
      statusCode: statusCode,
    );
  }
}
