import 'package:equatable/equatable.dart';

class TeacherEntity extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phoneNumber;
  final List<String> subjects;
  final String? role;

  const TeacherEntity({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phoneNumber,
    this.subjects = const [],
    this.role,
  });

  String get fullName => '$firstName $lastName'.trim();

  @override
  List<Object?> get props => [id, firstName, lastName, email, phoneNumber, subjects, role];
}
