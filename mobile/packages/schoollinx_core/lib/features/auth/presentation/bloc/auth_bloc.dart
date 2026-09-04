import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/resolve_tenant_usecase.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase loginUseCase;
  final LogoutUseCase logoutUseCase;
  final GetCurrentUserUseCase getCurrentUserUseCase;
  final ResolveTenantUseCase resolveTenantUseCase;
  final AuthRepository authRepository;

  AuthBloc({
    required this.loginUseCase,
    required this.logoutUseCase,
    required this.getCurrentUserUseCase,
    required this.resolveTenantUseCase,
    required this.authRepository,
  }) : super(const AuthState()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<LoginSubmittedEvent>(_onLoginSubmitted);
    on<LogoutRequestedEvent>(_onLogoutRequested);
    on<ResolveTenantEvent>(_onResolveTenant);
    on<TenantSelectedEvent>(_onTenantSelected);
    on<ChangeTenantEvent>(_onChangeTenant);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));

    // First check tenant
    final tenantResult = await authRepository.getSelectedTenant();
    final tenant = tenantResult.fold((_) => null, (t) => t);

    if (tenant == null) {
      emit(state.copyWith(
        status: AuthStatus.tenantRequired,
        clearUser: true,
        clearTenant: true,
      ));
      return;
    }

    // Now check authenticated user
    final userResult = await getCurrentUserUseCase(const NoParams());
    userResult.fold(
      (failure) {
        emit(state.copyWith(
          status: AuthStatus.unauthenticated,
          tenant: tenant,
          clearUser: true,
        ));
      },
      (user) {
        if (user != null) {
          emit(state.copyWith(
            status: AuthStatus.authenticated,
            user: user,
            tenant: tenant,
          ));
        } else {
          emit(state.copyWith(
            status: AuthStatus.unauthenticated,
            tenant: tenant,
            clearUser: true,
          ));
        }
      },
    );
  }

  Future<void> _onLoginSubmitted(
    LoginSubmittedEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));

    final result = await loginUseCase(
      LoginParams(email: event.email, password: event.password),
    );

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AuthStatus.error,
          errorMessage: failure.message,
        ));
      },
      (user) {
        emit(state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
          errorMessage: null,
        ));
      },
    );
  }

  Future<void> _onLogoutRequested(
    LogoutRequestedEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));
    await logoutUseCase(const NoParams());
    emit(state.copyWith(
      status: AuthStatus.unauthenticated,
      clearUser: true,
    ));
  }

  Future<void> _onResolveTenant(
    ResolveTenantEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));

    final result = await resolveTenantUseCase(
      ResolveTenantParams(code: event.code, domain: event.domain),
    );

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AuthStatus.error,
          errorMessage: failure.message,
        ));
      },
      (tenant) {
        emit(state.copyWith(
          status: AuthStatus.unauthenticated,
          tenant: tenant,
          errorMessage: null,
        ));
      },
    );
  }

  Future<void> _onTenantSelected(
    TenantSelectedEvent event,
    Emitter<AuthState> emit,
  ) async {
    await authRepository.selectTenant(event.tenant);
    emit(state.copyWith(
      tenant: event.tenant,
      status: AuthStatus.unauthenticated,
    ));
  }

  Future<void> _onChangeTenant(
    ChangeTenantEvent event,
    Emitter<AuthState> emit,
  ) async {
    await authRepository.clearSelectedTenant();
    await authRepository.logout();
    emit(const AuthState(status: AuthStatus.tenantRequired));
  }
}
