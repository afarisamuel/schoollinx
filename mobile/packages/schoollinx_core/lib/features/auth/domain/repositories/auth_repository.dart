import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/tenant_entity.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  });

  Future<Either<Failure, void>> logout();

  Future<Either<Failure, UserEntity?>> getCurrentUser();

  Future<Either<Failure, TenantEntity>> resolveTenant({
    String? code,
    String? domain,
  });

  Future<Either<Failure, TenantEntity?>> getSelectedTenant();

  Future<Either<Failure, void>> selectTenant(TenantEntity tenant);

  Future<Either<Failure, void>> clearSelectedTenant();

  Future<Either<Failure, List<TenantEntity>>> searchTenants(String query);
}
