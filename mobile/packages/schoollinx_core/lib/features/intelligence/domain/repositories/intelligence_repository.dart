import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/institutional_kpi_entity.dart';

abstract class IntelligenceRepository {
  Future<Either<Failure, InstitutionalKpiEntity>> getInstitutionalKpis();
}
