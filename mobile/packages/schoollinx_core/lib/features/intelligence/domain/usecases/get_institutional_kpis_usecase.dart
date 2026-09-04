import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/institutional_kpi_entity.dart';
import '../repositories/intelligence_repository.dart';

class GetInstitutionalKpisUseCase implements UseCase<InstitutionalKpiEntity, NoParams> {
  final IntelligenceRepository repository;

  GetInstitutionalKpisUseCase(this.repository);

  @override
  Future<Either<Failure, InstitutionalKpiEntity>> call(NoParams params) async {
    return await repository.getInstitutionalKpis();
  }
}
