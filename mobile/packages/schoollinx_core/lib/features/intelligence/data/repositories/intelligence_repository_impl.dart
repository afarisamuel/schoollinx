import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/institutional_kpi_entity.dart';
import '../../domain/repositories/intelligence_repository.dart';
import '../datasources/intelligence_remote_datasource.dart';

class IntelligenceRepositoryImpl implements IntelligenceRepository {
  final IntelligenceRemoteDataSource remoteDataSource;

  IntelligenceRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, InstitutionalKpiEntity>> getInstitutionalKpis() async {
    try {
      final kpis = await remoteDataSource.getInstitutionalKpis();
      return Right(kpis);
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
