import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/bus_route_entity.dart';

abstract class LogisticsRepository {
  Future<Either<Failure, List<BusRouteEntity>>> getRoutes();
  Future<Either<Failure, BusLocationEntity>> getRouteLocation(String routeId);
  Future<Either<Failure, GatePassEntity>> getGatePass(String childId);
  Future<Either<Failure, FleetSummaryEntity>> getFleetSummary();
}
