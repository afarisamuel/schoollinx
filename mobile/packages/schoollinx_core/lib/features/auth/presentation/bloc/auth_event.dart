import 'package:equatable/equatable.dart';
import '../../domain/entities/tenant_entity.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class CheckAuthStatusEvent extends AuthEvent {
  const CheckAuthStatusEvent();
}

class LoginSubmittedEvent extends AuthEvent {
  final String email;
  final String password;

  const LoginSubmittedEvent({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class LogoutRequestedEvent extends AuthEvent {
  const LogoutRequestedEvent();
}

class ResolveTenantEvent extends AuthEvent {
  final String? code;
  final String? domain;

  const ResolveTenantEvent({this.code, this.domain});

  @override
  List<Object?> get props => [code, domain];
}

class TenantSelectedEvent extends AuthEvent {
  final TenantEntity tenant;

  const TenantSelectedEvent(this.tenant);

  @override
  List<Object?> get props => [tenant];
}

class ChangeTenantEvent extends AuthEvent {
  const ChangeTenantEvent();
}
