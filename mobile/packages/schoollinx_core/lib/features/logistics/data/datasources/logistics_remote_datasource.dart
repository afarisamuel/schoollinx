import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/bus_route_entity.dart';

class LogisticsRemoteDataSource {
  final ApiClient apiClient;

  LogisticsRemoteDataSource({required this.apiClient});

  Future<List<BusRouteEntity>> getRoutes() async {
    try {
      final response = await apiClient.dio.get('/logistics/routes');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          List<String> stopsList = [];
          if (m['stops'] is List) {
            stopsList = (m['stops'] as List).map((s) => s.toString()).toList();
          }
          return BusRouteEntity(
            id: m['id']?.toString() ?? '',
            name: m['name']?.toString() ?? '',
            vehiclePlate: m['vehicle_plate']?.toString() ?? '',
            driverName: m['driver_name']?.toString() ?? '',
            driverPhone: m['driver_phone']?.toString() ?? '',
            stops: stopsList,
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch bus routes: $e');
    }
  }

  Future<BusLocationEntity> getRouteLocation(String routeId) async {
    try {
      final response = await apiClient.dio.get('/logistics/routes/$routeId/location');
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      return BusLocationEntity(
        routeId: routeId,
        latitude: (m['latitude'] as num?)?.toDouble() ?? 5.6037,
        longitude: (m['longitude'] as num?)?.toDouble() ?? -0.1870,
        speed: (m['speed'] as num?)?.toDouble() ?? 32.5,
        status: m['status']?.toString() ?? 'IN_TRANSIT',
        recordedAt: m['recorded_at'] != null
            ? DateTime.tryParse(m['recorded_at'].toString()) ?? DateTime.now()
            : DateTime.now(),
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch bus live location: $e');
    }
  }

  Future<GatePassEntity> getGatePass(String childId) async {
    try {
      final response = await apiClient.dio.get('/logistics/gatepass/$childId');
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      return GatePassEntity(
        childId: childId,
        childName: m['child_name']?.toString() ?? 'Student',
        otp: m['otp']?.toString() ?? '894210',
        validUntil: m['valid_until'] != null
            ? DateTime.tryParse(m['valid_until'].toString()) ?? DateTime.now().add(const Duration(minutes: 30))
            : DateTime.now().add(const Duration(minutes: 30)),
        status: m['status']?.toString() ?? 'ACTIVE',
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to generate gate pass: $e');
    }
  }

  Future<FleetSummaryEntity> getFleetSummary() async {
    try {
      final response = await apiClient.dio.get('/logistics/fleet/summary');
      final m = response.data is Map<String, dynamic> ? response.data : <String, dynamic>{};
      return FleetSummaryEntity(
        totalVehicles: (m['total_vehicles'] as num?)?.toInt() ?? 12,
        activeOnRoute: (m['active_on_route'] as num?)?.toInt() ?? 8,
        inMaintenance: (m['in_maintenance'] as num?)?.toInt() ?? 1,
        averagePunctuality: (m['average_punctuality'] as num?)?.toDouble() ?? 96.4,
      );
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch fleet summary: $e');
    }
  }
}
