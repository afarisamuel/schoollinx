import 'package:dio/dio.dart';
import '../../../features/auth/data/datasources/auth_local_datasource.dart';

class TenantInterceptor extends Interceptor {
  final AuthLocalDataSource localDataSource;

  TenantInterceptor({required this.localDataSource});

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    try {
      final tenant = await localDataSource.getSelectedTenant();
      if (tenant != null) {
        // Set X-Tenant-Subdomain header
        if (tenant.domain != null && tenant.domain!.isNotEmpty) {
          options.headers['X-Tenant-Subdomain'] = tenant.domain;
        } else if (tenant.code != null && tenant.code!.isNotEmpty) {
          options.headers['X-Tenant-Subdomain'] = tenant.code!.toLowerCase();
        } else if (tenant.name.isNotEmpty) {
          options.headers['X-Tenant-Subdomain'] = tenant.name.toLowerCase().replaceAll(' ', '');
        }

        // Set X-Tenant-ID header if available
        if (tenant.id.isNotEmpty && !tenant.id.startsWith('temp_')) {
          options.headers['X-Tenant-ID'] = tenant.id;
        }
      }
    } catch (_) {}
    return handler.next(options);
  }
}
