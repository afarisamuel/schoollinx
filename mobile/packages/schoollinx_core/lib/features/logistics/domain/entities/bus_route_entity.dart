import 'package:equatable/equatable.dart';

class BusRouteEntity extends Equatable {
  final String id;
  final String name;
  final String vehiclePlate;
  final String driverName;
  final String driverPhone;
  final List<String> stops;

  const BusRouteEntity({
    required this.id,
    required this.name,
    required this.vehiclePlate,
    required this.driverName,
    required this.driverPhone,
    required this.stops,
  });

  @override
  List<Object?> get props => [id, name, vehiclePlate, driverName, driverPhone, stops];
}

class BusLocationEntity extends Equatable {
  final String routeId;
  final double latitude;
  final double longitude;
  final double speed;
  final String status;
  final DateTime recordedAt;

  const BusLocationEntity({
    required this.routeId,
    required this.latitude,
    required this.longitude,
    required this.speed,
    required this.status,
    required this.recordedAt,
  });

  @override
  List<Object?> get props => [routeId, latitude, longitude, speed, status, recordedAt];
}

class GatePassEntity extends Equatable {
  final String childId;
  final String childName;
  final String otp;
  final DateTime validUntil;
  final String status;

  const GatePassEntity({
    required this.childId,
    required this.childName,
    required this.otp,
    required this.validUntil,
    required this.status,
  });

  @override
  List<Object?> get props => [childId, childName, otp, validUntil, status];
}

class FleetSummaryEntity extends Equatable {
  final int totalVehicles;
  final int activeOnRoute;
  final int inMaintenance;
  final double averagePunctuality;

  const FleetSummaryEntity({
    required this.totalVehicles,
    required this.activeOnRoute,
    required this.inMaintenance,
    required this.averagePunctuality,
  });

  @override
  List<Object?> get props => [totalVehicles, activeOnRoute, inMaintenance, averagePunctuality];
}
