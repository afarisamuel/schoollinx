import 'package:equatable/equatable.dart';

enum UserRole {
  superadmin,
  admin,
  teacher,
  parent,
  student;

  static UserRole fromString(String? role) {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return UserRole.superadmin;
      case 'admin':
        return UserRole.admin;
      case 'teacher':
        return UserRole.teacher;
      case 'parent':
        return UserRole.parent;
      case 'student':
        return UserRole.student;
      default:
        return UserRole.student;
    }
  }

  String get displayName {
    switch (this) {
      case UserRole.superadmin:
        return 'Super Admin';
      case UserRole.admin:
        return 'Administrator';
      case UserRole.teacher:
        return 'Teacher';
      case UserRole.parent:
        return 'Parent / Guardian';
      case UserRole.student:
        return 'Student';
    }
  }
}

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? avatarUrl;
  final UserRole role;
  final String? tenantId;
  final Map<String, dynamic>? metadata;

  const UserEntity({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.avatarUrl,
    required this.role,
    this.tenantId,
    this.metadata,
  });

  String get fullName => '$firstName $lastName'.trim();
  String get initials {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return (first + last).isNotEmpty ? '$first$last' : 'U';
  }

  @override
  List<Object?> get props => [id, email, firstName, lastName, phone, avatarUrl, role, tenantId];
}
