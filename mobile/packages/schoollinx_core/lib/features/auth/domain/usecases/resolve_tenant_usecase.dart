import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/tenant_entity.dart';
import '../repositories/auth_repository.dart';

class ResolveTenantUseCase implements UseCase<TenantEntity, ResolveTenantParams> {
  final AuthRepository repository;

  ResolveTenantUseCase(this.repository);

  @override
  Future<Either<Failure, TenantEntity>> call(ResolveTenantParams params) async {
    return await repository.resolveTenant(
      code: params.code,
      domain: params.domain,
    );
  }
}

class ResolveTenantParams extends Equatable {
  final String? code;
  final String? domain;

  const ResolveTenantParams({this.code, this.domain});

  @override
  List<Object?> get props => [code, domain];
}
