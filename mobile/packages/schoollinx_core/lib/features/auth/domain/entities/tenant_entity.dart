import 'package:equatable/equatable.dart';

class TenantEntity extends Equatable {
  final String id;
  final String name;
  final String? code;
  final String? domain;
  final String? logoUrl;
  final String? address;
  final String? phone;
  final String? email;
  final String status;

  const TenantEntity({
    required this.id,
    required this.name,
    this.code,
    this.domain,
    this.logoUrl,
    this.address,
    this.phone,
    this.email,
    this.status = 'active',
  });

  @override
  List<Object?> get props => [id, name, code, domain, logoUrl, status];
}
