import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/tenant_entity.dart';
import '../repositories/auth_repository.dart';

class SearchTenantsUseCase implements UseCase<List<TenantEntity>, String> {
  final AuthRepository repository;

  SearchTenantsUseCase(this.repository);

  @override
  Future<Either<Failure, List<TenantEntity>>> call(String query) async {
    return await repository.searchTenants(query);
  }
}
