import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/tenant_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/tenant_model.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  }) async {
    try {
      final result = await remoteDataSource.login(email: email, password: password);
      
      // Save session locally
      await localDataSource.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      await localDataSource.saveUser(result.user);

      return Right(_toUserEntity(result.user));
    } on AuthException catch (e) {
      return Left(AuthFailure(message: e.message, statusCode: e.statusCode));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } catch (e) {
      return Left(ServerFailure(message: 'Unexpected error during login: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await remoteDataSource.logout();
    } catch (_) {}
    try {
      await localDataSource.clearTokens();
      await localDataSource.clearUser();
      return const Right(null);
    } on CacheException catch (e) {
      return Left(CacheFailure(message: e.message));
    }
  }

  @override
  Future<Either<Failure, UserEntity?>> getCurrentUser() async {
    try {
      // Check cached user first
      final cachedUser = await localDataSource.getCachedUser();
      if (cachedUser != null) {
        return Right(_toUserEntity(cachedUser));
      }

      // If token exists, fetch fresh profile from remote
      final token = await localDataSource.getAccessToken();
      if (token != null && token.isNotEmpty) {
        final remoteUser = await remoteDataSource.getMe();
        await localDataSource.saveUser(remoteUser);
        return Right(_toUserEntity(remoteUser));
      }

      return const Right(null);
    } on AuthException catch (e) {
      await localDataSource.clearTokens();
      await localDataSource.clearUser();
      return Left(AuthFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, TenantEntity>> resolveTenant({
    String? code,
    String? domain,
  }) async {
    try {
      TenantModel model;
      if (code != null && code.isNotEmpty) {
        model = await remoteDataSource.resolveTenantByCode(code);
      } else if (domain != null && domain.isNotEmpty) {
        model = await remoteDataSource.resolveTenantByDomain(domain);
      } else {
        return const Left(TenantNotFoundFailure(message: 'School code or domain is required'));
      }

      await localDataSource.saveSelectedTenant(model);
      return Right(_toTenantEntity(model));
    } on TenantNotFoundException catch (e) {
      return Left(TenantNotFoundFailure(message: e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: 'Failed to resolve institution: $e'));
    }
  }

  @override
  Future<Either<Failure, TenantEntity?>> getSelectedTenant() async {
    try {
      final model = await localDataSource.getSelectedTenant();
      if (model != null) {
        return Right(_toTenantEntity(model));
      }
      return const Right(null);
    } catch (e) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> selectTenant(TenantEntity tenant) async {
    try {
      final model = TenantModel(
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        status: tenant.status,
      );
      await localDataSource.saveSelectedTenant(model);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(message: 'Failed to save selected tenant: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> clearSelectedTenant() async {
    try {
      await localDataSource.clearSelectedTenant();
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(message: 'Failed to clear tenant: $e'));
    }
  }

  UserEntity _toUserEntity(UserModel model) {
    return UserEntity(
      id: model.id,
      email: model.email,
      firstName: model.firstName,
      lastName: model.lastName,
      phone: model.phone,
      avatarUrl: model.avatarUrl,
      role: model.role,
      tenantId: model.tenantId,
      metadata: model.metadata,
    );
  }

  TenantEntity _toTenantEntity(TenantModel model) {
    return TenantEntity(
      id: model.id,
      name: model.name,
      code: model.code,
      domain: model.domain,
      logoUrl: model.logoUrl,
      address: model.address,
      phone: model.phone,
      email: model.email,
      status: model.status,
    );
  }
}
