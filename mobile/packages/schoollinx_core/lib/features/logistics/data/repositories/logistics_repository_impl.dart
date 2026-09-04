import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/bus_route_entity.dart';
import '../../domain/repositories/logistics_repository.dart';
import '../datasources/logistics_remote_datasource.dart';

class LogisticsRepositoryImpl implements LogisticsRepository {
  final LogisticsRemoteDataSource remoteDataSource;

  LogisticsRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<BusRouteEntity>>> getRoutes() async {
    try {
      final routes = await remoteDataSource.getRoutes();
      return Right(routes);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, BusLocationEntity>> getRouteLocation(String routeId) async {
    try {
      final loc = await remoteDataSource.getRouteLocation(routeId);
      return Right(loc);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, GatePassEntity>> getGatePass(String childId) async {
    try {
      final pass = await remoteDataSource.getGatePass(childId);
      return Right(pass);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, FleetSummaryEntity>> getFleetSummary() async {
    try {
      final summary = await remoteDataSource.getFleetSummary();
      return Right(summary);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
