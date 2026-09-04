import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/bus_route_entity.dart';
import '../repositories/logistics_repository.dart';

class GetBusRoutesUseCase implements UseCase<List<BusRouteEntity>, NoParams> {
  final LogisticsRepository repository;
  GetBusRoutesUseCase(this.repository);
  @override
  Future<Either<Failure, List<BusRouteEntity>>> call(NoParams params) {
    return repository.getRoutes();
  }
}

class GetRouteLocationUseCase implements UseCase<BusLocationEntity, String> {
  final LogisticsRepository repository;
  GetRouteLocationUseCase(this.repository);
  @override
  Future<Either<Failure, BusLocationEntity>> call(String routeId) {
    return repository.getRouteLocation(routeId);
  }
}

class GetGatePassUseCase implements UseCase<GatePassEntity, String> {
  final LogisticsRepository repository;
  GetGatePassUseCase(this.repository);
  @override
  Future<Either<Failure, GatePassEntity>> call(String childId) {
    return repository.getGatePass(childId);
  }
}

class GetFleetSummaryUseCase implements UseCase<FleetSummaryEntity, NoParams> {
  final LogisticsRepository repository;
  GetFleetSummaryUseCase(this.repository);
  @override
  Future<Either<Failure, FleetSummaryEntity>> call(NoParams params) {
    return repository.getFleetSummary();
  }
}
