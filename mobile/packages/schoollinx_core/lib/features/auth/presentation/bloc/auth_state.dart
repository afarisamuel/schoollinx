import 'package:equatable/equatable.dart';
import '../../domain/entities/tenant_entity.dart';
import '../../domain/entities/user_entity.dart';

enum AuthStatus {
  initial,
  loading,
  tenantRequired,
  tenantSelected,
  authenticated,
  unauthenticated,
  error;
}

class AuthState extends Equatable {
  final AuthStatus status;
  final UserEntity? user;
  final TenantEntity? tenant;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.tenant,
    this.errorMessage,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;
  bool get hasTenant => tenant != null;
  UserRole? get role => user?.role;

  AuthState copyWith({
    AuthStatus? status,
    UserEntity? user,
    TenantEntity? tenant,
    String? errorMessage,
    bool clearUser = false,
    bool clearTenant = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      tenant: clearTenant ? null : (tenant ?? this.tenant),
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, user, tenant, errorMessage];
}
